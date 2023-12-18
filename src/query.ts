import { PullBlock } from "roamjs-components/types";
import { pull } from "./helper";
import { CacheBlockType, getAllBlocks, getAllPages, isUnderTag } from "./roam";


export const Query = (config: QueryConfig) => {
  console.time("SSSS");
  const keywords = config.search;
  const hasKeywords = keywords.some(key => !!key);

  const filterStringByKeywordsIntensive = (
    blocks: PullBlock[],
    keyword: string,
    intensive = true
  ) => { };
  const cancelRef = {
    current: false,
  };
  const check = () => {
    if (cancelRef.current) {
      throw new Error("Cancel");
    }
  };
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

  const findBlocksContainsAllKeywords = (keywords: string[]) => {
    const lowBlocks: CacheBlockType[] = [];
    const result = getAllBlocks().filter((item) => {
      if (config.include.pages?.length) {
        if (
          !config.include.pages.some((pageUid) => {
            return pageUid === item.page;
          })
        ) {
          return false;
        }
      }

      if (config.exclude.pages?.length) {
        if (config.exclude.pages.some(pageUid => pageUid === item.page)) {
          return false;
        }
      }
      if (config.exclude.tags?.length) {
        // console.log(config.exclude.tags, item.block[":block/refs"]?.map(item =>item[":db/id"]))
        // if (config.exclude.tags.some(tagId => item.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
        // return false
        // }
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

      if (config.include.tags.length) {
        const hasTagged = item.block[":block/refs"] &&
          config.include.tags.some(tagId =>
            item.block[":block/refs"].some(ref =>
              String(ref[":db/id"]) === String(tagId)))
        console.log(hasTagged, config.include.tags, item.block[":block/refs"]?.map(item =>item[":db/id"]), '____item book')
        if (r) {
          if (hasTagged) {
            return true;
          } else {
            lowBlocks.push(item);
            return false;
          }
        } else {
          lowBlocks.push(item);
          return false;
        }
      }

      if (!r) {
        lowBlocks.push(item);
      }
      return r;
    });
    return [result, lowBlocks];
  };
  const timemeasure = (name: string, cb: () => void) => {
    // console.time(name);
    cb();
    // console.timeEnd(name);
  };
  async function findAllRelatedBlocks(keywords: string[]) {
    let [topLevelBlocks, lowBlocks] = findBlocksContainsAllKeywords(keywords);

    // if (keywords.length <= 1) {
    //   return [topLevelBlocks, lowBlocks?.map(block => {
    //     return {
    //       page: block.page,
    //       children: [block]
    //     }
    //   })] as const;
    // }
    // const allRelatedGenerator = timeSlice_(findAllRelatedBlockGroupByPages);
    // console.log("find low");

    // let lowBlocks: CacheBlockType[] = [];
    timemeasure("0", () => {
      if (config.include.pages?.length) {
        lowBlocks = lowBlocks.filter((block) => {
          return config.include.pages.some((uid) => uid === block.page);
        });
      }

      if (config.include.tags.length) {
        // console.log(config.exclude.tags, item.block[":block/refs"]?.map(item => item[":db/id"]))
        // if (!config.include.tags.some(tagId => item.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
        //   return false
        // }

        lowBlocks = lowBlocks.filter(item => {
          return isUnderTag(config.include.tags, item.block)
        })
        console.log(lowBlocks, ' --- ', config.include.tags, topLevelBlocks)

      }
    });

    // keywords.forEach((keyword) => {
    //   lowBlocks.filter((item) => {
    //     return includes(item[":block/uid"], keyword);
    //   });
    // });

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
            // console.log({ ...item.block }, ' ===', keyword)
            validateMap.get(item.page)[index] = r;
            result = r;
          }
          // if (r)
          //   console.log(
          //     item,
          //     item.block[":block/string"],
          //     r,
          //     keyword,
          //     " --- -- - - - - ---",
          //     config
          //   );
        });
        return result;
      });
      // console.log(lowBlocks, " lowblocks", validateMap);
    });

    // 如果 lowBlocks 出现过的页面,
    timemeasure("2", () => {
      lowBlocks = lowBlocks.filter((block) => {
        // 如果 topLevel 和 lowBlocks 是在相同的页面, 那么即使 lowBlocks 中没有出现所有的 keywords, 它们也应该出现在结果中.
        if (topLevelBlocks.some((tb) => tb.page === block.page)) {
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

    const lowBlocksResult = [...map.entries()].map((item) => {
      return {
        page: item[0],
        children: item[1],
      };
    });

    return [
      topLevelBlocks,
      lowBlocksResult,
      // (await allRelatedGenerator(keywords, topLevelBlocks)) as {
      //   page: string;
      //   children: string[];
      // }[],
    ] as const;
  }

  function findAllRelatedPageUids(keywords: string[]) {
    return getAllPages().filter((page) => {

      // 过滤掉非选中页面
      if (config.exclude) {
        if (config.exclude.pages?.length) {
          if (config.exclude.pages.some(uid => page.block[":block/uid"] === uid)) {
            return false
          }
        }
        if (config.exclude.tags?.length && page.block[":block/refs"]?.length) {
          // console.log(config.exclude.tags, page.block[":block/refs"]?.map(item => item[":db/id"]))
          if (config.exclude.tags.some(tagId => page.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
            return false
          }
        }
      }
      if (config.include.pages?.length) {
        if (!config.include.pages.some((uid) => page.block[":block/uid"] === uid)) {
          return false;
        }
      }

      if (config.include.tags.length) {
        if (!page.block[":block/refs"]?.length) {
          return false;
        }
        if (config.include.tags.length && page.block[":block/refs"]?.length) {
          if (!config.include.tags.some(tagId => page.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
            return false
          }
        }
      }
      const r = keywords.every((keyword) => {
        return includes(page.block[":node/title"], keyword);
      });
      return r;
    });
  }
  console.log(config, " ---- config");
  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const promise = Promise.all([
    findAllRelatedPageUids(keywords),
    findAllRelatedBlocks(keywords),
  ]);

  return {
    promise: promise.then(
      ([pageUids, [topLevelBlocks, lowLevelBlocks = []]]) => {
        const result = [
          // pull_many(pageUids),
          pageUids,
          // pull_many(topLevelBlocks),
          topLevelBlocks,
          //   .map((item) => {
          //   return {
          //     ...item,
          //     parents: getParentsInfoOfBlockUid(item[":block/uid"]),
          //   };
          // }),
          lowLevelBlocks
            .map((item) => {
              return {
                page: pull(item.page),
                children: item.children,
              };
            })
            .filter((item) => item.page),

          // lowLevelBlocks,
        ] as const;
        console.log("end!!!!!!", result);
        console.timeEnd("SSSS");

        return result;
      }
    ),
    cancel: () => {
      cancelRef.current = true;
    },
  };
};
