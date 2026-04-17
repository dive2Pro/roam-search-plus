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

const includesKeyword = (text, keyword, options) => {
  if (!text || !keyword) {
    return false;
  }

  const caseSensitive = !!options.caseSensitive;
  const matchWholeWord = !!options.matchWholeWord;

  if (!matchWholeWord) {
    const haystack = caseSensitive ? text : text.toLowerCase();
    const needle = caseSensitive ? keyword : keyword.toLowerCase();
    return haystack.includes(needle);
  }

  if (!isCompleteWord(keyword) || containsChinese(keyword)) {
    const haystack = caseSensitive ? text : text.toLowerCase();
    const needle = caseSensitive ? keyword : keyword.toLowerCase();
    return haystack.includes(needle);
  }

  const pattern = new RegExp(
    `\\b${escapeRegExp(keyword)}\\b`,
    caseSensitive ? "u" : "iu",
  );
  return pattern.test(text);
};

const intersects = (left, right) => {
  if (!left?.length || !right?.length) {
    return false;
  }
  const set = new Set(left);
  return right.some((value) => set.has(value));
};

const applySharedFilters = (entry, options) => {
  if (options.includePages?.length && !options.includePages.includes(entry.page)) {
    return false;
  }
  if (options.excludePages?.length && options.excludePages.includes(entry.page)) {
    return false;
  }

  const allRefIds = [...(entry.refIds || []), ...(entry.parentRefIds || [])];
  if (options.excludeTags?.length && intersects(allRefIds, options.excludeTags)) {
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

  const sourceRefs = entry.isPage
    ? [...(entry.refIds || []), ...(entry.parentRefIds || [])]
    : entry.refIds || [];

  return intersects(sourceRefs, options.includeTags);
};

const applyRelatedFilters = (entry, options) => {
  if (!applySharedFilters(entry, options)) {
    return false;
  }
  if (!options.includeTags?.length) {
    return true;
  }

  return intersects(
    [...(entry.refIds || []), ...(entry.parentRefIds || [])],
    options.includeTags,
  );
};

export function queryBaseline(entries, options) {
  const keywords = (options.keywords || []).filter(Boolean);
  const directPageIds = [];
  const directBlockIds = [];
  const relatedPageIds = [];
  const partialByPage = new Map();
  const keywordHitsByPage = new Map();

  for (const entry of entries) {
    if (!applySharedFilters(entry, options)) {
      continue;
    }

    const matchedKeywordIndexes = [];
    let isDirectMatch = keywords.length === 0;

    if (keywords.length > 0) {
      isDirectMatch = true;
      keywords.forEach((keyword, index) => {
        const matched = includesKeyword(entry.text || "", keyword, options);
        if (matched) {
          matchedKeywordIndexes.push(index);
        } else {
          isDirectMatch = false;
        }
      });
    }

    if (isDirectMatch && applyDirectFilters(entry, options)) {
      if (entry.isPage) {
        directPageIds.push(entry.id);
      } else {
        directBlockIds.push(entry.id);
      }
      continue;
    }

    if (keywords.length === 0 || matchedKeywordIndexes.length === 0) {
      continue;
    }

    if (!applyRelatedFilters(entry, options)) {
      continue;
    }

    if (!partialByPage.has(entry.page)) {
      partialByPage.set(entry.page, new Set());
      keywordHitsByPage.set(entry.page, new Set());
    }

    partialByPage.get(entry.page).add(entry.id);
    matchedKeywordIndexes.forEach((index) => keywordHitsByPage.get(entry.page).add(index));
  }

  for (const [pageUid, hitIndexes] of keywordHitsByPage.entries()) {
    if (hitIndexes.size === keywords.length) {
      relatedPageIds.push(pageUid);
    }
  }

  return {
    directPageIds,
    directBlockIds,
    relatedPageIds,
    partialByPage: Object.fromEntries(
      [...partialByPage.entries()].map(([pageUid, ids]) => [pageUid, [...ids].sort()]),
    ),
  };
}
