import { debounce, getDiff, getSame, pull_many } from "./helper";

let conditionRule = "";

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
                (condition ?b)
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
  pages: string[]
) => {
  const result = keywords.reduce((p, c, index) => {
    const result = window.roamAlphaAPI.data.fast.q(
      `
        [
            :find  [?uid ...]
            :in $  [?page ...] %
            :where
                (condition ?b)
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

const findAllRelatedPages = (keywords: string[]): string[] => {
  const pages = keywords.reduce((p, c, index) => {
    const result = window.roamAlphaAPI.data.fast.q(
      `
        [
            :find [?uid ...]
            :in $ % %2
            :where
                (condition ?b)
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${c}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
        ]
    `,
      ancestorrule,
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

const findAllRelatedBlockGroupByPages = (
  keywords: string[],
  topLevelBlocks: string[]
) => {
  const pages = findAllRelatedPages(keywords);
  const blocksInSamePage = findBlocksContainsStringInPages(keywords, pages);
  // 找到正好包含所有 keywords 的 block. 记录下来
  // console.log(blocksInSamePage, topLevelBlocks, " ----==", pages);
  const lowLevelBlocks = getDiff(topLevelBlocks, blocksInSamePage);
  const pageUidBlockUidAry = window.roamAlphaAPI.q(
    `
    [
      :find ?pid ?uid
      :in $ [?uid ...] % %2 
      :where
        (condition ?b)
        [?page :node/title ?pid]
        [?b :block/uid ?uid]
        (ancestor ?b ?page)
    ]
    `,
    lowLevelBlocks,
    ancestorrule,
    conditionRule
  ) as unknown as [string, string][];
  const mapped = pageUidBlockUidAry.reduce((p, [pageUid, blockUid]) => {
    if (p.has(pageUid)) {
      p.get(pageUid).push(blockUid);
    } else {
      p.set(pageUid, [blockUid]);
    }
    return p;
  }, new Map<string, string[]>());
  console.log(mapped, " ---pages---");
  return mapped;
};

const findAllRelatedBlocks = (keywords: string[]) => {
  const topLevelBlocks = findBlocksContainsAllKeywords(keywords);
  if (keywords.length <= 1) {
    return [topLevelBlocks];
  }

  return [
    topLevelBlocks,
    findAllRelatedBlockGroupByPages(keywords, topLevelBlocks),
  ] as const;
};

const findAllRelatedPageUids = (keywords: string[]) => {
  const uids = window.roamAlphaAPI.data.q(
    `
        [
            :find [?uid ...]
            :in $ %
            :where
                (condition ?b)
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${keywords[0]}")]
        ]
    `,
    conditionRule
  );
  return keywords.slice(1).reduce((p, c) => {
    return window.roamAlphaAPI.data.q(
      `
        [
            :find [?uid ...]
            :in $ % [?uid ...]
            :where
                (condition ?b)
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

export const Query = debounce(
  async (config: {
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
    const [pageUids, [topLevelBlocks, lowLevelBlocks]] = await Promise.all([
      findAllRelatedPageUids(ary),
      findAllRelatedBlocks(ary),
    ]);
    const pageBlocks = pull_many(pageUids);
    return [pageBlocks, pull_many(topLevelBlocks), lowLevelBlocks] as const;
    // return [pageUids]
  }
);
