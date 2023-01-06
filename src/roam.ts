import { PullBlock } from "roamjs-components/types";

type ReversePullBlock = {
  ":block/uid": string;
  ":block/string": string;
  ":node/title": string;
  ":block/_children": ReversePullBlock[];
};

export const getParentsStrFromBlockUid = (uid: string) => {
  const result = window.roamAlphaAPI.pull(
    `
        [
            :block/uid
            :block/string
            :node/title
            {:block/_children ...}
        ]
    `,
    [":block/uid", `${uid}`]
  ) as unknown as ReversePullBlock;

  if (result) {
    let strs: string[] = [];
    let ary = result[":block/_children"];
    while (ary && ary.length) {
      const block = ary[0];
      strs.unshift(block[":block/string"] || block[":node/title"]);
      ary = block[":block/_children"];
    }
    return strs;
  }
  return [];
};

const cache = new Map<string, PullBlock[]>();

const cleanCache = () => {
  cache.clear();
};

let ALLBLOCKS: Map<string, PullBlock> = new Map();
let PAGES: PullBlock[] = [];
type BlockWithPage = PullBlock & { page: string };
let BLOCKS: BlockWithPage[] = [];
let USERS: User[] = [];

export type CacheBlockType = {
  block: PullBlock;
  page: string;
  isBlock: boolean;
};

let CACHE_PAGES: Map<string, CacheBlockType> = new Map();
let CACHE_BLOCKS: Map<string, CacheBlockType> = new Map();
let CACHE_USERS: Map<string, User> = new Map();

export const getAllUsers = () => {
  // return USERS;
  return [...CACHE_USERS.values()];
};

export const getAllPages = () => {
  // return PAGES;
  return [...CACHE_PAGES.values()];
};
export const getAllBlocks = () => {
  // return BLOCKS;
  return [...CACHE_BLOCKS.values()];
};

export const initCache = () => {
  CACHE_BLOCKS.clear();
  CACHE_PAGES.clear();
  CACHE_USERS.clear();
  (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find (pull ?e [*]) ?e2
            :where                
                [?e :block/page ?p]
                [?p :block/uid ?e2]
        ]
    `
    ) as unknown as []
  ).forEach((item) => {
    const b = {
      block: item[0] as PullBlock,
      page: item[1],
      isBlock: true,
    };
    CACHE_BLOCKS.set(b.block[":block/uid"], b);
  });

  (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find [(pull ?e [*]) ...]
            :where                
                [?e :node/title]
        ]
    `
    ) as unknown as PullBlock[]
  ).map((item) => {
    const b = {
      block: item,
      page: item[":node/title"],
      isBlock: false,
    };
    CACHE_PAGES.set(b.block[":block/uid"], b);
  });
  const userIds = window.roamAlphaAPI.data.fast.q(
    `
    [
          :find [(pull ?cu [*])...]
          :where
           [?b :block/uid]
           [?b :create/user ?cu]
        ]
    `
  ) as unknown as User[];

  userIds
    .filter((user) => user[":user/display-name"])
    .forEach((user) => {
      CACHE_USERS.set(user[":db/id"], user);
    });
};

export const renewCache2 = () => {
  // 找到今日修改过的所有 block 和 page, users
  // 将其插入到 allBlocks 中
  console.time("renew");
  const todayChangedBlocks = (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find (pull ?e [*]) ?e2 
            :in $ ?start_of_day
            :where                
                [?e :edit/time ?time]
                [(> ?time ?start_of_day)]
                [?e :block/page ?p]
                [?p :block/uid ?e2]
              
        ]
    `,
      new Date().setHours(0, 0, 0, 0)
    ) as unknown as []
  )
    .map((item) => ({
      block: item[0] as PullBlock,
      page: item[1],
      isBlock: true,
    }))
    .forEach((b) => {
      CACHE_BLOCKS.set(b.block[":block/uid"], b);
    });

  const todayChangedPages = (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find [(pull ?e [*]) ...]
            :in $ ?start_of_day 
            :where                
                [?e :edit/time ?time]
                [(> ?time ?start_of_day)]
                [?e :node/title]
        ]
    `,
      new Date().setHours(0, 0, 0, 0)
    ) as unknown as PullBlock[]
  )
    .map((item) => {
      return {
        block: item,
        page: item[":node/title"],
        isBlock: false,
      };
    })
    .forEach((b) => {
      CACHE_PAGES.set(b.block[":block/uid"], b);
    });

  const todayEditUsers = (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find [(pull ?user [*])  ...]
            :in $ ?start_of_day 
            :where                
                [?e :edit/time ?time]
                [(> ?time ?start_of_day)]
                [?e :create/user ?user]
                [?e :block/uid]
        ]
    `,
      new Date().setHours(0, 0, 0, 0)
    ) as unknown as User[]
  ).forEach((user) => {
    CACHE_USERS.set(user[":db/id"], user);
  });
  console.timeEnd("renew");
};

export const renewCache = () => {
  ALLBLOCKS.clear();

  BLOCKS = (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find (pull ?e [*]) ?e2
            :where                
                [?e :block/page ?p]
                [?p :block/uid ?e2]
        ]
    `
    ) as unknown as []
  ).map((item) => ({
    ...(item[0] as PullBlock),
    page: item[1],
  }));
  PAGES = window.roamAlphaAPI.data.fast.q(
    `
    [
            :find [(pull ?e [*]) ...]
            :where                
                [?e :node/title]
        ]
    `
  ) as unknown as PullBlock[];
  const userIds = window.roamAlphaAPI.data.fast.q(
    `
    [
          :find [(pull ?cu [*])...]
          :where
           [?b :block/uid]
           [?b :create/user ?cu]
        ]
    `
  ) as unknown as User[];
  USERS = userIds.filter((user) => user[":user/display-name"]);
  // console.log(USERS.map(item=> ({...item})), '---');
  [...BLOCKS, ...PAGES].forEach((block) => {
    ALLBLOCKS.set(block[":block/uid"], block);
  });
  // console.log(BLOCKS.length, PAGES.length);
  //   (
  //     window.roamAlphaAPI.data.fast.q(
  //       `
  //     [
  //             :find [(pull ?e [*]) ...]
  //             :where
  //                 [?e :block/uid ?u]
  //         ]
  //     `
  //     ) as PullBlock[]
  //   ).forEach((block) => {
  //     ALLBLOCKS.set(block[":block/uid"], block);
  //     if (block[":block/page"]) {
  //       BLOCKS.push({
  //         ...block,
  //         page: "",
  //       });
  //     } else {
  //       PAGES.push(block);
  //     }
  //   });
  // console.log(ALLBLOCKS);
};

