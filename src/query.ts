import { PullBlock } from "roamjs-components/types";
import { debounce } from "./helper";

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

const pull = (uid: string) => {
  return window.roamAlphaAPI.data.pull("[*]", [":block/uid", uid]);
};

const pull_many = (uids: string[]) => {
  return window.roamAlphaAPI.data.pull_many(
    "[*]",
    uids.map((uid) => {
      return [":block/uid", uid];
    })
  );
};
const findAllRelatedBlocksInPages = (generator: {
  find(): string;
  where(): string;
  pages: string[];
}) => {
  return window.roamAlphaAPI.q(
    `[
  :find ${generator.find()} ?page
  :in $ % [?page ...]
  :where
    
    [?ancestor :block/uid ?page]
    ${generator.where()}
  ]`,
    ancestorrule,
    generator.pages
  );
};

const findAllRelatedPages = (keywords: string[]): string[] => {
  // TODO:
  const pages = keywords.reduce((p, c) => {
    const result = window.roamAlphaAPI.data.fast.q(`
        [
            :find [?uid ...]
            :where
                [?b :block/string ?s]
                [?b :block/parents ?p]
                [(clojure.string/includes? ?s  "${c}")]
                [?p :node/title ?t]
                [?p :block/uid ?uid]
        ]
    `) as unknown as string[];
    return Array.from(new Set([...result, ...p]));
  }, [] as string[]);
  console.log(pages);
  return pages;
};

const findAllRelatedBlocks = (keywords: string[]) => {
  const find = () => {
    return keywords.map((s, i) => `?uid${i}`).join(" ");
  };

  const where = () => {
    return keywords
      .map((s, i) => {
        return `[?block${i} :block/string ?s${i}]
       [?block${i} :block/uid ?uid${i}]
       (ancestor ?block${i} ?ancestor)
       [(clojure.string/includes? ?s${i}  "${s}")]
      `;
      })
      .join(" ");
  };
  const pages = findAllRelatedPages(keywords);
  return findAllRelatedBlocksInPages({
    find,
    where,
    pages,
  });
};

const findAllRelatedPageUids = (keywords: string[]) => {
  const uids = window.roamAlphaAPI.data.q(`
        [
            :find [?uid ...]
            :where
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${keywords[0]}")]
        ]
    `);
  return keywords.slice(1).reduce((p, c) => {
    return window.roamAlphaAPI.data.q(
      `
        [
            :find [?uid ...]
            :in $ [?uid ...]
            :where
                [?b :block/uid ?uid]
                [?b :node/title ?s]
                [(clojure.string/includes? ?s  "${c}")]
        ]
            `,
      p
    );
  }, uids) as unknown as string[];
};

export const Query = debounce(async (search: string) => {
  const ary = search.trim().split(" ");

  if (!search || search.trim() === "") {
    return undefined;
  }
  console.log(search.length, ary, " startting ");
  const [pageUids, blockAryUids] = await Promise.all([
    findAllRelatedPageUids(ary),
    findAllRelatedBlocks(ary),
  ]);
  console.log(" midding ");
  let controller = new AbortController();
  new Promise((resolve, reject) => {});
  const pageBlocks = pull_many(pageUids);
  const set = new Set<string>();
  let result = blockAryUids
    // 结果中包含最低符合层级和其 parents 级的数据, 除了最低层级外的都要清理掉.
    .filter((uids) => {
      const key = uids.slice(0, -1).join(",");
      if (set.has(key)) {
        return false;
      }
      set.add(key);
      return true;
    });
  // 如果除了最后一位, 其他的都相等, 证明是同一 block 中包含所有的查询字符, 提升其匹配级别.
  const topLevelBlocks = result.filter((uids) => {
    const isSame = uids
      .slice(0, -1)
      .every((id, index, array) => id === array[0]);
    return isSame;
  });
  // .map((uids) => uids[0]);

  const lowLevelBlocks = result.filter((uids) => {
    const isSame = uids
      .slice(0, -1)
      .every((id, index, array) => id === array[0]);
    return !isSame;
  });

  console.log("before end");
  // const blocks = await Promise.all([
  //   topLevelBlocks.map((uids) => {
  //     const uid = uids[0];
  //     const target = pull(uid);
  //     const parents = getParentsInfoOfBlockUid(uid);
  //     return {
  //       text: target[":block/string"] || target[":node/title"],
  //       paths: parents.map(
  //         (item) => item[":block/string"] || item[":node/title"]
  //       ),
  //       children: [],
  //       uid,
  //       createTime: target[":create/time"],
  //       editTime: target[":edit/time"],
  //       //   user: target[":create/user"]
  //     };
  //   }),
  //   lowLevelBlocks.map((uids) => {
  //     const uid = uids.slice(-1)[0];
  //     const target = pull(uid);
  //     const parents = getParentsInfoOfBlockUid(uid);
  //     const children = pull_many(uids.slice(0, -1));
  //     return {
  //       text: target[":block/string"] || target[":node/title"],
  //       paths: parents.map(
  //         (item) => item[":block/string"] || item[":node/title"]
  //       ),
  //       children: children.map((item) => item[":block/string"]),
  //       uid,
  //       createTime: target[":create/time"],
  //       editTime: target[":edit/time"],
  //       //   user: target[":create/user"]
  //     };
  //   }),
  // ]);
  return [pageBlocks, [topLevelBlocks, lowLevelBlocks]];
});
