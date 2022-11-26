let extentionAPI: RoamExtensionAPI;

export const initExtention = (api: RoamExtensionAPI) => {
  extentionAPI = api;
};

const KEYS = {
  recentlyViewed: "recently-viewed",
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
      console.log(e, " parse settings recently");
      return [];
    }
  },
};
