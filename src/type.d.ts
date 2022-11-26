
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


  type BaseUiItem = { id: string; text: string };