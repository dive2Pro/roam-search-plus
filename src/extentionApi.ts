let extentionAPI: RoamExtensionAPI;

export const initExtention = (api: RoamExtensionAPI) => {
  extentionAPI = api;
};

const KEYS = {
  recentlyViewed: "recently-viewed",
};

export const recentlyViewed = {
  save(items: BaseUiItem[]) {
    extentionAPI.settings.set(KEYS.recentlyViewed, items);
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
      const result = extentionAPI.settings.get(KEYS.recentlyViewed);
      if (Array.isArray) {
        return result as BaseUiItem[];
      }
      return JSON.parse((result as string) || "[]") as BaseUiItem[];
    } catch (e) {
      console.log(e, " parse settings recently");
      return [];
    }
  },
};
