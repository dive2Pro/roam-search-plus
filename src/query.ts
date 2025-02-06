import { transaction } from "mobx";
import { pull, timer } from "./helper";
import { CacheBlockType, getAllBlocks, getAllPages, isUnderTag } from "./roam";
import { worker } from "./woker";
import { ResultItem } from "./store";
import { queryResult } from "./result";
class ChunkProcessor {
  isRunning = false
  constructor() {
  }

  start<T>(
    items: T[],
    processItem: (v: T) => void,
    chunkSize = 2500,
    onChunkCallback: (p: number) => void
  ) {
    return new Promise((resolve) => {
      this.isRunning = true;
      let index = 0;

      const process = () => {
        if (!this.isRunning) return;

        const chunk = items.slice(index, index + chunkSize);
        chunk.forEach(processItem);

        index += chunkSize;
        onChunkCallback(index);
        if (index < items.length) {
          setTimeout(process);
        } else {
          resolve(1);
        }
      };

      setTimeout(process);
    });
  }

  stop() {
    console.warn("find all stop!!!!");
    this.isRunning = false;
  }
}

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
    return this._percent === 100
  }
}

export const notifier = new NotifyProgress();
export const Query = (
  config: QueryConfig,
  getAllBlocksFn = getAllBlocks,
  getAllPagesFn = getAllPages
) => {
  console.time("SSSS");
  notifier.reset();
  // 使用示例
  const processor = new ChunkProcessor();

  const keywords = config.search;
  const hasKeywords = keywords.some((key) => !!key);
  const includes = (p: string, n: string) => {
    if (!p) {
      return false;
    }
    // console.log("includes: ", p, n);
    if (config.caseIntensive) {
      return p.includes(n);
    } else {
      return p.toLowerCase().includes(n.toLowerCase());
    }
  };

  const findBlocksContainsAllKeywords = async (
    keywords: string[]
  ): Promise<[ResultItem[], CacheBlockType[]]> => {
    const lowBlocks: CacheBlockType[] = [];
    const topBlocks: ResultItem[] = [];
    const items = getAllBlocksFn();
    console.log({ items });
    await processor.start(
      items,
      (item) => {
        const isTopBlock = () => {
          if (config.include?.pages?.length) {
            if (
              !config.include.pages.some((pageUid) => {
                return pageUid === item.page;
              })
            ) {
              return false;
            }
          }

          if (config.exclude?.pages?.length) {
            if (config.exclude.pages.some((pageUid) => pageUid === item.page)) {
              return false;
            }
          }
          if (config.exclude?.tags?.length) {
            if (isUnderTag(config.exclude.tags, item.block)) {
              return false;
            }
          }
          const r = keywords.every((keyword) => {
            return (
              item.block[":block/string"] &&
              includes(item.block[":block/string"], keyword)
            );
          });

          if (config.include?.tags?.length) {
            const hasTagged =
              item.block[":block/refs"] &&
              config.include.tags.some((tagId) =>
                item.block[":block/refs"].some(
                  (ref) => String(ref[":db/id"]) === String(tagId)
                )
              );

            if (r) {
              if (hasTagged) {
                return true;
              } else {
                return false;
              }
            } else {
              return false;
            }
          }
          return r;
        };
        if (isTopBlock()) {
          topBlocks.push({
            id: item.block[":block/uid"],
            text: item.block[":block/string"],
            editTime: item.block[":edit/time"] || item.block[":create/time"],
            createTime: item.block[":create/time"],
            isPage: false,
            createUser: item.block[":create/user"]?.[":db/id"],
            paths: [] as string[],
            isSelected: false,
            children: [],
          });
        } else {
          lowBlocks.push(item);
        }
      },
      1000,
      (index) => {
        notifier.notify(Math.ceil((index / items.length) * 40) + 20);
      }
    );

    return [topBlocks, lowBlocks];
  };
  const timemeasure = (name: string, cb: () => void) => {
    console.time(name);
    cb();
    console.timeEnd(name);
  };
  async function findAllRelatedBlocks(keywords: string[]) {
    const endkeywordTimer = timer("find all keywords");
    let [topLevelBlocks, lowBlocks] = await findBlocksContainsAllKeywords(
      keywords
    ).then(([t, l]) => {
      queryResult.pushToResult(t);
      notifier.notify(60);
      return [t, l] as const;
    });
    endkeywordTimer();

    timemeasure("0", () => {
      if (config.include?.pages?.length) {
        lowBlocks = lowBlocks.filter((block) => {
          return config.include.pages.some((uid) => uid === block.page);
        });
      }

      if (config.include?.tags.length) {
        lowBlocks = lowBlocks.filter((item) => {
          return isUnderTag(config.include.tags, item.block);
        });
      }
    });

    const validateMap = new Map<string, boolean[]>();
    timemeasure("1", () => {
      lowBlocks = lowBlocks.filter((item) => {
        let result = !hasKeywords;
        keywords.forEach((keyword, index) => {
          const r = includes(item.block[":block/string"], keyword);

          if (!validateMap.has(item.page)) {
            validateMap.set(item.page, []);
          }
          if (r) {
            validateMap.get(item.page)[index] = r;
            result = r;
          }
        });
        return result;
      });
    });

    // 如果 lowBlocks 出现过的页面,
    timemeasure("2", () => {
      const topLevelPagesMap = topLevelBlocks.reduce((p, c) => {
        p[c.id] = 1;
        return p;
      }, {} as Record<string, number>);

      lowBlocks = lowBlocks.filter((block) => {
        // 如果 topLevel 和 lowBlocks 是在相同的页面, 那么即使 lowBlocks 中没有出现所有的 keywords, 它们也应该出现在结果中.
        if (topLevelPagesMap[block.page]) {
          return true;
        }
        return keywords.every((k, i) => {
          return validateMap.get(block.page)[i];
        });
      });
      // console.log(keywords, validateMap, lowBlocks, "@@@----");
    });
    const map = new Map<string, CacheBlockType[]>();

    timemeasure("3", () => {
      lowBlocks.forEach((b) => {
        if (map.has(b.page)) {
          map.get(b.page).push(b);
        } else {
          map.set(b.page, [b]);
        }
      });
    });
    notifier.notify(70);

    const lowBlocksResult = [...map.entries()].map((_item, index, arr) => {
      const p = Math.ceil((index / arr.length) * 30);
      if (Number.isInteger(p)) {
        notifier.notify(70 + p);
      }
      const item = {
        page: pull(_item[0]),
        children: _item[1],
      };

      return {
        id: item.page.block[":block/uid"],
        text: item.page.block[":node/title"],
        editTime:
          item.page.block[":edit/time"] || item.page.block[":create/time"],
        createTime: item.page.block[":create/time"],
        createUser: item.page.block[":create/user"]?.[":db/id"],
        isPage: false,
        paths: [] as string[],
        isSelected: false,
        children: item.children,
      } as ResultItem; 
    });
    queryResult.pushToResult(lowBlocksResult);
    notifier.finish();
    return [topLevelBlocks as ResultItem[], lowBlocksResult] as const;
  }

  async function findAllRelatedPageUids(keywords: string[]) {
    const endTimer = timer("find all related pageuids");
    const result: ResultItem[] = [];
    notifier.notify(5);

    getAllPagesFn().forEach((page, index, arr) => {
      if (Number.isInteger(index / arr.length) && index/arr.length > 5) {
        notifier.notify(Math.ceil((index / arr.length) * 20));
      }

      // 过滤掉非选中页面
      if (config.exclude) {
        if (config.exclude.pages?.length) {
          if (
            config.exclude.pages.some((uid) => page.block[":block/uid"] === uid)
          ) {
            return false;
          }
        }
        if (config.exclude.tags?.length && page.block[":block/refs"]?.length) {
          // console.log(config.exclude.tags, page.block[":block/refs"]?.map(item => item[":db/id"]))
          if (
            config.exclude.tags.some((tagId) =>
              page.block[":block/refs"].some(
                (ref) => String(ref[":db/id"]) === String(tagId)
              )
            )
          ) {
            return false;
          }
        }
      }
      if (config.include?.pages?.length) {
        if (
          !config.include.pages.some((uid) => page.block[":block/uid"] === uid)
        ) {
          return false;
        }
      }

      if (config.include?.tags?.length) {
        if (!page.block[":block/refs"]?.length) {
          return false;
        }
        if (config.include.tags.length && page.block[":block/refs"]?.length) {
          if (
            !config.include.tags.some((tagId) =>
              page.block[":block/refs"].some(
                (ref) => String(ref[":db/id"]) === String(tagId)
              )
            )
          ) {
            return false;
          }
        }
      }
      const containsAll = keywords.every((keyword) => {
        return includes(page.block[":node/title"], keyword);
      });

      if (containsAll) {
        if (page.block[":node/title"] === (config.search.join(""))) {
          result.unshift({
            id: page.block[":block/uid"],
            text: page.block[":node/title"],
            editTime: page.block[":edit/time"] || page.block[":create/time"],
            createTime: page.block[":create/time"],
            isPage: true,
            paths: [] as string[],
            isSelected: false,
            children: [] as any[],
            createUser: page.block[":create/user"] as unknown as number,
          });
          return;
        }
        result.push({
          id: page.block[":block/uid"],
          text: page.block[":node/title"],
          editTime: page.block[":edit/time"] || page.block[":create/time"],
          createTime: page.block[":create/time"],
          isPage: true,
          paths: [] as string[],
          isSelected: false,
          children: [] as any[],
          createUser: page.block[":create/user"] as unknown as number,
        });
      }
    });
    endTimer();
    return result;
  }
  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const promise = Promise.all([
    findAllRelatedPageUids(keywords).then((result) => {
      queryResult.setResult(result);

      return result;
    }),
    findAllRelatedBlocks(keywords),
  ]);

  return {
    promise: promise.then(([pages, [topLevelBlocks, lowLevelBlocks = []]]) => {
      const result = [pages, topLevelBlocks, lowLevelBlocks] as const;
      // console.log("end!!!!!!", result);
      console.timeEnd("SSSS");

      return result;
    }),
    stop: () => {
      processor.stop();
    },
  };
};
