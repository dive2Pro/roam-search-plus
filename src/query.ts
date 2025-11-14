import { containsChinese, isCompleteWord, pull, timer } from "./helper";
import { CacheBlockType, getAllBlocks, getAllPages, isUnderTag } from "./roam";
import { ResultItem } from "./store";
import { queryResult } from "./result";
class ChunkProcessorV3 {
  isRunning = false;
  private handle: number | null = null;

  start<T>(
    items: T[],
    processItem: (v: T) => void,
    onChunkCallback: (p: number) => void,
  ) {
    return new Promise((resolve, reject) => {
      this.isRunning = true;
      let currentIndex = 0;
      const totalItems = items.length;

      const processChunk = (deadline: IdleDeadline) => {
        if (!this.isRunning) {
          reject(new Error("Processing stopped."));
          return;
        }

        // 只要有空闲时间并且还有任务，就继续处理
        while (deadline.timeRemaining() > 0 && currentIndex < totalItems) {
          // 每次处理一个项目，而不是一个固定的 chunk
          processItem(items[currentIndex]);
          currentIndex++;
        }

        onChunkCallback(currentIndex);

        if (currentIndex < totalItems) {
          // 如果任务未完成，请求下一个空闲回调
          this.handle = requestIdleCallback(processChunk);
        } else {
          this.isRunning = false;
          resolve(1);
        }
      };

      this.handle = requestIdleCallback(processChunk);
    });
  }

  stop() {
    console.warn("find all stop!!!!");
    if (this.handle) {
      cancelIdleCallback(this.handle);
      this.handle = null;
    }
    this.isRunning = false;
  }
}


