import { PullBlock } from "roamjs-components/types";

let extentionAPI: RoamExtensionAPI;

export const initExtention = (api: RoamExtensionAPI) => {
  extentionAPI = api;
};

const KEYS = {
  recentlyViewed: "recently-viewed",
  searchHistory: "search-history",
  tab: 'tab'
};

export const recentlyViewed = {
  save(items: RecentlyViewedItem[]) {
    extentionAPI.settings.set(KEYS.recentlyViewed, JSON.stringify(items));
  },
  delete(id: string) {
    recentlyViewed.save(
      recentlyViewed.getAll().filter((item) => item.id === id)
    );
  },
  clear() {
    extentionAPI.settings.set(KEYS.recentlyViewed, undefined);
  },
  getAll() {
    try {
      let result = extentionAPI.settings.get(KEYS.recentlyViewed) as string;
      // return [];
      return JSON.parse((result as string) || "[]") as RecentlyViewedItem[];
    } catch (e) {
      console.log(e, "Error parse settings recently");
      return [];
    }
  },
};

export const searchHistory = {
  save(items: BaseUiItem[]) {
    extentionAPI.settings.set(KEYS.searchHistory, JSON.stringify(items));
  },
  delete(id: string) {
    searchHistory.save(searchHistory.getAll().filter((item) => item.id === id));
  },
  clear() {
    extentionAPI.settings.set(KEYS.searchHistory, undefined);
  },
  getAll() {
    try {
      let result = extentionAPI.settings.get(KEYS.searchHistory) as string;
      // return [];
      return JSON.parse((result as string) || "[]") as BaseUiItem[];
    } catch (e) {
      console.log(e, " Error parse search history ");
      return [];
    }
  },
};

export const Tab = {
  save: (config: any[]) => {
    extentionAPI.settings.set(KEYS.tab, JSON.stringify(config.map(tab => {
      return {
        ...tab,
        graph: {
          loading: false,
          loaded: false,
        }
      }
    })))
  },
  read: () => {
    try {
      const json = extentionAPI.settings.get(KEYS["tab"]) as string;
      return JSON.parse(json) as any;
    } catch (e) {
      console.log(e, ' = error')
    }
  }
}


export type BlockAttrs = {
  closed?: boolean,
  exclude?: {
    tags: {}[]
  },
  include?: {
    tags: {}[]
  }
}

export const BlockAttrs = {
  save: (blockUid: string, props: BlockAttrs) => {
    window.roamAlphaAPI.updateBlock({
      block: {
        uid: blockUid,
        // @ts-ignore
        props: {
          searchPlus: props
        },
      }
    })
  },
  read: (blockUid: string): BlockAttrs => {
    const block = window.roamAlphaAPI.q(`[:find (pull ?e [*])  . :where [?e :block/uid "${blockUid}"]]`) as any
    if (block) {
      return block.props?.searchPlus || {}
    }
    return {}
  },
  updateString: (blockUid: string, value: string) => {
    window.roamAlphaAPI.updateBlock({
      block: {
        uid: blockUid,
        string: value
      }
    })
  }
}