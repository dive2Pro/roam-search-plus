import { PullBlock } from "roamjs-components/types";
import { debounce, getDiff, getSame, pull, pull_many } from "./helper";
import {
  getAllBlocks,
  getAllPages,
  getBlocksContainsStr,
  getCache,
} from "./roam";

let conditionRule = "";

const ancestorrule = `[ 
   [ (ancestor ?child ?parent) 
        [?parent :block/children ?child] ]
   [ (ancestor ?child ?a) 
        [?parent :block/children ?child ] 
        (ancestor ?parent ?a) ] ] ]`;

const getParentsInfoOfBlockUid = (uid: string) => {
  const result = window.roamAlphaAPI.data.fast
    .q(
      `[:find (pull ?p [:block/uid :block/string :node/title]) :where [?b :block/uid "${uid}"] [?b :block/parents ?p] ]`
    )
    .map((item) => item[0]);
  return result as {
    ":block/uid": string;
    ":block/string": string;
    ":node/title": string;
  }[];
};

export const Query = (config: {
  search: string[];
  modificationDate?: SelectDate;
  creationDate?: SelectDate;
  uids?: string[];
  caseIntensive: boolean;
}) => {
  console.time("SSSS");
  const filterStringByKeywordsIntensive = (
    blocks: PullBlock[],
    keyword: string,
    intensive = true
  ) => {};
  conditionRule = `
      [
        [
          (condition ?block)
            ${
              config.modificationDate
                ? `
                [?block :edit/time ?etime]
                [(>= ?etime ${config.modificationDate.start.valueOf()})]
                [(<= ?etime ${config.modificationDate.end.valueOf()})]
            `
                : ""
            }
            ${
              config.creationDate
                ? `
                [?block :create/time ?ctime]
                [(>= ?ctime ${config.creationDate.start.unix()})]
                [(<= ?ctime ${config.creationDate.end.unix()})]
            `
                : ""
            }
            [?block]
          ]
      ]
    
    `;
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
    if (config.caseIntensive) {
      return p.includes(n);
    } else {
      return p.toLowerCase().includes(n.toLowerCase());
    }
  };

  function timeSlice_<T, D>(fnc: any, time = 16, cb = setTimeout) {
    return function (...args: T[]) {
      const fnc_ = fnc(...args);
      if (fnc.constructor.name !== "GeneratorFunction") return fnc_;

      let data: any;

      return new Promise<D>(async function go(resolve, reject) {
        try {
          const start = performance.now();

          do {
            check();
            data = fnc_.next(await data?.value);
          } while (!data.done && performance.now() - start < time);

          if (data.done) return resolve(data.value);

          cb(() => go(resolve, reject));
        } catch (e) {
          reject(e);
        }
      });
    };
  }

  const findBlocksContainsAllKeywords = (keywords: string[]) => {
    return getAllBlocks().filter((item) => {
      if (config.uids?.length) {
        if (
          !config.uids.some((pageUid) => {
            return pageUid === item.page;
          })
        ) {
          return false;
        }
      }
      return keywords.every((keyword) => {
        return (
          item[":block/string"] && includes(item[":block/string"], keyword)
        );
      });
    });
  };

  function* findBlocksContainsStringInPages(
    keywords: string[],
    pages: string[]
  ) {
    let result: string[];
    for (let c of keywords) {
      const uids = window.roamAlphaAPI.data.fast.q(
        `
        [
            :find  [?uid ...]
            :in $  [?page ...] %
            :where
                
                [?b :block/string ?s]
                [?b :block/uid ?uid]
                [?b :block/parents ?p]
                [?p :block/uid ?pd]
                [?b :block/parents ?p2]
                [(clojure.string/includes? ?s  "${c}")]
                [?p :node/title ?t]
                [?p :block/uid ?page]

        ]
    `,
        pages,
        conditionRule
      ) as unknown as string[];
      yield result;
      if (result === undefined) {
        result = uids;
      } else {
        result = Array.from(new Set([...result, ...uids]));
      }
    }

    return result;
  }

  function* findAllRelatedPages(keywords: string[]) {
    let queryArgs = (keyword: string) => {
      return [
        `
        [
            :find [?uid ...]
            :where
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${keyword}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
                
        ]
    `,
      ] as [string] | [string, string[]];
    };
    if (config.uids && config.uids.length) {
      console.log("only uids", config.uids);
      queryArgs = (keyword: string) => {
        return [
          `
        [
            :find [?uid ...]
            :in $ [?page ...]
            :where
                [?p :block/uid ?page];
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${keyword}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
                
        ]
    `,
          config.uids,
        ];
      };
    }

    let pages: string[];
    for (let keyword of keywords) {
      const result = window.roamAlphaAPI.data.fast.q.apply(
        null,
        queryArgs(keyword)
      ) as unknown as string[];
      yield result;
      // console.log(result, " -------@@", keywords, keyword, pages);
      if (pages === undefined) {
        pages = result;
      } else {
        pages = getSame(pages, result);
      }
    }
    // const pages = keywords.reduce((p, c, index) => {
    // console.log("pages = ", pages);
    // }, [] as string[]);
    return pages;
  }

  async function findAllRelatedBlockGroupByPages(
    keywords: string[],
    topLevelBlocks: string[]
  ) {
    console.log(" ---000-==");
    const allRelatedPagesGenerator = timeSlice_(findAllRelatedPages);
    const pages = await allRelatedPagesGenerator(keywords);
    // console.log(" ---111-==, ", Date.now(), pages);
    const allRelatedBlockGroupByPages = timeSlice_(
      findBlocksContainsStringInPages
    );
    const blocksInSamePage = await allRelatedBlockGroupByPages(keywords, pages);
    // 找到正好包含所有 keywords 的 block. 记录下来
    // console.log(" ---222-==", Date.now(), pages, blocksInSamePage);
    const lowLevelBlocks = getDiff(topLevelBlocks, blocksInSamePage);
    // getDiff(topLevelBlocks, blocksInSamePage);
    // console.log(" ---333-==", Date.now());

    // 找到 相同 page 下满足条件的 block
    const pageUidBlockUidAry = window.roamAlphaAPI.q(
      `
    [
      :find ?pid ?uid
      :in $ [?uid ...] %
      :where
        [?page :node/title ?e]
        [?page :block/uid ?pid]
        [?b :block/uid ?uid]
        (ancestor ?b ?page)
    ]
    `,
      lowLevelBlocks,
      ancestorrule
    ) as unknown as [string, string][];
    const mapped = pageUidBlockUidAry.reduce((p, [pageUid, blockUid]) => {
      if (p.has(pageUid)) {
        p.get(pageUid).push(blockUid);
      } else {
        p.set(pageUid, [blockUid]);
      }
      return p;
    }, new Map<string, string[]>());
    const result: { page: string; children: string[] }[] = [];
    for (let item of mapped) {
      const [key, values] = item;
      result.push({
        // page: pull(key),
        page: key,
        // children: pull_many(values),
        children: values,
      });
      //  key;
    }
    return result;
  }

  async function findAllRelatedBlocks(keywords: string[]) {
    const topLevelBlocks = findBlocksContainsAllKeywords(keywords);
    if (keywords.length <= 1) {
      return [topLevelBlocks, undefined] as const;
    }
    // const allRelatedGenerator = timeSlice_(findAllRelatedBlockGroupByPages);
    console.log("find low");

    let lowBlocks = getAllBlocks().filter((b) => {
      return !topLevelBlocks.find((tb) => tb[":block/uid"] === b[":block/uid"]);
    });

    // keywords.forEach((keyword) => {
    //   lowBlocks.filter((item) => {
    //     return includes(item[":block/uid"], keyword);
    //   });
    // });

    const validateMap = new Map<string, boolean[]>();

    lowBlocks = lowBlocks.filter((item) => {
      return keywords.every((keyword, index) => {
        const r = includes(item[":block/string"], keyword);
        if (!validateMap.has(item.page)) {
          validateMap.set(item.page, []);
        }
        validateMap.get(item.page)[index] = r;
        return r;
      });
    });

    lowBlocks = lowBlocks.filter((block) => {
      return validateMap.get(block.page).every((v) => v);
    });
    // console.log(keywords, validateMap, lowBlocks);

    const map = new Map<string, PullBlock[]>();
    lowBlocks.forEach((b) => {
      if (map.has(b.page)) {
        map.get(b.page).push(b);
      } else {
        map.set(b.page, [b]);
      }
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
      if (config.uids?.length) {
        if (!config.uids.some((uid) => page[":block/uid"] === uid)) {
          return false;
        }
      }
      const r = keywords.every((keyword) => {
        return includes(page[":node/title"], keyword);
      });
      return r;
    });
  }
  const { search } = config;
  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const ary = search;
  console.log(search.length, config, "rule =", conditionRule, " startting ");
  const promise = Promise.all([
    findAllRelatedPageUids(ary),
    findAllRelatedBlocks(ary),
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
