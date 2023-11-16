import { PullBlock } from "roamjs-components/types";

type RefsPullBlock = PullBlock & {
  ":block/_refs": { id: number }[];
  ":block/_children": RefsPullBlock[];
  relatedRefs: number[];
  ":block/refInstances"?: PullBlock[];
};

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
  //  console.log(uid, result, ' paths ')
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
  block: RefsPullBlock;
  page: string;
  isBlock: boolean;
};

let CACHE_PAGES: Map<string, CacheBlockType> = new Map();
let CACHE_BLOCKS: Map<string, CacheBlockType> = new Map();
let CACHE_BLOCKS_BY_ID: Map<number, RefsPullBlock> = new Map();
let CACHE_PAGES_BY_ID: Map<number, PullBlock> = new Map();
let CACHE_USERS: Map<string, User> = new Map();
let CACHE_BLOCK_REFERENCES: Map<string, string> = new Map();

export const getAllData = () => {
  return [...ALLBLOCKS.values()];
};
export const getAllUsers = () => {
  return [...CACHE_USERS.values()];
};

export const getAllPages = () => {
  return [...CACHE_PAGES.values()];
};
export const getAllBlocks = () => {
  return [...CACHE_BLOCKS.values()];
};

function blockEnhance(
  block: RefsPullBlock,
  page: string,
  config: { blockRefToString: boolean }
) {
  if (!block[":block/string"]) {
    return;
  }

  CACHE_BLOCKS_BY_ID.set(block[":db/id"], block);

  if (config.blockRefToString) {
    const replacedString = replaceBlockReference(block[":block/string"]);
    block = new Proxy(block, {
      get(target, prop, receiver) {
        if (prop === ":block/string") {
          return replacedString;
        }
        return Reflect.get(target, prop);
      },
    });
  }
  if (block[":block/refs"]) {
    block = new Proxy(block, {
      get(target, prop, receiver) {
        if (prop === ":block/refInstances") {
          return replaceRefsIdToObj(block[":block/refs"]);
        }
        return Reflect.get(target, prop);
      },
    });
  }
  const b = {
    block,
    page: page,
    isBlock: true,
  };
  CACHE_BLOCKS.set(b.block[":block/uid"], b);
}

const PullStr = `:block/string 
      :node/title 
      :block/uid 
      :block/order 
      :block/heading 
      :block/open 
      :children/view-type
      :block/text-align
      :edit/time 
      :block/props
      :block/parents
      :block/_refs
      :block/refs
      :create/time
      :create/user
      :db/id
`;

export const isUnderTag = (tags: number[], item: RefsPullBlock) => {
  const relatedRefs = item[":block/refs"]?.map((item) => item[":db/id"]) || [];

  item[":block/parents"]?.forEach((p) => {
    relatedRefs.push(
      ...(CACHE_BLOCKS_BY_ID.get(p[":db/id"])?.[":block/refs"]?.map(
        (ref) => ref[":db/id"]
      ) || [])
    );
  });
  const result = tags.some((tag) => relatedRefs.some((ref) => +ref === +tag));
  if (result) {
    // console.log(relatedRefs, ' ----- ', tags, {...item},
    //   item[":block/parents"]?.map((p) => {
    //     return { ...CACHE_BLOCKS_BY_ID.get(p[":db/id"]) };
    //   })
    // )
  }
  return result;
};

export const initCache = (config: { blockRefToString: boolean }) => {
  CACHE_BLOCKS.clear();
  CACHE_PAGES.clear();
  CACHE_USERS.clear();
  CACHE_BLOCKS_BY_ID.clear();
  CACHE_BLOCK_REFERENCES.clear();
  CACHE_PAGES_BY_ID.clear();
  ALLBLOCKS.clear();
  //

  // 页面在前, refs 需要指向
  (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find [(pull ?e [${PullStr}]) ...]
            :where                
                [?e :node/title]
        ]
    `
    ) as unknown as RefsPullBlock[]
  ).map((item) => {
    const b = {
      block: item,
      page: item[":node/title"],
      isBlock: false,
    };
    ALLBLOCKS.set(item[":block/uid"], item);
    CACHE_BLOCKS_BY_ID.set(item[":db/id"], item);
    CACHE_PAGES.set(b.block[":block/uid"], b);
    CACHE_PAGES_BY_ID.set(item[":db/id"], item);
  });

  (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find (pull ?e [${PullStr}]) ?e2
            :where                
                [?e :block/page ?p]
                [?p :block/uid ?e2]
        ]
    `
    ) as unknown as []
  ).forEach((item) => {
    ALLBLOCKS.set(item[0][":block/uid"], item[0]);
    blockEnhance(item[0], item[1], config);
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

export const renewCache2 = (config: { blockRefToString: boolean }) => {
  // 找到今日修改过的所有 block 和 page, users
  // 将其插入到 allBlocks 中
  console.time("renew");
  (
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
  ).forEach((item) => {
    blockEnhance(item[0], item[1], config);
    ALLBLOCKS.set(item[":block/uid"], item);
  });

  (
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
    ) as unknown as RefsPullBlock[]
  )
    .map((item) => {
      CACHE_BLOCKS_BY_ID.set(item[":db/id"], item);
      CACHE_PAGES_BY_ID.set(item[":db/id"], item);
      ALLBLOCKS.set(item[":block/uid"], item);

      return {
        block: item,
        page: item[":node/title"],
        isBlock: false,
      };
    })
    .forEach((b) => {
      CACHE_PAGES.set(b.block[":block/uid"], b);
    });

  (
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
      console.log(item, " - item");
      let ary = item?.[":block/_children"];
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
  return !!window.roamAlphaAPI.q(
    `[:find ?e . :where [?e :block/uid "${uid}"] [?e :node/title]]`
  );
}

export function replaceBlockReference(source: string) {
  const refReg = /(\(\((.{9,})\)\))/gi;
  let lastIndex = 0;
  let result = "";
  while (true) {
    const match = refReg.exec(source);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = source.slice(lastIndex, refReg.lastIndex - length);
    if (before.length > 0) {
      result += before;
    }
    lastIndex = refReg.lastIndex;
    // console.log(match, result, lastIndex, source);
    result += getRefStringByUid(match[2]);
  }
  // console.log(source, " -- source");
  const rest = source.slice(lastIndex);
  if (rest) {
    result += rest;
  }
  return result;
}

function getRefStringByUid(uid: string) {
  const block = window.roamAlphaAPI.pull("[:block/string]", [
    ":block/uid",
    uid,
  ]);
  return block ? block[":block/string"] : "";
}

function replaceRefsIdToObj(args: { ":db/id": number }[]) {
  const r = args.map((item) => {
    const page = CACHE_PAGES_BY_ID.get(item[":db/id"]);
    if (!page) debugger;
    return page;
  });
  console.log(
    CACHE_PAGES_BY_ID.entries(),
    "CACHE_PAGES_BY_ID",
    args,
    " = r ",
    r
  );

  return r;
}
