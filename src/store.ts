import { TextArea, Toast, Toaster } from "@blueprintjs/core";
import { DateRange } from "@blueprintjs/datetime";
import { observable, ObservableObject, observe } from "@legendapp/state";
import dayjs, { Dayjs } from "dayjs";
import { ReactNode } from "react";
import { PullBlock } from "roamjs-components/types";
import { recentlyViewed, searchHistory } from "./extentionApi";
import {
  CONSTNATS,
  debounce,
  extension_helper,
  getDiff,
  pull_many,
} from "./helper";
import { Query } from "./query";
import {
  getAllPages,
  getCurrentPage,
  getPageUidsFromUids,
  getParentsStrFromBlockUid,
  opens,
  renewCache,
} from "./roam";

export type ResultItem = {
  id: string;
  text: string | ReactNode;
  editTime?: number;
  createTime: number;
  isPage: boolean;
  paths: string[];
  isSelected: boolean;
  children: ResultItem[];
};

const query = observable({
  creationDate: undefined as SelectDate,
  modificationDate: undefined as SelectDate,
  search: "",
  people: [],
  inPages: [],
  result: {
    pages: [] as PullBlock[],
    topBlocks: [] as (PullBlock & { parents?: PullBlock[] })[],
    lowBlocks: [] as
      | {
          page: PullBlock;
          children: PullBlock[];
        }[]
      | undefined,
  },
});

const copySelectedTarget = observable([] as ResultItem[]);

const MIN = 450;

const ui = observable({
  open: true,
  visible: true,

  multiple: false,
  selectedTarget: [] as ResultItem[],
  showSelectedTarget: false,
  conditions: {
    onlyPage: false,
    includePage: true,
    includeBlock: true,
    includeCode: true,
    caseIntensive: true,
    inPages: [] as string[], // 可选页面
  },
  copySelectedTarget,
  previewSelected: false,
  history: {
    search: [] as BaseUiItem[],
    viewed: [] as RecentlyViewedItem[],
  },
  sort: {
    selection: [
      {
        text: "Priority",
      },
      { text: "Modified - descending" },
      { text: "Modified - ascending" },
      { text: "Created  - descending" },
      { text: "Created  - ascending" },
    ],
    selected: 0,
  },
  tags: [] as string[],
  pages: {
    selected: [] as {
      id: string;
      text: string;
    }[],
    items: [] as {
      id: string;
      text: string;
    }[],
    current: {} as { id: string; text: string },
  },
  result: [] as ResultItem[],
  loading: false,
  list: [] as ResultItem[],
  height: MIN,
});

ui.history.viewed.onChange((items) => {
  recentlyViewed.save(items);
});

ui.history.search.onChange((items) => {
  searchHistory.save(items);
});

const selectedTargetStore = new Map<string, ObservableObject<ResultItem>>();

const keywordsBuildFrom = (search: string) => {
  let keywords = [];
  var reg = new RegExp(/(\".+?\")|(\S+)/gi);
  let result;
  do {
    result = reg.exec(search);
    if (result) {
      keywords.push(result[0].replace(/\"(.+?)\"/, "$1"));
    }
  } while (result);
  console.log("keywords = ", keywords);
  return keywords;
};

let cancelPre = () => {};
const trigger = debounce(
  async (search: string, caseIntensive: boolean, uids?: string[]) => {
    cancelPre();
    if (!search) {
      return;
    }
    console.log(search, " start search");
    const queryAPi = Query({
      search: keywordsBuildFrom(search),
      uids,
      caseIntensive,
    });
    cancelPre = queryAPi.cancel;
    await queryAPi.promise.then(([pages, topBlocks, lowBlocks]) => {
      // console.log(pages.map( item => item[':block/uid']), topBlocks, " - set result-- " + search, lowBlocks);
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
            editTime: block[":edit/time"] || block[":create/time"],
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
            editTime: block[":edit/time"] || block[":create/time"],
            createTime: block[":create/time"],
            isPage: false,
            // paths: block.parents.map(
            //   (item) => item[":block/string"] || item[":node/title"]
            // ),
            paths: [],
            isSelected: false,
            children: [],
          };
        }),
        ...(lowBlocks || []).map((item) => {
          return {
            id: item.page[":block/uid"],
            text: item.page[":node/title"],
            editTime: item.page[":edit/time"] || item.page[":create/time"],
            createTime: item.page[":create/time"],
            isPage: true,
            paths: [],
            isSelected: false,
            children: item.children.map((block) => {
              return {
                id: block[":block/uid"],
                text: block[":block/string"],
                editTime: block[":edit/time"] || block[":create/time"],
                createTime: block[":create/time"],
                isPage: false,
                // paths: block.parents.map(
                //   (item) => item[":block/string"] || item[":node/title"]
                // ),
                paths: [],
                isSelected: false,
                children: [],
              };
            }),
          };
        }),
      ];

      // console.log(" ui result = ", result);
      ui.result.set(result);
    });
    ui.loading.set(false);
  },
  500
);
let prevSearch = "";

