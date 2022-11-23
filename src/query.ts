import { PullBlock } from "roamjs-components/types";
import { debounce, getDiff, getSame, pull, pull_many } from "./helper";

type Fn = () => void;
let conditionRule = "";

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

const checkCancel = (cancelRef: { cancel: boolean }) => {
  return () => {
    if (cancelRef.cancel) {
      throw new Error("Cancel!");
    }
  };
};
const findBlocksContainsAllKeywords = (keywords: string[], checkFn: Fn) => {
  return keywords.reduce((p, c, index) => {
    checkFn();
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

const findBlocksContainsStringInPages = (
  keywords: string[],
  pages: string[],
  checkFn: Fn
) => {
  const result = keywords.reduce((p, c, index) => {
    checkFn();
    const result = window.roamAlphaAPI.data.fast.q(
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
    );
    if (index === 0) {
      return result;
    }
    if (result.length === 0) {
      return result;
    }
    return Array.from(new Set([...result, ...p]));
  }, [] as string[]);

  return result;
};

const findAllRelatedPages = (keywords: string[], checkFn: Fn): string[] => {
  const pages = keywords.reduce((p, c, index) => {
    checkFn();
    const result = window.roamAlphaAPI.data.fast.q(
      `
        [
            :find [?uid ...]
            :in $ %
            :where
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${c}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
                
        ]
    `,
      conditionRule
    ) as unknown as string[];
    if (index === 0) {
      return result;
    }
    return getSame(p, result);
  }, [] as string[]);
  console.log(pages, " [ages");
  return pages;
};

const findAllRelatedBlockGroupByPages = async (
  keywords: string[],
  topLevelBlocks: string[],
  checkFn: Fn
) => {
  checkFn();
  console.log(" ---000-==");
  const pages = findAllRelatedPages(keywords, checkFn);
  console.log(" ---111-==, ", Date.now());
  const blocksInSamePage = findBlocksContainsStringInPages(
    keywords,
    pages,
    checkFn
  );
  // 找到正好包含所有 keywords 的 block. 记录下来
  console.log(" ---222-==", Date.now());
  const lowLevelBlocks = await getDiff(topLevelBlocks, blocksInSamePage);
  console.log(" ---333-==", Date.now());
  checkFn();
  // 找到 相同 page 下满足条件的 block
  const pageUidBlockUidAry = (await window.roamAlphaAPI.q(
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
  )) as unknown as [string, string][];
  const mapped = pageUidBlockUidAry.reduce((p, [pageUid, blockUid]) => {
    checkFn();
    if (p.has(pageUid)) {
      p.get(pageUid).push(blockUid);
    } else {
      p.set(pageUid, [blockUid]);
    }
    return p;
  }, new Map<string, string[]>());
  const result: { page: PullBlock; children: PullBlock[] }[] = [];
  for (let item of mapped) {
    checkFn();
    const [key, values] = item;
    result.push({
      page: pull(key),
      children: pull_many(values),
    });
  }
  return result;
};

const findAllRelatedBlocks = (keywords: string[], checkFn: Fn) => {
  const topLevelBlocks = findBlocksContainsAllKeywords(keywords, checkFn);
  if (keywords.length <= 1) {
    return [topLevelBlocks, undefined] as const;
  }
  console.log("find low");
  return [
    topLevelBlocks,
    findAllRelatedBlockGroupByPages(keywords, topLevelBlocks, checkFn),
  ] as const;
};

const findAllRelatedPageUids = (keywords: string[], checkFn: Fn) => {
  checkFn();
  const uids = window.roamAlphaAPI.data.q(
    `
        [
            :find [?uid ...]
            :in $ %
            :where
                
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${keywords[0]}")]
        ]
    `,
    conditionRule
  );
  return keywords.slice(1).reduce((p, c) => {
    checkFn();
    return window.roamAlphaAPI.data.q(
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
      p
    );
  }, uids) as unknown as string[];
};

export const getParentsInfoOfBlockUid = (uid: string) => {
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
  search: string;
  modificationDate?: SelectDate;
  creationDate?: SelectDate;
}) => {
  const { search } = config;
  const ary = search.trim().split(" ");

  if (!search || search.trim() === "") {
    return undefined;
  }
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
  console.log(search.length, config, "rule =", conditionRule, " startting ");
  let cancelRef = {
    cancel: false,
  };
  const checkFn = checkCancel(cancelRef);
  const then = Promise.all([
    findAllRelatedPageUids(ary, checkFn),
    findAllRelatedBlocks(ary, checkFn),
  ]).then(([pageUids, [topLevelBlocks, lowLevelBlocks]]) => {
    if (cancelRef.cancel) {
      throw new Error("cancel");
    }
    return [
      pull_many(pageUids),
      pull_many(topLevelBlocks),
      lowLevelBlocks,
    ] as const;
  });
  console.log("end!!!!!!");
  return {
    then: (cb: any) => {
      then.then(cb);
    },
    cancel: () => {
      cancelRef.cancel = true;
    },
  };
};