class NotifyProgress {
  _percent = -1;
  callback = (p: number) => { };

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
export const Query = (
  config: QueryConfig,
  getAllBlocksFn = getAllBlocks,
  getAllPagesFn = getAllPages,
) => {
  console.time("SSSS");
  notifier.reset();
  // 使用示例
  const processor = new ChunkProcessorV3();

  const keywords = config.search;
  const hasKeywords = keywords.some((key) => !!key);
  console.log({ keywords });
  /**
   * 检查文本中是否包含 keyword，支持完整单词匹配
   * @param text 要搜索的文本
   * @param keyword 关键词
   * @param matchWholeWord 是否匹配完整单词
   */
  const includes = (text: string, keyword: string, matchWholeWord: boolean = false): boolean => {
    if (!text || !keyword) {
      return false;
    }
    console.log({ text, keyword, matchWholeWord }, 22);
    // 如果不要求完整单词匹配，使用原来的逻辑
    if (!matchWholeWord) {
      if (config.caseIntensive) {
        return text.includes(keyword);
      } else {
        return text.toLowerCase().includes(keyword.toLowerCase());
      }
    }

    // 完整单词匹配逻辑
    const isKeywordCompleteWord = isCompleteWord(keyword);

    if (!isKeywordCompleteWord) {
      // 如果 keyword 本身不是完整单词，则使用普通匹配
      if (config.caseIntensive) {
        return text.includes(keyword);
      } else {
        return text.toLowerCase().includes(keyword.toLowerCase());
      }
    }

    // 对于完整单词，使用单词边界匹配
    if (containsChinese(keyword)) {
      // 中文：直接匹配字符，因为中文每个字通常就是一个词
      if (config.caseIntensive) {
        return text.includes(keyword);
      } else {
        return text.toLowerCase().includes(keyword.toLowerCase());
      }
    } else {
      // 拉丁语系：使用单词边界正则表达式
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = config.caseIntensive
        ? new RegExp(`\\b${escapedKeyword}\\b`)
        : new RegExp(`\\b${escapedKeyword}\\b`, 'i');
      return pattern.test(text);
    }
  };

  // 要把那些
  const findBlocksContainsAllKeywords = async (
    keywords: string[],
  ): Promise<[ResultItem[], CacheBlockType[]]> => {
    // ================== 性能优化关键点 ==================
    // 在循环外将配置数组转换为 Set 以实现 O(1) 查找
    const includePagesSet = new Set(config.include?.pages || []);
    const excludePagesSet = new Set(config.exclude?.pages || []);
    const includeTagsSet = new Set(config.include?.tags?.map(String) || []); // 确保是字符串以供比较
    const excludeTagsSet = new Set(config.exclude?.tags?.map(Number) || []);
    // =======================================================

    const lowBlocks: CacheBlockType[] = [];
    const topBlocks: ResultItem[] = [];
    const items = getAllBlocksFn();
    const endTimer = timer("find blocks contains all");
    await processor.start(
      items,
      (item) => {
        const isTopBlock = () => {
          // 使用 Set.has() 进行 O(1) 查找
          if (includePagesSet.size > 0 && !includePagesSet.has(item.page)) {
            return false;
          }
          if (excludePagesSet.size > 0 && excludePagesSet.has(item.page)) {
            return false;
          }
          if (
            excludeTagsSet.size > 0 &&
            isUnderTag(Array.from(excludeTagsSet), item.block)
          ) {
            // isUnderTag 可能也需要优化，如果它内部也是循环的话
            // 假设 isUnderTag 无法直接用 Set，我们保持原样，但已经减少了其他检查
            return false;
          }

          const blockString = item?.block?.[":block/string"];
          if (!blockString) return false;

          const containsAllKeywords = keywords.every((keyword) => {
            // 使用配置项决定是否使用完整单词匹配
            return includes(blockString, keyword, config.matchWholeWord || false);
          });

          if (!containsAllKeywords) {
            return false
          }

          // 处理 include.tags
          if (includeTagsSet.size > 0) {
            const hasIncludedTag = item.block[":block/refs"]?.some((ref) =>
              includeTagsSet.has(String(ref[":db/id"])),
            );
            if (!hasIncludedTag) {
              return false;
            }
          }
          console.log({ item: { ...item, block: { ...item.block } }, text: item.block[":block/string"], keywords }, 222);
          return true; // 所有检查都通过
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
          if (!item) {
            debugger;
          }
          lowBlocks.push(item);
        }
      },
      // 2000,
      (index) => {
        notifier.notify(Math.ceil((index / items.length) * 40) + 20);
      },
    );
    endTimer();

    return [topBlocks, lowBlocks];
  };
  const timemeasure = (name: string, cb: () => void) => {
    console.time(name);
    cb();
    console.timeEnd(name);
  };
  async function findAllRelatedBlocks(
    // lowerPages: CacheBlockType[],
    topLevelBlocks: ResultItem[],
    lowLevelBlocks: CacheBlockType[],
  ) {
    let lowBlocks = lowLevelBlocks;
    timemeasure("0", () => {
      if (config.include?.pages?.length) {
        lowBlocks = lowBlocks.filter((block) => {
          return config.include.pages.some((uid) => uid === block.page);
        });
      }

      if (config.include?.tags?.length) {
        lowBlocks = lowBlocks.filter((item) => {
          return isUnderTag(config.include.tags, item.block);
        });
      }
    });

    const validateMap = new Map<string, boolean[]>();
    await new Promise((resolve) => {
      const newLowBlocks: CacheBlockType[] = [];
      const pageSet = new Set<string>();

      timemeasure("1", async () => {
        await processor.start(
          lowBlocks,
          (item) => {
            keywords.forEach((keyword, index) => {
              // 使用配置项决定是否使用完整单词匹配
              const r = includes(
                item.block[":node/title"] || item.block[":block/string"],
                keyword,
                config.matchWholeWord || false,
              );

              if (!validateMap.has(item.page)) {
                validateMap.set(item.page, []);
              }
              if (r) {
                validateMap.get(item.page)[index] = true;
                // result = r;
                if (pageSet.has(item.block[":block/uid"])) {
                  return;
                }
                pageSet.add(item.block[":block/uid"]);

                newLowBlocks.push(item);
              }
            });
          },
          // lowBlocks.length,
          () => {
            //
          },
        );
        // lowBlocks = lowBlocks.filter((item) => {
        //   return result;
        // });
        lowBlocks = newLowBlocks;
        resolve(1);
      });
    });
    // 如果 lowBlocks 出现过的页面,
    timemeasure("2", () => {
      const topLevelPagesMap = topLevelBlocks.reduce(
        (p, c) => {
          p[c.id] = 1;
          return p;
        },
        {} as Record<string, number>,
      );

      lowBlocks = lowBlocks.filter((block) => {
        // 如果 topLevel 和 lowBlocks 是在相同的页面, 那么即使 lowBlocks 中没有出现所有的 keywords, 它们也应该出现在结果中.
        if (topLevelPagesMap[block.page]) {
          return true;
        }
        return keywords.every((k, i) => {
          const r = validateMap.get(block.page)[i];
          //  console.log({ r, k, i, block: {...block, block: { ...block.block}} });
          return r;
        });
      });
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
    console.log(keywords, validateMap, lowBlocks, map, "@@@----");

    notifier.notify(70);

    const lowBlocksResult = [...map.entries()].map((_item, index, arr) => {
      const p = Math.ceil((index / arr.length) * 30);
      if (Number.isInteger(p)) {
        notifier.notify(70 + p);
      }
      const item = {
        page: pull(_item[0]),
        children: _item[1].filter((v) => v.isBlock),
      };

      return {
        id: item.page.block[":block/uid"],
        text:
          item.page.block[":block/string"] || item.page.block[":node/title"],
        editTime:
          item.page.block[":edit/time"] || item.page.block[":create/time"],
        createTime: item.page.block[":create/time"],
        createUser: item.page.block[":create/user"]?.[":db/id"],
        isPage: !item.page.isBlock,
        paths: [] as string[],
        isSelected: false,
        children: item.children,
      } as ResultItem;
    });
    queryResult.pushToResult(lowBlocksResult);
    notifier.finish();
    return lowBlocksResult;
  }

  async function findAllRelatedPageUids(keywords: string[]) {
    const endTimer = timer("find all related pageuids");
    const result: ResultItem[] = [];
    const lowPages: CacheBlockType[] = [];
    notifier.notify(5);

    getAllPagesFn().forEach((page, index, arr) => {
      if (Number.isInteger(index / arr.length) && index / arr.length > 5) {
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
                (ref) => String(ref[":db/id"]) === String(tagId),
              ),
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
                (ref) => String(ref[":db/id"]) === String(tagId),
              ),
            )
          ) {
            return false;
          }
        }
      }
      const containsAll = keywords.every((keyword) => {
        // 使用配置项决定是否使用完整单词匹配
        return includes(page.block[":node/title"], keyword, config.matchWholeWord || false);
      });

      if (containsAll) {
        if (page.block[":node/title"] === config.search.join("")) {
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
      } else {
        lowPages.push(page);
      }
    });
    endTimer();
    return [result, lowPages] as const;
  }
  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const promise = Promise.all([
    findAllRelatedPageUids(keywords).then((result) => {
      queryResult.setResult(result[0]);
      return result;
    }),
    findBlocksContainsAllKeywords(keywords).then((res) => {
      queryResult.pushToResult(res[0]);
      notifier.notify(60);
      return res;
    }),
  ]).then(([[pages, lowerPages], [topLevelBlocks, lowBlocks]]) => {
    return findAllRelatedBlocks(topLevelBlocks, [
      ...lowerPages,
      ...lowBlocks,
    ]).then((res) => {
      return [pages, topLevelBlocks, res] as const;
    });
  });

  return {
    promise: promise.then((result) => {
      return new Promise((resolve) => {
        // console.log({ result });
        setTimeout(() => {
          resolve(result);
        }, 200);
      });
      // return result;
    }),
    stop: () => {
      processor.stop();
    },
  };
};
