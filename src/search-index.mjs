// Word-character runs, mirroring JavaScript \b semantics (ASCII word chars plus
// underscore). Splitting on hyphens and CJK characters keeps the token map
// consistent with the \b-based whole-word regex used for exact matching, so
// candidate narrowing never drops a block that the regex would accept.
const WORD_TOKEN_REGEX = /[A-Za-z0-9_]+/g;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsChinese = (value) => /[\u4e00-\u9fa5]/.test(value);

const isCompleteWord = (keyword) => {
  if (!keyword) {
    return false;
  }
  if (containsChinese(keyword)) {
    return keyword.length === 1;
  }
  return /^[\w-]+$/u.test(keyword);
};

const normalizeForIndex = (text) => (text || "").toLowerCase();

const tokenize = (text) => {
  const matches = text.match(WORD_TOKEN_REGEX);
  return matches ? matches : [];
};

const getGrams = (text, size = 2) => {
  if (!text || text.length < size) {
    return text ? [text] : [];
  }

  const grams = [];
  for (let index = 0; index <= text.length - size; index += 1) {
    grams.push(text.slice(index, index + size));
  }
  return grams;
};

const addToSetMap = (map, key, value) => {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key).add(value);
};

const intersectSets = (sets, fallbackSet) => {
  const nonEmptySets = sets.filter(Boolean);
  if (nonEmptySets.length === 0) {
    return new Set(fallbackSet);
  }

  const [first, ...rest] = [...nonEmptySets].sort((left, right) => left.size - right.size);
  const result = new Set(first);
  for (const value of result) {
    if (rest.some((set) => !set.has(value))) {
      result.delete(value);
    }
  }
  return result;
};

const unionSets = (sets, fallbackSet) => {
  const nonEmptySets = sets.filter(Boolean);
  if (nonEmptySets.length === 0) {
    return new Set(fallbackSet);
  }

  const result = new Set();
  for (const set of nonEmptySets) {
    for (const value of set) {
      result.add(value);
    }
  }
  return result;
};

const compileMatcher = (keyword, caseSensitive, matchWholeWord) => {
  const normalizedKeyword = caseSensitive ? keyword : keyword.toLowerCase();
  // The index is built from lowercased text, so candidate lookups must always
  // use a lowercased keyword even in case-sensitive mode (the case-sensitive
  // regex still enforces the exact casing during exact matching).
  const lookupKeyword = keyword.toLowerCase();
  const wholeWord = matchWholeWord && isCompleteWord(keyword) && !containsChinese(keyword);
  const pattern = wholeWord
    ? new RegExp(`\\b${escapeRegExp(keyword)}\\b`, caseSensitive ? "u" : "iu")
    : null;

  return {
    keyword,
    normalizedKeyword,
    lookupKeyword,
    wholeWord,
    exactMatch(text, normalizedText) {
      if (!keyword) {
        return true;
      }

      if (pattern) {
        return pattern.test(text);
      }

      const haystack = caseSensitive ? text : normalizedText;
      return haystack.includes(normalizedKeyword);
    },
  };
};

const getCandidateSetForMatcher = (index, matcher) => {
  if (!matcher.keyword) {
    return null;
  }

  if (matcher.wholeWord) {
    const tokens = tokenize(matcher.lookupKeyword);
    if (tokens.length === 0) {
      return null;
    }
    if (tokens.length === 1) {
      return index.tokenMap.get(tokens[0]) || new Set();
    }
    // A whole-word keyword containing hyphens (e.g. "long-term") maps to
    // several word tokens; intersect their posting sets for a safe superset of
    // candidates. The \b regex in exactMatch still enforces adjacency.
    const tokenSets = tokens.map((token) => index.tokenMap.get(token));
    return intersectSets(tokenSets, index.allIds);
  }

  if (matcher.lookupKeyword.length >= 2) {
    const grams = getGrams(matcher.lookupKeyword, 2);
    const gramSets = grams.map((gram) => index.gramMap.get(gram));
    return intersectSets(gramSets, index.entriesById.keys());
  }

  return null;
};

const intersectsAny = (targetSet, values) => values.some((value) => targetSet.has(value));

const buildAllRefSet = (entry) => new Set([...(entry.refIds || []), ...(entry.parentRefIds || [])]);

const normalizeEntry = (rawEntry) => ({
  ...rawEntry,
  normalizedText: rawEntry.normalizedText || normalizeForIndex(rawEntry.text),
  refIds: rawEntry.refIds || [],
  parentRefIds: rawEntry.parentRefIds || [],
  allRefIds: buildAllRefSet(rawEntry),
});

const addEntryToIndex = (index, rawEntry) => {
  const entry = normalizeEntry(rawEntry);

  index.entriesById.set(entry.id, entry);
  index.allIds.add(entry.id);
  addToSetMap(index.byPage, entry.page, entry.id);

  for (const refId of entry.allRefIds) {
    addToSetMap(index.byRef, refId, entry.id);
  }

  for (const token of tokenize(entry.normalizedText)) {
    addToSetMap(index.tokenMap, token, entry.id);
  }

  for (const gram of getGrams(entry.normalizedText, 2)) {
    addToSetMap(index.gramMap, gram, entry.id);
  }
};

const removeFromSetMap = (map, key, value) => {
  const set = map.get(key);
  if (!set) {
    return;
  }
  set.delete(value);
  if (set.size === 0) {
    map.delete(key);
  }
};

