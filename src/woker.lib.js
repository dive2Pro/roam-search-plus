export default function QueryWorker() {
  var utils = {
    log: (v) => {
      console.log(`from worker: `, v);
    },
  };
 const request = indexedDB.open("MyDatabase", 1);
 let roamData
 request.onsuccess = function (event) {
   const db = event.target.result;
   const transaction = db.transaction("data", "readonly");
   const store = transaction.objectStore("data");
   const getRequest = store.get("all");

   getRequest.onsuccess = function (event) {
    console.log(event.target.result, ' ---@@-')
     roamData = event.target.result.value;
   };
 };
  function woker_gameon() {}

  function woker_add(json) {
    utils.log(json);
    return 1;
  }

  function entries(mapData) {
    var map = [];
    mapData.forEach((value, key) => {
      map.push([key, value]);
    });
    return map;
  }

  function woker_query(configStr, allBlocksStr, allPagesStr, idMapStr) {
    var getAllBlocksFn = () => allBlocks;
    var getAllPagesFn = () => allPages;
    var isUnderTag = (tags, item) => {
      var relatedRefs =
        item[":block/refs"]?.map((item) => item[":db/id"]) || [];

      item[":block/parents"]?.forEach((p) => {
        relatedRefs.push(
          ...(CACHE_BLOCKS_PAGES_BY_ID.get(p[":db/id"])?.[":block/refs"]?.map(
            (ref) => ref[":db/id"]
          ) || [])
        );
      });
      var result = tags.some((tag) =>
        relatedRefs.some((ref) => +ref === +tag)
      );
      return result;
    };
   
    var config = roamData.config
    var allBlocks = roamData.allBlocks
    var allPages = roamData.allPages
    var idMap = roamData.idMap
    var pull = (() => {
      
      return (id) => {
        return idMap[id]
      }
    })()
    utils.log({
      config,
      allBlocks,
      allPages
    });
    var keywords = config.search;
    var hasKeywords = keywords.some((key) => !!key);

    var includes = (p, n) => {
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

    var findBlocksContainsAllKeywords = (keywords) => {
      var lowBlocks = [];
      var result = getAllBlocksFn().filter((item) => {
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
          // console.log(config.exclude.tags, item.block[":block/refs"]?.map(item =>item[":db/id"]))
          // if (config.exclude.tags.some(tagId => item.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
          // return false
          // }
          if (isUnderTag(config.exclude.tags, item.block)) {
            return false;
          }
        }
        var r = keywords.every((keyword) => {
          return (
            item.block[":block/string"] &&
            includes(item.block[":block/string"], keyword)
          );
        });

        if (config.include?.tags?.length) {
          var hasTagged =
            item.block[":block/refs"] &&
            config.include.tags.some((tagId) =>
              item.block[":block/refs"].some(
                (ref) => String(ref[":db/id"]) === String(tagId)
              )
            );
          // console.log(
          //     hasTagged,
          //     config.include.tags,
          //     item.block[":block/refs"]?.map((item) => item[":db/id"]),
          //     "____item book"
          //   );
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
    var timemeasure = (name, cb) => {
      // console.time(name);
      cb();
      // console.timeEnd(name);
    };
    function findAllRelatedBlocks(keywords) {
      let result = findBlocksContainsAllKeywords(keywords);
      var topLevelBlocks = result[0], lowBlocks = result[1];
      // if (keywords.length <= 1) {
      //   return [topLevelBlocks, lowBlocks?.map(block => {
      //     return {
      //       page: block.page,
      //       children: [block]
      //     }
      //   })] as const;
      // }
      // var allRelatedGenerator = timeSlice_(findAllRelatedBlockGroupByPages);
      // console.log("find low");

      // let lowBlocks: CacheBlockType[] = [];
      timemeasure("0", () => {
        if (config.include?.pages?.length) {
          lowBlocks = lowBlocks.filter((block) => {
            return config.include.pages.some((uid) => uid === block.page);
          });
        }

        if (config.include?.tags.length) {
          // console.log(config.exclude.tags, item.block[":block/refs"]?.map(item => item[":db/id"]))
          // if (!config.include.tags.some(tagId => item.block[":block/refs"].some(ref => String(ref[":db/id"]) === String(tagId)))) {
          //   return false
          // }

          lowBlocks = lowBlocks.filter((item) => {
            return isUnderTag(config.include.tags, item.block);
          });
          // console.log(lowBlocks, ' --- ', config.include.tags, topLevelBlocks)
        }
      });

      // keywords.forEach((keyword) => {
      //   lowBlocks.filter((item) => {
      //     return includes(item[":block/uid"], keyword);
      //   });
      // });

      var validateMap = new Map();
      timemeasure("1", () => {
        lowBlocks = lowBlocks.filter((item) => {
          let result = !hasKeywords;
          keywords.forEach((keyword, index) => {
            var r = includes(item.block[":block/string"], keyword);

            if (!validateMap.has(item.page)) {
              validateMap.set(item.page, []);
            }
            if (r) {
              // console.log({ ...item.block }, ' ===', keyword)
              validateMap.get(item.page)[index] = r;
              result = r;
            }
            // if (r)
            // // console.log(
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
        var topLevelPagesMap = topLevelBlocks.reduce((p, c) => {
          p[c.page] = 1;
          return p;
        }, {});
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
      var map = new Map();

      timemeasure("3", () => {
        lowBlocks.forEach((b) => {
          if (map.has(b.page)) {
            map.get(b.page).push(b);
          } else {
            map.set(b.page, [b]);
          }
        });
      });

      var lowBlocksResult = entries(map).map((item) => {
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
      ];
    }

    function findAllRelatedPageUids(keywords) {
      return getAllPagesFn().filter((page) => {
        // 过滤掉非选中页面
        if (config.exclude) {
          if (config.exclude.pages?.length) {
            if (
              config.exclude.pages.some(
                (uid) => page.block[":block/uid"] === uid
              )
            ) {
              return false;
            }
          }
          if (
            config.exclude.tags?.length &&
            page.block[":block/refs"]?.length
          ) {
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
            !config.include.pages.some(
              (uid) => page.block[":block/uid"] === uid
            )
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
        var r = keywords.every((keyword) => {
          return includes(page.block[":node/title"], keyword);
        });
        return r;
      });
    }
    // console.log(config, " ---- config");
    // var ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
    var promise = Promise.all([
      findAllRelatedPageUids(keywords),
      findAllRelatedBlocks(keywords),
    ]);
    return promise.then(
        (response) => {
          // [pageUids, [topLevelBlocks, (lowLevelBlocks = [])]];
          const pageUids = response[0]
          const topLevelBlocks = response[1][0]
          const lowLevelBlocks = response[1][0] || []
          utils.log({ topLevelBlocks, lowLevelBlocks})
          var result = [
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
          ];
          // console.log("end!!!!!!", result);
          console.timeEnd("SSSS");

          return result;
        }
      )
    }
}
// var Demo = `
// let CACHE = {}
// export function add(a, b) {
//     console.log({ a, b })
// }
// `;

// var v = Demo.toString().split("\n").slice(0, -1);
// console.log({ v: v.join("\n") });
