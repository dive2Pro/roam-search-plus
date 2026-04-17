import { pull } from "./helper";
import { CacheBlockType, getAllBlocks, getAllPages, getParentsRefsById, getSearchIndex } from "./roam";
import { ResultItem } from "./store";
import { queryResult } from "./result";
import { createSearchIndex, normalizeSearchText, querySearchIndex } from "./search-index.mjs";

class NotifyProgress {
  _percent = -1;
  callback = (p: number) => {};

  on(callback: (p: number) => void) {
    this.callback = callback;
  }

  reset() {
    this.notify(0);
  }

  notify(percent: number) {
    this._percent = percent;
    this.callback(this._percent);
  }

  finish() {
    this._percent = 100;
    this.callback(100);
  }

  started() {
    return this._percent !== -1;
  }

  isFinished() {
    return this._percent === 100;
  }
}

export const notifier = new NotifyProgress();

const toResultItem = (item: CacheBlockType): ResultItem => ({
  id: item.block[":block/uid"],
  text: item.block[":block/string"] || item.block[":node/title"],
  editTime: item.block[":edit/time"] || item.block[":create/time"],
  createTime: item.block[":create/time"],
  createUser: item.block[":create/user"]?.[":db/id"],
  isPage: !item.isBlock,
  paths: [] as string[],
  isSelected: false,
  children: [],
});

const buildEphemeralIndex = (
  pages: CacheBlockType[],
  blocks: CacheBlockType[],
) => {
  return createSearchIndex(
    [...pages, ...blocks].map((item) => ({
      id: item.block[":block/uid"],
      page: item.page,
      text: item.block[":node/title"] || item.block[":block/string"] || "",
      normalizedText: normalizeSearchText(
        item.block[":node/title"] || item.block[":block/string"] || "",
      ),
      isPage: !item.isBlock,
      refIds: item.block[":block/refs"]?.map((ref) => ref[":db/id"]) || [],
      parentRefIds: item.isBlock ? getParentsRefsById(item.block[":db/id"]) : [],
    })),
  );
};

const useCachedIndex = (
  getAllBlocksFn: typeof getAllBlocks,
  getAllPagesFn: typeof getAllPages,
) => getAllBlocksFn === getAllBlocks && getAllPagesFn === getAllPages;

export const Query = (
  config: QueryConfig,
  getAllBlocksFn = getAllBlocks,
  getAllPagesFn = getAllPages,
) => {
  notifier.reset();

  const keywords = config.search.filter(Boolean);
  const pages = getAllPagesFn();
  const blocks = getAllBlocksFn();
  const index = useCachedIndex(getAllBlocksFn, getAllPagesFn)
    ? getSearchIndex()
    : buildEphemeralIndex(pages, blocks);
  const query = querySearchIndex(index, {
    keywords,
    caseSensitive: config.caseIntensive,
    matchWholeWord: config.matchWholeWord,
    includePages: config.include?.pages,
    excludePages: config.exclude?.pages,
    includeTags: config.include?.tags,
    excludeTags: config.exclude?.tags,
  });

  const exactSearch = keywords.join("");
  const directPages = query.directPageIds
    .map((uid) => pull(uid))
    .filter((item): item is CacheBlockType => !!item)
    .sort((left, right) => {
      const leftTitle = left.block[":node/title"] || "";
      const rightTitle = right.block[":node/title"] || "";
      if (leftTitle === exactSearch && rightTitle !== exactSearch) {
        return -1;
      }
      if (rightTitle === exactSearch && leftTitle !== exactSearch) {
        return 1;
      }
      return 0;
    })
    .map(toResultItem);

  notifier.notify(45);
  queryResult.setResult(directPages);

  const directBlocks = query.directBlockIds
    .map((uid) => pull(uid))
    .filter((item): item is CacheBlockType => !!item)
    .map((item) => ({
      ...toResultItem(item),
      isPage: false,
    }));

  notifier.notify(75);
  queryResult.pushToResult(directBlocks);

  const directPageIdSet = new Set(query.directPageIds);
  const directBlockIdSet = new Set(query.directBlockIds);

  const relatedResults = query.relatedPageIds
    .filter((pageUid) => !directPageIdSet.has(pageUid))
    .map((pageUid) => {
      const page = pull(pageUid);
      if (!page) {
        return null;
      }

      const partialChildren = [...(query.partialByPage.get(pageUid) || [])]
        .map((uid) => pull(uid))
        .filter((item): item is CacheBlockType => !!item && item.isBlock)
        .filter((item) => !directBlockIdSet.has(item.block[":block/uid"]));

      return {
        ...toResultItem(page),
        children: partialChildren,
      } as ResultItem;
    })
    .filter((item): item is ResultItem => !!item);

  notifier.notify(95);
  queryResult.pushToResult(relatedResults);
  notifier.finish();

  return {
    promise: Promise.resolve([directPages, directBlocks, relatedResults] as const),
    stop: () => {
      //
    },
  };
};
