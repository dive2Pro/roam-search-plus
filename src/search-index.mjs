const WORD_TOKEN_REGEX = /[\p{L}\p{N}_-]+/gu;

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
  const wholeWord = matchWholeWord && isCompleteWord(keyword) && !containsChinese(keyword);
  const pattern = wholeWord
    ? new RegExp(`\\b${escapeRegExp(keyword)}\\b`, caseSensitive ? "u" : "iu")
    : null;

  return {
    keyword,
    normalizedKeyword,
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
    return index.tokenMap.get(matcher.normalizedKeyword) || new Set();
  }

  if (matcher.normalizedKeyword.length >= 2) {
    const grams = getGrams(matcher.normalizedKeyword, 2);
    const gramSets = grams.map((gram) => index.gramMap.get(gram));
    return intersectSets(gramSets, index.entriesById.keys());
  }

  return null;
};

const intersectsAny = (targetSet, values) => values.some((value) => targetSet.has(value));

const buildAllRefSet = (entry) => new Set([...(entry.refIds || []), ...(entry.parentRefIds || [])]);

export function createSearchIndex(entries) {
  const entriesById = new Map();
  const byPage = new Map();
  const byRef = new Map();
  const tokenMap = new Map();
  const gramMap = new Map();
  const allIds = new Set();

  for (const rawEntry of entries) {
    const normalizedText = rawEntry.normalizedText || normalizeForIndex(rawEntry.text);
    const entry = {
      ...rawEntry,
      normalizedText,
      refIds: rawEntry.refIds || [],
      parentRefIds: rawEntry.parentRefIds || [],
      allRefIds: buildAllRefSet(rawEntry),
    };

    entriesById.set(entry.id, entry);
    allIds.add(entry.id);
    addToSetMap(byPage, entry.page, entry.id);

    for (const refId of entry.allRefIds) {
      addToSetMap(byRef, refId, entry.id);
    }

    for (const token of tokenize(normalizedText)) {
      addToSetMap(tokenMap, token, entry.id);
    }

    for (const gram of getGrams(normalizedText, 2)) {
      addToSetMap(gramMap, gram, entry.id);
    }
  }

  return {
    entriesById,
    byPage,
    byRef,
    tokenMap,
    gramMap,
    allIds,
  };
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