const removeEntryFromIndex = (index, id) => {
  const entry = index.entriesById.get(id);
  if (!entry) {
    return;
  }

  removeFromSetMap(index.byPage, entry.page, id);
  for (const refId of entry.allRefIds) {
    removeFromSetMap(index.byRef, refId, id);
  }
  for (const token of tokenize(entry.normalizedText)) {
    removeFromSetMap(index.tokenMap, token, id);
  }
  for (const gram of getGrams(entry.normalizedText, 2)) {
    removeFromSetMap(index.gramMap, gram, id);
  }

  index.entriesById.delete(id);
  index.allIds.delete(id);
};

export function createSearchIndex(entries) {
  const index = {
    entriesById: new Map(),
    byPage: new Map(),
    byRef: new Map(),
    tokenMap: new Map(),
    gramMap: new Map(),
    allIds: new Set(),
  };

  for (const rawEntry of entries) {
    addEntryToIndex(index, rawEntry);
  }

  return index;
}

/**
 * Incrementally reconcile an existing index: drop removed ids and upsert the
 * provided entries in place, without rebuilding the whole token/bigram maps.
 * An upserted id is removed first using its previous page/tokens/refs, so edits
 * that change text, page or tags are handled correctly.
 */
export function updateSearchIndex(index, entries = [], removedIds = []) {
  for (const id of removedIds) {
    removeEntryFromIndex(index, id);
  }

  for (const rawEntry of entries) {
    removeEntryFromIndex(index, rawEntry.id);
    addEntryToIndex(index, rawEntry);
  }

  return index;
}

const applySharedFilters = (entry, options) => {
  if (options.includePages?.length && !options.includePages.includes(entry.page)) {
    return false;
  }

  if (options.excludePages?.length && options.excludePages.includes(entry.page)) {
    return false;
  }

  if (options.excludeTags?.length && intersectsAny(entry.allRefIds, options.excludeTags)) {
    return false;
  }

  return true;
};

const applyDirectFilters = (entry, options) => {
  if (!applySharedFilters(entry, options)) {
    return false;
  }

  if (!options.includeTags?.length) {
    return true;
  }

  const directRefSet = new Set(entry.refIds || []);
  return intersectsAny(entry.isPage ? entry.allRefIds : directRefSet, options.includeTags);
};

const applyRelatedFilters = (entry, options) => {
  if (!applySharedFilters(entry, options)) {
    return false;
  }

  if (options.includeTags?.length && !intersectsAny(entry.allRefIds, options.includeTags)) {
    return false;
  }

  return true;
};

export function querySearchIndex(index, options) {
  const keywords = (options.keywords || []).filter(Boolean);
  const matchers = keywords.map((keyword) =>
    compileMatcher(keyword, !!options.caseSensitive, !!options.matchWholeWord),
  );
  const candidateSets = matchers
    .map((matcher) => getCandidateSetForMatcher(index, matcher))
    .filter(Boolean);
  const directCandidateIds = [...intersectSets(candidateSets, index.allIds)];
  const candidateIds = [...unionSets(candidateSets, index.allIds)];
  const directCandidateIdSet = new Set(directCandidateIds);

  if (keywords.length === 0) {
    candidateIds.splice(0, candidateIds.length, ...index.allIds);
  }

  const directPageIds = [];
  const directBlockIds = [];
  const relatedPageIds = [];
  const partialByPage = new Map();
  const keywordHitsByPage = new Map();

  for (const id of candidateIds) {
    const entry = index.entriesById.get(id);
    if (!entry || !applySharedFilters(entry, options)) {
      continue;
    }

    if (keywords.length === 0) {
      if (applyDirectFilters(entry, options)) {
        if (entry.isPage) {
          directPageIds.push(id);
        } else {
          directBlockIds.push(id);
        }
      } else if (!entry.isPage && applyRelatedFilters(entry, options)) {
        if (!partialByPage.has(entry.page)) {
          partialByPage.set(entry.page, new Set());
          keywordHitsByPage.set(entry.page, new Set());
        }
        partialByPage.get(entry.page).add(id);
      }
      continue;
    }

    const matchedKeywordIndexes = [];
    let isDirectMatch = true;

    matchers.forEach((matcher, keywordIndex) => {
      const matched = matcher.exactMatch(entry.text || "", entry.normalizedText || "");
      if (matched) {
        matchedKeywordIndexes.push(keywordIndex);
      } else {
        isDirectMatch = false;
      }
    });

    if (
      directCandidateIdSet.has(id) &&
      isDirectMatch &&
      applyDirectFilters(entry, options)
    ) {
      if (entry.isPage) {
        directPageIds.push(id);
      } else {
        directBlockIds.push(id);
      }
      continue;
    }

    if (matchedKeywordIndexes.length === 0) {
      continue;
    }

    if (!applyRelatedFilters(entry, options)) {
      continue;
    }

    if (!partialByPage.has(entry.page)) {
      partialByPage.set(entry.page, new Set());
      keywordHitsByPage.set(entry.page, new Set());
    }

    partialByPage.get(entry.page).add(id);
    for (const keywordIndex of matchedKeywordIndexes) {
      keywordHitsByPage.get(entry.page).add(keywordIndex);
    }
  }

  for (const [page, hitIndexes] of keywordHitsByPage.entries()) {
    if (hitIndexes.size === keywords.length) {
      relatedPageIds.push(page);
    }
  }

  return {
    candidateIds,
    directCandidateIds,
    directPageIds,
    directBlockIds,
    relatedPageIds,
    partialByPage,
  };
}

export function normalizeSearchText(text) {
  return normalizeForIndex(text);
}
