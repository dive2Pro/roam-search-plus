import { PullBlock } from "roamjs-components/types";
import { worker } from "./woker";
import { timer } from "./helper";
import { ReactNode } from "react";

export type RefsPullBlock = PullBlock & {
  ":block/_refs": { id: number }[];
  ":block/_children": RefsPullBlock[];
  relatedRefs: number[];
};

type ReversePullBlock = {
  ":block/uid": string;
  ":block/string": string;
  ":node/title": string;
  ":block/_children": ReversePullBlock[];
};


/**
 * 用于在渲染时, 获取 block 的 parents 的内容
 */
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
  //// console.log(uid, result, ' paths ')
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

const ALLBLOCK_PAGES: Map<string, PullBlock> = new Map();

export type CacheBlockType = {
  block: RefsPullBlock;
  page: string;
  isBlock: boolean;
};

let CACHE_PAGES: Map<string, CacheBlockType> = new Map();
let CACHE_BLOCKS: Map<string, CacheBlockType> = new Map();
let CACHE_BLOCKS_PAGES_BY_ID: Map<number, RefsPullBlock> = new Map();
let CACHE_PAGES_BY_ID: Map<number, PullBlock> = new Map();
let CACHE_USERS: Map<string, User> = new Map();

// 所有的被 ref 的 block
const CACHE_BLOCKS_REFS_BY_ID: Map<number, PullBlock> = new Map();
// 所有 block parents 中包含的 refs 的 id
const CACHE_PARENTS_REFS_BY_ID: Map<number, number[]> = new Map();

export const getPageById = (id: number) => {
  return CACHE_PAGES_BY_ID.get(id);
};

export const getAllData = () => {
  return Array.from(ALLBLOCK_PAGES.values());
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

function blockProxyRefString(block: RefsPullBlock, blockRefToString: boolean) {
  if (!block[":block/string"]) {
    return block;
  }

  let replacedString =  replaceBlockReference(block[":block/string"]);

  block = new Proxy(block, {
    get(target, prop, receiver) {
      if (prop === ":block/string") {
        if (blockRefToString) {
          return replacedString;
        }
      }
      return Reflect.get(target, prop);
    },
  });
  return block;
}

const PullStr = `
      :block/string 
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
      :block/children
      :block/refs
      :create/time
      :create/user
      :block/page
      :db/id
`;

export function queryWords(words: string[]) {
  const endTimer = timer(`WWQuery: ${words.join(",")}`);
  const processes = words.map((word) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        window.roamAlphaAPI.data.fast.q(`[
      :find [(pull ?e [${PullStr}]) ...]
      :where
        [?e :block/string ?block-string]
        [(clojure.string/includes? ?block-string "${word}")]
    ]`);
        resolve(1);
      });
    });
  });
  Promise.all(processes).then(() => {
    endTimer();
  });
}
export const isUnderTag = (tags: number[], item: RefsPullBlock) => {
  const relatedRefs = item[":block/refs"]?.map((item) => item[":db/id"]) || [];

  item[":block/parents"]?.forEach((p) => {
    relatedRefs.push(
      ...(CACHE_BLOCKS_PAGES_BY_ID.get(p[":db/id"])?.[":block/refs"]?.map(
        (ref) => ref[":db/id"]
      ) || [])
    );
  });
  const result = tags.some((tag) => relatedRefs.some((ref) => +ref === +tag));
  return result;
};

export const initCache = (config: { blockRefToString: boolean }) => {
  CACHE_BLOCKS.clear();
  CACHE_PAGES.clear();
  CACHE_USERS.clear();
  CACHE_BLOCKS_PAGES_BY_ID.clear();
  CACHE_PAGES_BY_ID.clear();
  ALLBLOCK_PAGES.clear();
  //
  const endPageTimer = timer("init page");
  // 页面在前处理, refs 需要有指向
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
      page: item[":block/uid"],
      isBlock: false,
    };
    ALLBLOCK_PAGES.set(item[":block/uid"], item);
    CACHE_BLOCKS_PAGES_BY_ID.set(item[":db/id"], item);
    CACHE_PAGES.set(b.block[":block/uid"], b);
    CACHE_PAGES_BY_ID.set(item[":db/id"], item);
  });
  endPageTimer();

  const endBlockTimer = timer("init block");
  const refsSet = new Set<number>();
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
    const refs = [...(item[0][":block/refs"] || [])];
    refs.forEach((ref) => {
      refsSet.add(ref[":db/id"]);
    });

    const proxiedBlock = blockProxyRefString(item[0], config.blockRefToString);
    const b = {
      block: proxiedBlock,
      page: item[1] as string,
      isBlock: true,
    };
    CACHE_BLOCKS_PAGES_BY_ID.set(b.block[":db/id"], b.block);
    CACHE_BLOCKS.set(b.block[":block/uid"], b);
    ALLBLOCK_PAGES.set(item[0][":block/uid"], b.block);
  });

  endBlockTimer();
  const endRefsSetCacheTimer = timer("init refs sets");
  [...refsSet.values()].forEach((id) => {
    if (!isPageId(id)) {
      CACHE_BLOCKS_REFS_BY_ID.set(id, CACHE_BLOCKS_PAGES_BY_ID.get(id));
    }
  });
  endRefsSetCacheTimer();
  const endFindBlockAllParentsRefs = timer("findBlockAllParentsRefs");
  findBlockAllParentsRefs();
  endFindBlockAllParentsRefs();

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

