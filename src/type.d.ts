
type RoamExtensionAPI = {
  settings: {
    get: (k: string) => unknown;
    getAll: () => Record<string, unknown>;
    panel: {
      create: (c: PanelConfig) => void;
    };
    set: (k: string, v: unknown) => Promise<void>;
  };
};

type SelectDate =
  | {
    // 这样定义, 可以在不同的属性中复制
    start: Dayjs;
    end: Dayjs;
  }
  | undefined;


type BaseUiItem = { id: string; text: string; dbId?: string };

type RecentlyViewedItem = BaseUiItem & { isPage: boolean }


type User = {
  ":user/display-name": string;
  ":db/id": string;
};

type QueryConfig = {
  search: string[];
  modificationDate?: SelectDate;
  creationDate?: SelectDate;
  caseIntensive: boolean;
  exclude?: {
    pages?: string[], // 目标页面
    blocks?: string[], // 引用该 block
    tags?: string[] // 引用该 tag
  },
  include?: {
    pages?: string[], // 目标页面
    blocks?: string[], // 引用该 block
    tags?: string[] // 引用该 tag
  }
}