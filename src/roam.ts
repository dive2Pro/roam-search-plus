import { PullBlock } from "roamjs-components/types";
import { debounce } from "./helper";

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
const DELAY = 2000;

const cleanCache = () => {
  cache.clear();
};

let ALLBLOCKS: Map<string, PullBlock> = new Map();
export const renewCache = () => {
  ALLBLOCKS.clear();
  (
    window.roamAlphaAPI.data.fast.q(
      `
    [
            :find [(pull ?e [*]) ...]
            :where                
                [?e :block/uid ?u]
        ]
    `
    ) as PullBlock[]
  ).forEach((block) => {
    ALLBLOCKS.set(block[":block/uid"], block);
  });
  console.log(ALLBLOCKS);
};

export const getCache = () => {
  return ALLBLOCKS;
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
