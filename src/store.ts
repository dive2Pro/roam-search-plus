import { DateRange } from "@blueprintjs/datetime";
import { observable, ObservableObject, observe } from "@legendapp/state";
import dayjs, { Dayjs } from "dayjs";
import { PullBlock } from "roamjs-components/types";
import { debounce, extension_helper } from "./helper";
import { Query } from "./query";

export type ResultItem = {
  id: string;
  text: string;
  editTime: number;
  createTime: number;
  isPage: boolean;
  paths: string[];
  isSelected: boolean;
  children?: string[];
};

const query = observable({
  creationDate: undefined as SelectDate,
  modificationDate: undefined as SelectDate,
  search: "wwe",
  people: [],
  inPages: [],
  result: {
    pages: [] as PullBlock[],
    topBlocks: [] as (PullBlock & { parents: PullBlock[] })[],
    lowBlocks: [] as
      | {
          page: PullBlock;
          children: PullBlock[];
        }[]
      | undefined,
  },
});

const copySelectedTarget = observable([] as ResultItem[]);

const ui = observable({
  open: false,
  multiple: false,
  selectedTarget: [] as ResultItem[],
  showSelectedTarget: false,
  conditions: {
    onlyPage: false,
  },
  copySelectedTarget,
  previewSelected: false,
  history: {
    search: [
      {
        id: 1,
        text: "qwe33",
      },
    ],
  },
  sort: {
    selection: [
      {
        text: "-",
      },
      { text: "By creation - recent to oldest" },
      {
        text: "By creation - oldest to recent",
      },
      { text: "By modification - recent to oldest" },
      { text: "By modification - oldest to  recent" },
    ],
    selected: 0,
  },
  tags: [] as string[],
  pages: {
    selected: [] as string[],
    items: [] as string[],
  },
  result: [] as ResultItem[],
  loading: false,
});

const selectedTargetStore = new Map<string, ObservableObject<ResultItem>>();

const trigger = debounce(async (search: string) => {
  console.log("trigger !", search);
  const [pages, topBlocks, lowBlocks = []] = await Query({
    search,
  });
  console.log(pages, topBlocks, " - set result-- ", lowBlocks);
  query.result.set({
    pages,
    topBlocks,
    lowBlocks,
  });

  const result: ResultItem[] = [
    ...pages.map((block) => {
      return {
        id: block[":block/uid"],
        text: block[":node/title"],
        editTime: block[":edit/time"],
        createTime: block[":create/time"],
        isPage: true,
        paths: [],
        isSelected: false,
        children: [],
      };
    }),
    ...topBlocks.map((block) => {
      return {
        id: block[":block/uid"],
        text: block[":block/string"],
        editTime: block[":edit/time"],
        createTime: block[":create/time"],
        isPage: false,
        paths: block.parents.map(
          (item) => item[":block/string"] || item[":node/title"]
        ),
        isSelected: false,
        children: [],
      };
    }),
    ...lowBlocks.map((item) => {
      return {
        id: item.page[":block/uid"],
        text: item.page[":node/title"],
        editTime: item.page[":edit/time"],
        createTime: item.page[":create/time"],
        isPage: true,
        paths: [],
        isSelected: false,
        children: item.children.map((child) => child[":block/string"]),
      };
    }),
  ];

  console.log(" ui result = ", result);
  ui.result.set(result);
  ui.loading.set(false);
}, 500);
let prevSearch = "";
const dispose = observe(async () => {
  const search = query.search.get().trim();
  console.log(search, " start search");
  if (!search) {
    return;
  }

  if (prevSearch === search) {
    return;
  }

  prevSearch = search;
  ui.loading.set(true);
  try {
    await trigger(search);
  } catch (e) {
    ui.loading.set(false);
  }
});

