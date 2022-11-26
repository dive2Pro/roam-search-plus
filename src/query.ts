import { PullBlock } from "roamjs-components/types";
import { debounce, getDiff, getSame, pull, pull_many } from "./helper";
import { getBlocksContainsStr } from "./roam";

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
}) => {
  console.time("SSSS");

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
    return keywords.reduce((p, c, index) => {
      let queryArgs = [
        `
        [
            :find  [?uid ...]
            :in $ 
            :where

                [?b :block/string ?s]
                [?b :block/uid ?uid]
                [(clojure.string/includes? ?s  "${c}")]
        ]
      `,
      ] as [string, string[]] | [string];
      if (config.uids?.length) {
        queryArgs = [
          `
        [
            :find  [?uid ...]
            :in $ [?page ...]
            :where
                [?b :block/page ?p]
                [?p :block/uid ?page]
                [?b :block/string ?s]
                [?b :block/uid ?uid]
                [(clojure.string/includes? ?s  "${c}")]
        ]
      `,
          config.uids,
        ];
      }

      const r = window.roamAlphaAPI.data.fast.q.apply(
        null,
        queryArgs
      ) as unknown as string[];
      console.log(r, " = r");
      if (index === 0) {
        return r;
      }
      return getSame(p, r);
    }, [] as string[]);
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
    if (config.uids && config.uids.length) {
      console.log("only uids", config.uids);
      return config.uids;
    }
    let pages: string[];
    for (let keyword of keywords) {
      const result = window.roamAlphaAPI.data.fast.q(
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
    `
      ) as unknown as string[];
      yield result;
      console.log(result, " -------@@", keywords, keyword, pages);
      if (pages === undefined) {
        pages = result;
      } else {
        pages = getSame(pages, result);
      }
    }
    // const pages = keywords.reduce((p, c, index) => {
    console.log("pages = ", pages);
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
    console.log(" ---111-==, ", Date.now(), pages);
    const allRelatedBlockGroupByPages = timeSlice_(
      findBlocksContainsStringInPages
    );
    const blocksInSamePage = await allRelatedBlockGroupByPages(keywords, pages);
    // 找到正好包含所有 keywords 的 block. 记录下来
    console.log(" ---222-==", Date.now(), pages, blocksInSamePage);
    const lowLevelBlocks = getDiff(topLevelBlocks,blocksInSamePage);
    // getDiff(topLevelBlocks, blocksInSamePage);
    console.log(" ---333-==", Date.now());

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
    const allRelatedGenerator = timeSlice_(findAllRelatedBlockGroupByPages);
    console.log("find low");
    return [
      topLevelBlocks,
      (await allRelatedGenerator(keywords, topLevelBlocks)) as {
        page: string;
        children: string[];
      }[],
    ] as const;
  }

  function* findAllRelatedPageUids(keywords: string[]) {
    let result: string[];
    // TODO: 优化流程处理
    if (config.uids.length) {
      return config.uids;
    }
    for (let c of keywords) {
      if (result === undefined) {
        result = window.roamAlphaAPI.data.q(
          `
        [
            :find [?uid ...]
            :in $ %
            :where
                
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${c}")]
        ]
    `,
          conditionRule
        ) as unknown as string[];
      } else {
        result = window.roamAlphaAPI.data.q(
          `
        [
            :find [?uid ...]
            :in $ % [?uid ...]
            :where
                
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${c}")]
        ]
            `,
          conditionRule,
          result
        ) as unknown as string[];
      }
      yield result;
    }
    return result;
  }
  const { search } = config;
  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const ary = search;
  console.log(search.length, config, "rule =", conditionRule, " startting ");
  const allRelatedPageUidsGenerator = timeSlice_(findAllRelatedPageUids);
  const promise = Promise.all([
    allRelatedPageUidsGenerator(ary),
    findAllRelatedBlocks(ary),
  ]);

  return {
    promise: promise.then(
      ([pageUids, [topLevelBlocks, lowLevelBlocks = []]]) => {
        const result = [
          pull_many(pageUids),
          // pageUids,
          pull_many(topLevelBlocks),
          // topLevelBlocks,
          //   .map((item) => {
          //   return {
          //     ...item,
          //     parents: getParentsInfoOfBlockUid(item[":block/uid"]),
          //   };
          // }),
          lowLevelBlocks.map((item) => {
            return {
              page: pull(item.page),
              children: pull_many(item.children),
            };
          }),

          // lowLevelBlocks,
        ] as const;
        console.log("end!!!!!!");
        console.timeEnd("SSSS");

        return result;
      }
    ),
    cancel: () => {
      cancelRef.current = true;
    },
  };
};