const triggerWhenSearchChange = async (next: string) => {
  const nextStr = next.trim();
  const selectedPagesUids = ui.pages.selected.peek();
  const caseIntensive = ui.conditions.caseIntensive.peek();
  if (nextStr !== prevSearch) {
    ui.loading.set(!!nextStr);
    try {
      await trigger(
        nextStr,
        caseIntensive,
        selectedPagesUids.map((item) => item.id)
      );
    } catch (e) {
      console.log(e, " ---");
      ui.loading.set(false);
    }
  }
};
const disposeSearch = query.search.onChange(async (next) => {
  triggerWhenSearchChange(next);
});

const dispose = observe(async () => {
  const search = query.search.peek().trim();
  const selectedPagesUids = ui.pages.selected.get();
  const caseIntensive = ui.conditions.caseIntensive.get();

  ui.loading.set(!!search);

  try {
    await trigger(
      search,
      caseIntensive,
      selectedPagesUids.map((item) => item.id)
    );
  } catch (e) {
    console.log(e, " ---");
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

const disposeUiResult = observe(async () => {
  let uiResult = ui.result.get();

  const includePage = ui.conditions.includePage.get();
  const includeBlock = ui.conditions.includeBlock.get();
  uiResult = uiResult.filter((item) => {
    let result = true;
    if (!includePage) {
      result = !item.isPage;
    }
    if (result && !includeBlock) {
      return item.isPage;
    }
    return result;
  });

  // if (ui.conditions.onlyPage.get()) {
  //   uiResult = uiResult.filter((item) => item.isPage);
  // }
  // uiResult.filter( item => item.isPage)
  // const resultPages = getPageUidsFromUids(uiResult.map((item) => item.id));
  // 只有选中的 page 才出现.
  // uiResult = uiResult.filter((item) => {
  //   return selectedPagesUids.some((id) => id === item.id);
  // });
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

  console.log(ui.conditions.includeCode.get(), " - get render");
  if (!ui.conditions.includeCode.get()) {
    uiResult = uiResult
      .filter((item) => {
        const text = item.text as string;
        return item.isPage || !(text.startsWith("```") && text.endsWith("```"));
      })
      .map((item) => {
        if (item.children.length) {
          return {
            ...item,
            children: item.children.filter((oi) => {
              const childText = oi.text as string;
              return !(
                childText.startsWith("```") && childText.endsWith("```")
              );
            }),
          };
        }
        return item;
      });
  }

  const sortFns = [
    () => 0,
    (a: ResultItem, b: ResultItem) => {
      return b.editTime - a.editTime;
    },
    (a: ResultItem, b: ResultItem) => {
      return a.editTime - b.editTime;
    },
    (a: ResultItem, b: ResultItem) => {
      return b.createTime - a.createTime;
    },
    (a: ResultItem, b: ResultItem) => {
      return a.createTime - b.createTime;
    },
  ];
  uiResult = uiResult.slice().sort(sortFns[ui.sort.selected.get()]);
  // console.log("sorted-", uiResult);

  ui.list.set(uiResult);
});

const disposeUiResultSort = observe(() => {
  // TODO:
});

const disposeUiSelectablePages = observe(() => {
  const list = ui.result.get();
  const pages = list
    .filter((item) => item.isPage)
    .map((item) => ({
      id: item.id,
      text: item.text as string,
    }));
  const pageBlocks = pull_many(
    getPageUidsFromUids(
      list.filter((item) => !item.isPage).map((item) => item.id)
    )
  );

  // console.log(
  //   [...pages,
  //   ...pageBlocks.map((item) => ({
  //     id: item[":block/uid"],
  //     text: item[":node/title"],
  //   }))].filter(item => item.text),
  //   " ----"
  // );
  ui.pages.items.set(
    [
      ...pages,
      ...pageBlocks.map((item) => ({
        id: item[":block/uid"],
        text: item[":node/title"],
      })),
    ].filter((item) => item.text)
  );
});

extension_helper.on_uninstall(() => {
  dispose();
  disposeSearch();
  disposeUiResult();
  disposeUiResultSort();
  disposeUiSelectablePages();
});

const saveToSearchViewed = (items: ResultItem[]) => {
  const viewed = ui.history.viewed.peek();
  ui.history.viewed.push(
    ...items
      .filter(
        (item) => viewed.findIndex((vItem) => item.id === vItem.id) === -1
      )
      .map((item) => ({
        id: item.id,
        text: item.text as string,
        isPage: item.isPage,
      }))
  );
};

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
    toggleDialog() {
      if (ui.visible.get()) {
        store.actions.closeDialog();
      } else {
        store.actions.openDialog();
      }
    },
    openDialog() {
      ui.open.set(true);
      ui.visible.set(true);
      // window.roamAlphaAPI.ui.getFocusedBlock()
      // TODO 根据结果是 写入 还是 复制到粘贴板
    },
    closeDialog() {
      // ui.open.set(false);
      console.log("close!!!");
      ui.visible.set(false);
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
    searchAgain() {
      triggerWhenSearchChange(query.search.peek());
    },
    clearSearch() {
      store.actions.changeSearch("");
    },
    useHistory(str: string) {
      store.actions.changeSearch(str);
    },

    history: {
      saveSearch(str: string) {
        ui.history.search.set([
          ...ui.history.search.peek().filter((item) => item.text !== str),
          {
            id: Date.now() + "",
            text: str,
          },
        ]);
      },
      deleteSearch(id: string) {
        const i = ui.history.search.findIndex((item) => item.id === id);
        console.log("delete:", i, id);
        if (i > -1) {
          ui.history.search.splice(i, 1);
        }
      },
      deleteViewedItem(id: string) {
        const index = ui.history.viewed
          .peek()
          .findIndex((item) => item.id === id);
        if (index > -1) ui.history.viewed.splice(index, 1);
      },
      clearViewed() {
        ui.history.viewed.set([]);
      },
      clearSearch() {
        ui.history.search.set([]);
      },
    },
    toggleMultiple() {
      ui.multiple.toggle();

      ui.showSelectedTarget.set(false);
    },
    changeSort(index: number) {
      console.log(index, " -");
      ui.sort.selected.set(index);
    },
    confirm: {
      openInSidebar(items: ResultItem[]) {
        items.forEach((item) => {
          opens.sidebar(item.id);
        });
        saveToSearchViewed(items);
      },
      saveAsReference(items: ResultItem[]) {
        const focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock();
        const pasteStr = items
          .map((item) => {
            if (item.isPage) {
              return `[[${item.text}]]`;
            } else {
              return `((${item.id}))`;
            }
          })
          .join("\n");
        if (focusedBlock) {
          // focus lose....
          // const inputEl = document.querySelector(
          //   "textarea.rm-block-input"
          // ) as HTMLTextAreaElement;
          // inputEl.value = inputEl.value + pasteStr;
        } else {
        }
        navigator.clipboard.writeText(pasteStr);
        Toaster.create().show({
          message: "references copied",
        });
      },
      openInMain(item: ResultItem) {
        if (item.isPage) {
          opens.main.page(item.id);
        } else {
          opens.main.block(item.id);
        }
        saveToSearchViewed([item]);
      },
    },
    confirmMultiple() {
      const search = query.search.peek();
      store.actions.history.saveSearch(search);
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
      async currentPage() {
        const page = await getCurrentPage();
        store.actions.changeSelectedPages({
          id: page[":block/uid"],
          text: page[":node/title"],
        });
      },
    },
    conditions: {
      toggleOnlyPage() {
        ui.conditions.onlyPage.toggle();
      },
      toggleIncludeCodeblock() {
        ui.conditions.includeCode.toggle();
      },
      toggleIncludePage() {
        ui.conditions.includePage.toggle();
      },
      toggleIncludeBlock() {
        ui.conditions.includeBlock.toggle();
      },
      toggleCaseIntensive() {
        ui.conditions.caseIntensive.toggle();
      },
    },
    changeTags(tags: string[]) {
      ui.tags.set(tags);
    },
    changeSelectedPages(obj: { id: string; text: string }) {
      const selected = ui.pages.selected.peek();
      const index = selected.findIndex((item) => item.id === obj.id);
      if (index > -1) {
        ui.pages.selected.splice(index, 1);
      } else {
        ui.pages.selected.push(obj);
      }
    },
    setHeight(vHeight: number) {
      const windowHeight = document.body.getBoundingClientRect().height;
      const MAX = windowHeight - 250;
      const height = Math.max(MIN, Math.min(vHeight, MAX));
      ui.height.set(height);
    },
  },
  ui: {
    isOpen() {
      return ui.open.get();
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
    history: {
      getViewed() {
        return ui.history.viewed;
      },
      getSearch() {
        return ui.history.search;
      },
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
      isIncludeCodeblock() {
        return ui.conditions.includeCode.get();
      },
      isCaseIntensive() {
        return ui.conditions.caseIntensive.get();
      },
      isIncludePage() {
        return ui.conditions.includePage.get();
      },
      isIncludeBlock() {
        return ui.conditions.includeBlock.get();
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
        // const selected = ui.pages.selected.get();

        // return ui.pages.items.get();
        return getAllPages()
          .map((item) => ({
            id: item[":block/uid"],
            text: item[":node/title"],
          }))
          .filter((item) => item.text);
        // .filter((item) => !selected.some((id) => id === item.id));
      },
      isSelected(id: string) {
        return ui.pages.selected.get().findIndex((item) => item.id === id) > -1;
      },
      getSelected() {
        return ui.pages.selected.get();
      },
      hasCurrentPage() {
        const c = ui.pages.current.get();
        return ui.pages.selected.get().length === 0 && c.id;
      },
    },
    result: {
      size() {
        return ui.result.get().length;
      },
      list() {
        return ui.list.get();
      },
      getListStyle() {
        const height = ui.height.get();
        return {
          height,
          minHeight: height,
        };
      },
    },
    copySelectedTarget() {
      return ui.copySelectedTarget;
    },
    isLoading() {
      return ui.loading.get();
      // return true;
    },
    getPathsFromUid(uid: string) {
      return getParentsStrFromBlockUid(uid);
    },
    size: {
      resultList() {},
    },
    hasResult() {
      return store.ui.getSearch().length > 0 && store.ui.result.size() > 0;
    },
  },
};

renewCache();
ui.visible.onChange(async (next) => {
  const el = document.querySelector("." + CONSTNATS.el);
  if (!next) {
    el.classList.add("invisible");
  } else {
    el.classList.remove("invisible");
    setTimeout(() => {
      renewCache();
      triggerWhenSearchChange(query.search.peek());
    }, 10);
    const page = await getCurrentPage();
    if (page) {
      ui.pages.current.set({
        id: page[":block/uid"],
        text: page[":node/title"],
      });
    }
  }
});
ui.open.onChange((next) => {
  if (next !== true) {
    // query.search.set("");
  } else {
  }
});

export const initStore = (extensionAPI: RoamExtensionAPI) => {
  ui.history.viewed.set(recentlyViewed.getAll());
  ui.history.search.set(searchHistory.getAll());
};

// @ts-ignore
window._store = store;