function conditionFilter<T extends PullBlock>(
  blocks: T[],
  config: {
    modificationDate?: SelectDate;
    creationDate?: SelectDate;
  }
) {
  let result = blocks;
  if (config.modificationDate) {
    result = result.filter((item) => {
      return (
        item[":edit/time"] >= config.modificationDate.start.valueOf() &&
        item[":edit/time"] >= config.modificationDate.end.valueOf()
      );
    });
  }
  if (config.modificationDate) {
    result = result.filter((item) => {
      return (
        item[":create/time"] >= config.modificationDate.start.valueOf() &&
        item[":create/time"] >= config.modificationDate.end.valueOf()
      );
    });
  }
  return result;
}

const disposeUiResult = observe(async () => {});

const disposeUiResultSort = observe(() => {
  // TODO:
});

extension_helper.on_uninstall(() => {
  dispose();
  disposeUiResult();
  disposeUiResultSort();
});

export const store = {
  db: observable({
    ui,
    query,
  }),
  actions: {
    changeShowSelectedTarget() {
      ui.showSelectedTarget.toggle();
      if (ui.showSelectedTarget.peek()) {
        ui.copySelectedTarget.set(
          observable(ui.result.get().filter((o) => o.isSelected))
        );
      } else {
        // ui.copySelectedTarget.get().forEach((o) => {
        //   console.log(
        //     ui.copySelectedTarget.get(),
        //     " - get",
        //     selectedTargetStore.get(o.uid)?.isSelected.get(),
        //     o.isSelected
        //   );
        //   selectedTargetStore.get(o.uid)?.isSelected.set(o.isSelected);
        // });

        ui.result.forEach((item) => {
          var a = selectedTargetStore.get(item.peek().id);
          console.log(item, " = item");
        });

        ui.result.set(ui.result.get());
      }
    },
    changeSelectedTarget(item: ObservableObject<ResultItem>) {
      // const index = ui.selectedTarget
      //   .get()
      //   .findIndex((o) => o.uid === item.uid.peek());
      // console.log();
      // if (index > -1) {
      //   ui.selectedTarget.splice(index, 1);
      // } else {
      //   ui.selectedTarget.push(item.get());
      // }
      item.isSelected.set(!item.isSelected.get());
      selectedTargetStore.set(item.peek().id, item);
    },

    openDialog() {
      ui.open.set(true);
      // window.roamAlphaAPI.ui.getFocusedBlock()
      // TODO 根据结果是 写入 还是 复制到粘贴板
    },
    closeDialog() {
      ui.open.set(false);
    },
    changeCreateRange(range: DateRange) {
      if (!range[0] || !range[1]) {
        return;
      }
    },
    changeModifyRange(range: DateRange) {
      if (!range[0] || !range[1]) {
        return;
      }

      query.modificationDate.set({
        start: dayjs(range[0]).startOf("day"),
        end: dayjs(range[1]).startOf("day").add(1, "day").subtract(1, "second"),
      });
    },
    changeSearch(s: string) {
      query.search.set(s);
    },
    saveHistory(str: string) {
      ui.history.search.push({
        id: Date.now(),
        text: str,
      });
    },
    clearSearch() {
      store.actions.changeSearch("");
    },
    useHistory(str: string) {
      store.actions.changeSearch(str);
    },
    deleteHistory(id: number) {
      const i = ui.history.search.findIndex((item) => item.id === id);
      console.log("delete:", i, id);
      if (i > -1) {
        ui.history.search.splice(i, 1);
      }
    },
    toggleMultiple() {
      ui.multiple.toggle();

      ui.showSelectedTarget.set(false);
    },
    changeSort(index: number) {
      console.log(index, " -");
      ui.sort.selected.set(index);
    },
    confirm() {},
    confirmMultiple() {
      const search = query.search.peek();
      store.actions.saveHistory(search);
    },
    clearLastEdit() {
      query.modificationDate.set(undefined);
    },
    quick: {
      lastWeek() {
        const today = new Date();

        const makeDate = (action: (d: Date) => void) => {
          const returnVal = new Date(today);
          action(returnVal);
          returnVal.setDate(returnVal.getDate() + 1);
          return returnVal;
        };

        const tomorrow = makeDate(() => null);
        const yesterday = makeDate((d) => d.setDate(d.getDate() - 2));
        const oneWeekAgo = makeDate((d) => d.setDate(d.getDate() - 7));
        store.actions.changeModifyRange([oneWeekAgo, today]);
      },
      today() {
        const today = new Date();
        store.actions.changeModifyRange([today, today]);
      },
    },
    conditions: {
      toggleOnlyPage() {
        ui.conditions.onlyPage.toggle();
      },
    },
    changeTags(tags: string[]) {
      ui.tags.set(tags);
    },
    changeSelectedPages(pages: string[]) {
      ui.pages.selected.set(pages);
    },
  },
  ui: {
    isOpen() {
      // return ui.open.get();
      return true;
    },
    getSearch() {
      return query.search.get();
    },
    getDateRange() {
      return [] as string[];
    },
    isTyped() {
      return query.search.get()?.length;
    },
    hasValidSearch() {
      return query.search.get()?.trim()?.length;
    },
    isMultipleSelection() {
      return ui.multiple.get();
    },
    isShowSelectedTarget() {
      return ui.showSelectedTarget.get();
    },
    getHistory() {
      return ui.history;
    },
    selectedCount() {
      return ui.result.get().filter((o) => o.isSelected).length;
    },
    sort: {
      selection() {
        return ui.sort.selection.get();
      },
      selectedText() {
        let r = ui.sort.selection[ui.sort.selected.get()].text.get();
        return r;
      },
    },
    date: {
      lastEditRange() {
        const date = query.modificationDate.get();
        if (!date) {
          return undefined;
        }
        return [
          new Date(date.start.toString()),
          new Date(date.end.toString()),
        ] as DateRange;
      },
      lastEdit() {
        const date = query.modificationDate.get();
        if (!date) {
          return "";
        }
        const startTime = date.start;
        const endTime = date.end;
        return (
          dayjs(startTime).format("YYYY/MM/DD") +
          " - " +
          dayjs(endTime).format("YYYY/MM/DD")
        );
      },
    },
    conditions: {
      isOnlyPage() {
        return ui.conditions.onlyPage.get();
      },
    },
    tags: {
      getTags() {
        return ui.tags.get();
      },
    },
    isSelectedTarget(item: ResultItem) {
      // const r =
      //   ui.selectedTarget.get().findIndex((o) => o.uid === item.peek().uid) >
      //   -1;
      return item.isSelected;
    },
    pages: {
      get() {
        return ui.pages.items.get();
      },
      isSelected(text: string) {
        return ui.pages.selected.get().indexOf(text) > -1;
      },
    },
    result: {
      size() {
        return ui.result.get().length;
      },
      list() {
        let uiResult = ui.result.get();
        if (ui.conditions.onlyPage.get()) {
          // uiResult = uiResult.filter((item) => item.isPage);
        }

        const modificationDate = query.modificationDate.get();
        const creationDate = query.creationDate.get();

        if (modificationDate) {
          uiResult = uiResult.filter((item) => {
            return (
              item.editTime >= modificationDate.start.valueOf() &&
              item.editTime <= modificationDate.end.valueOf()
            );
          });
        }
        if (creationDate) {
          uiResult = uiResult.filter((item) => {
            return (
              item.createTime >= creationDate.start.valueOf() &&
              item.createTime <= creationDate.end.valueOf()
            );
          });
        }
        console.log("only here change", uiResult);

        return observable(uiResult);
      },
    },
    copySelectedTarget() {
      return ui.copySelectedTarget;
    },
    isLoading() {
      return ui.loading.get();
    },
  },
};

ui.open.onChange((next) => {
  if (next !== true) {
    query.search.set("");
  }
});

// @ts-ignore
window._store = store;
