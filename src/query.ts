import { PullBlock } from "roamjs-components/types";
import { debounce, getDiff, getSame, pull, pull_many } from "./helper";

let conditionRule = "";

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
}) => {
  console.time("SSSS");
  const { search } = config;
  const ary = search

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

  const conditionRuleQuery = (uids: string[]) => {
    console.log("q-", uids);
    return window.roamAlphaAPI.data.fast.q(
      `
    [
      :find ?uid
      :in $ % [?uid ...]
      :where
        [?b :block/uid ?uid]
        
    ]
  `,
      conditionRule,
      uids
    );
  };
  const ancestorrule = `[ 
   [ (ancestor ?child ?parent) 
        [?parent :block/children ?child] ]
   [ (ancestor ?child ?a) 
        [?parent :block/children ?child ] 
        (ancestor ?parent ?a) ] ] ]`;

  const findBlocksContainsAllKeywords = (keywords: string[]) => {
    return keywords.reduce((p, c, index) => {
      const r = window.roamAlphaAPI.data.fast.q(
        `
        [
            :find  [?uid ...]
            :in $ %
            :where
                
                [?b :block/string ?s]
                [?b :block/uid ?uid]
                [(clojure.string/includes? ?s  "${c}")]
        ]
      `,
        conditionRule
      ) as unknown as string[];
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
    let pages: string[];
    for (let keyword of keywords) {
      const result = window.roamAlphaAPI.data.fast.q(
        `
        [
            :find [?uid ...]
            :in $ %
            :where
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${keyword}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
                
        ]
    `,
        conditionRule
      ) as unknown as string[];
      yield result;
      console.log("key word", keyword);
      if (pages === undefined) {
        pages = result;
      } else {
        pages = getSame(pages, result);
      }
    }
    // const pages = keywords.reduce((p, c, index) => {

    // }, [] as string[]);
    return pages;
  }

  function* findAllRelatedBlockGroupByPages(
    keywords: string[],
    topLevelBlocks: string[]
  ) {
    console.log(" ---000-==");
    const allRelatedPagesGenerator = timeSlice_(findAllRelatedPages);
    const pages = yield* allRelatedPagesGenerator(keywords);
    console.log(" ---111-==, ", Date.now());
    const blocksInSamePage = yield* findBlocksContainsStringInPages(
      keywords,
      pages
    );
    // 找到正好包含所有 keywords 的 block. 记录下来
    console.log(" ---222-==", Date.now());
    const lowLevelBlocks = getDiff(topLevelBlocks, blocksInSamePage);
    console.log(" ---333-==", Date.now());

    // 找到 相同 page 下满足条件的 block
    const pageUidBlockUidAry = window.roamAlphaAPI.q(
      `
    [
      :find ?pid ?uid
      :in $ [?uid ...] %
      :where
        [?page :node/title ?pid]
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
    const result: { page: PullBlock; children: PullBlock[] }[] = [];
    for (let item of mapped) {
      const [key, values] = item;
      result.push({
        page: pull(key),
        children: pull_many(values),
      });
      yield key;
    }
    return result;
  }

  const findAllRelatedBlocks = async (keywords: string[]) => {
    const topLevelBlocks = findBlocksContainsAllKeywords(keywords);
    if (keywords.length <= 1) {
      return [topLevelBlocks, undefined] as const;
    }
    const allRelatedGenerator = timeSlice_(findAllRelatedBlockGroupByPages);
    console.log("find low");
    return [
      topLevelBlocks,
      await allRelatedGenerator(keywords, topLevelBlocks),
    ] as const;
  };

  function* findAllRelatedPageUids(keywords: string[]) {
    let result: string[];

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
  console.log(search.length, config, "rule =", conditionRule, " startting ");
  const allRelatedPageUidsGenerator = timeSlice_(findAllRelatedPageUids);
  const promise = Promise.all([
    allRelatedPageUidsGenerator(ary),
    findAllRelatedBlocks(ary),
  ]);
  console.log("end!!!!!!");
  console.timeEnd("SSSS");

  return {
    promise: promise.then(([pageUids, [topLevelBlocks, lowLevelBlocks]]) => {
      const pageBlocks = pull_many(pageUids);

      return [
        pageBlocks,
        pull_many(topLevelBlocks),
        //   .map((item) => {
        //   return {
        //     ...item,
        //     parents: getParentsInfoOfBlockUid(item[":block/uid"]),
        //   };
        // }),
        lowLevelBlocks as unknown as {
          page: PullBlock,
          children: PullBlock[]
        }[],
      ] as const;
    }),
    cancel: () => {
      cancelRef.current = true;
    },
  };
};