const lastestRenewTime = {
  value: new Date().setHours(0, 0, 0, 0),
  update: () => {
    lastestRenewTime.value = new Date().setHours(0, 0, 0, 0);
  },
};

export const renewCache2 = (config: { blockRefToString: boolean }) => {
  // 找到今日修改过的所有 block 和 page, users
  // 将其插入到 allBlocks 中
  console.time("renew");
  console.time("refs");
  const refsSet = new Set<number>();

  const newBlocks = (
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
      lastestRenewTime.value
    ) as unknown as []
  ).map((item) => {
    const refs = [...(item[0][":block/refs"] || [])].map((v) => v[":db/id"]);
    // console.log(refs, ' --- refs ')
    refs.forEach((ref) => {
      CACHE_BLOCKS_REFS_BY_ID.set(ref[":db/id"], ref);
      refsSet.add(ref);
    });

    const proxiedBlock = blockProxyRefString(item[0], config.blockRefToString);
    const b = {
      block: proxiedBlock,
      page: item[1],
      isBlock: true,
    };
    CACHE_BLOCKS_PAGES_BY_ID.set(b.block[":db/id"], b.block);
    CACHE_BLOCKS.set(b.block[":block/uid"], b);
    ALLBLOCK_PAGES.set(item[0][":block/uid"], b.block);
    return b;
  });
  console.timeEnd("refs");

  console.time("pages refs");
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
      lastestRenewTime.value
    ) as unknown as RefsPullBlock[]
  )
    .map((item) => {
      CACHE_BLOCKS_PAGES_BY_ID.set(item[":db/id"], item);
      CACHE_PAGES_BY_ID.set(item[":db/id"], item);
      ALLBLOCK_PAGES.set(item[":block/uid"], item);

      return {
        block: item,
        page: item[":node/title"],
        isBlock: false,
      };
    })
    .forEach((b) => {
      // console.log({...b.block }, ' ====== ')
      CACHE_PAGES.set(b.block[":block/uid"], b);
    });
  console.timeEnd("pages refs");

  // console.log(refsSet, " =refsSet;");
  [...refsSet.values()].forEach((id) => {
    // console.log(id, isPageId(id), " ----");
    if (!isPageId(id)) {
      CACHE_BLOCKS_REFS_BY_ID.set(id, CACHE_BLOCKS_PAGES_BY_ID.get(id));
    }
  });
  console.time("findBlockAllParentsRefs");
  findBlockAllParentsRefs(newBlocks);
  console.timeEnd("findBlockAllParentsRefs");

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
      lastestRenewTime.value
    ) as unknown as User[]
  ).forEach((user) => {
    CACHE_USERS.set(user[":db/id"], user);
  });
  lastestRenewTime.update();
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

export const getIdMap = () => {
  return Object.fromEntries(CACHE_BLOCKS_PAGES_BY_ID);
};

export const deleteFromCacheByUid = (uid: string) => {
  CACHE_BLOCKS.delete(uid);
  CACHE_PAGES.delete(uid);
  ALLBLOCK_PAGES.delete(uid);
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
      // console.log(item, " - item");
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

export function isPageId(id: number) {
  return CACHE_PAGES_BY_ID.get(id) !== undefined;
}

export function getAllBlockRefs() {
  return [...CACHE_BLOCKS_REFS_BY_ID.values()];
}

function findBlockAllParentsRefs(blocks = getAllBlocks()) {
  blocks.forEach((block) => {
    if (block.isBlock && block.block[":block/parents"]) {
      CACHE_PARENTS_REFS_BY_ID.set(
        block.block[":db/id"],
        block.block[":block/parents"].reduce(
          (p, c) => {
            const result =
              CACHE_BLOCKS_PAGES_BY_ID.get(c[":db/id"])?.[":block/refs"]?.map?.(
                (ref) => ref[":db/id"]
              ) || [];
            // console.log(result, " = result");
            return p.concat(result);
          },
          [block.block[":block/page"]?.[":db/id"] || -1] as number[]
        )
      );
    }
  });
}

/**
 * 用于 inline-search
 */
export function getParentsRefsById(id: number) {
  return CACHE_PARENTS_REFS_BY_ID.get(id) || [];
}

export const getInfoById = (id: number) => {
  return { ...CACHE_BLOCKS_PAGES_BY_ID.get(id) };
};