export const getMe = () => {
  const uid = window.roamAlphaAPI.util.dateToPageUid(new Date());
  const result = window.roamAlphaAPI.data.fast.q(`
    [
      :find  (pull ?e [*]) .
      :where
        [?b :block/uid "${uid}"]
        [?b :create/user ?e]
    ]
  `) as unknown as User;
  return result;
};

export const getCacheByUid = (uid: string) => {
  if (CACHE_BLOCKS.has(uid)) {
    return CACHE_BLOCKS.get(uid);
  }
  return CACHE_PAGES.get(uid);
};

export const deleteFromCacheByUid = (uid: string) => {
  CACHE_BLOCKS.delete(uid);
  CACHE_PAGES.delete(uid);
};

// TODO: if api available 如果 graph 没有变化, 则 cache 不清空
const saveToCache = (k: string, blocks: PullBlock[]) => {
  cache.set(k, blocks);
  cleanCache();
};
const getFromCache = (k: string) => {
  return cache.get(k);
};

export const getBlocksContainsStr = (s: string) => {
  const cacheValue = getFromCache(s);
  if (cacheValue) {
    return cacheValue;
  }
  const result = window.roamAlphaAPI.data.fast.q(`
    [
            :find [(pull ?e [*]) ...]
            :where
                [?e :block/uid ?uid]
                [?b :block/string ?s]
                [(clojure.string/includes? ?s  "${s}")]
        ]
    `) as unknown as PullBlock[];
  saveToCache(s, result);
  return result;
};

export const getPageUidsFromUids = (uids: string[]) => {
  return window.roamAlphaAPI.q(
    `
        [
            :find [?e ...]
            :in $ [?uid ...]
            :where
                [?b :block/uid ?uid]
                [?b :block/page ?p]
                [?p :block/uid ?e]
        ]
        
    `,
    uids
  ) as unknown as string[];
};

export const getCurrentPage = async () => {
  const page = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  if (!page) {
    return null;
  }
  return window.roamAlphaAPI.pull("[*]", [":block/uid", page]);
};

const blockDeleted = (uid: string) => {
  return !!window.roamAlphaAPI.q(
    `[:find ?e . :where [?e :block/uid "${uid}"]]`
  );
};

export const opens = {
  main: {
    page(id: string) {
      window.roamAlphaAPI.ui.mainWindow.openPage({
        page: {
          uid: id,
        },
      });
      return blockDeleted(id);
    },
    block(id: string) {
      window.roamAlphaAPI.ui.mainWindow.openBlock({
        block: {
          uid: id,
        },
      });
    },
  },
  sidebar(id: string) {
    window.roamAlphaAPI.ui.rightSidebar.addWindow({
      window: {
        "block-uid": id,
        type: "block",
      },
    });
    return blockDeleted(id);
  },
};

export function findLowestParentFromBlocks(blocks: { uid: string }[]) {
  // 找到 blocks 的逆向parents: _refs
  const _parents = blocks
    .map((block) => {
      return window.roamAlphaAPI.pull(
        `
        [
            :block/uid
            :block/string
            :node/title
            {:block/_children ...}
        ]
    `,
        [":block/uid", `${block.uid}`]
      ) as unknown as ReversePullBlock;
    })
    .map((item) => {
      let result: ReversePullBlock[] = [item];
      let ary = item[":block/_children"];
      while (ary && ary.length) {
        const block = ary[0];
        result.unshift(block);
        ary = block[":block/_children"];
      }
      return result;
    })
    .filter((item) => item.length);
  let max = Math.min(..._parents.map((item) => item.length));
  let lowestParent: ReversePullBlock;
  let i = 0;
  lp: for (i = 0; i < max; i++) {
    const p1 = _parents[0][i];
    ip: for (let k = 1; p1 && k < _parents.length; k++) {
      const p = _parents[k][i];
      // console.log(p1, p);
      if (!p || !p1 || p1[":block/uid"] !== p[":block/uid"]) {
        break lp;
      }
    }
    lowestParent = p1;
  }
  // console.log(_parents, " = parents ", i, lowestParent);
  if (i <= 1 || !lowestParent) {
    return null;
  }
  // 找到 _refs 都出现过的index 最大的交集
  return window.roamAlphaAPI.pull("[*]", [
    ":block/uid",
    lowestParent[":block/uid"],
  ]);
}

export function isPageByUid(uid: string) {
  return !!window.roamAlphaAPI.q(`[:find ?e . :where [?e :block/uid "${uid}"] [?e :node/title]]`)
}