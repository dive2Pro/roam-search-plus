import { Toaster } from "@blueprintjs/core";
import { DateRange } from "@blueprintjs/datetime";
import { batch, observable, observe } from "@legendapp/state";
import dayjs from "dayjs";
import { ReactNode, startTransition as _startTransition } from "react";
import { delay } from "./utils/delay";
import { recentlyViewed, searchHistory, Tab } from "./extentionApi";
import {
  clone,
  CONSTNATS,
  debounce,
  extension_helper,
  timer,
  toResultItem,
} from "./helper";
import { isGraphLoaded, setGraphLoaded } from "./loaded";
import { Query } from "./query";
import {
  CacheBlockType,
  deleteFromCacheByUid,
  findLowestParentFromBlocks,
  getAllPages,
  getAllUsers,
  getCacheByUid,
  getCurrentPage,
  getMe,
  getParentsStrFromBlockUid,
  initCache,
  opens,
  renewCache2,
} from "./roam";
import { queryResult } from "./result";
import React from "react";
import { isAutoSearch } from "./config";

export function findLowestParentFromResult(block: ResultItem) {
  if (block.isPage) {
    return block;
  }
  if (block.children?.length) {
    let lowestParent = findLowestParentFromBlocks(
      block.children.map((item) => ({ uid: toResultItem(item).id }))
    );
    lowestParent = lowestParent
      ? getCacheByUid(lowestParent[":block/uid"])?.block
      : null;
    if (lowestParent) {
      const result = {
        id: lowestParent[":block/uid"],
        text: lowestParent[":block/string"],
        editTime: lowestParent[":edit/time"] || lowestParent[":create/time"],
        createTime: lowestParent[":create/time"],
        createUser: lowestParent[":create/user"]?.[":db/id"],
        isPage: false,
        paths: [] as string[],
        isSelected: false,
        children: block.children.filter(
          (block) => (block as ResultItem).id !== lowestParent[":block/uid"]
        ),
      };
      return result;
    }
  }

  return block;
}

export type ResultItem = {
  id: string;
  text: string | ReactNode;
  editTime?: number;
  createTime: number;
  isPage: boolean;
  paths: string[];
  isSelected: boolean;
  children: (ResultItem | CacheBlockType)[];
  createUser: string | number;
  needCreate?: boolean;
  addToDN?: boolean;
  onClick?: () => void;
};

export type SelectResultItem = ResultItem & {
  selected: 0 | 1;
};

const query = observable({
  result: [] as ResultItem[],
  list: [] as ResultItem[],
});

const MIN = 450;

const defaultConditions = {
  creationDate: undefined as SelectDate,
  modificationDate: undefined as SelectDate,
  onlyPage: false,
  includePage: true,
  includeBlock: true,
  includeCode: true,
  blockRefToString: true,
  caseIntensive: false,
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
  users: {
    items: [] as User[],
    selected: [] as { id: string; text: string }[],
  },
  exclude: {
    pages: [] as BaseUiItem[],
    tags: [] as BaseUiItem[],
    blocks: [] as BaseUiItem[],
  },
  filter: {
    tags: {
      include: [] as BaseUiItem[],
      exclude: [] as BaseUiItem[],
    },
    page: {
      include: [] as BaseUiItem[],
      exclude: [] as BaseUiItem[],
    },
  },
};

const defaultTab = () => ({
  title: "Search+",
  id: window.roamAlphaAPI.util.generateUID(),
  graph: {
    loading: false,
  },
  search: "",
  multiple: false,
  selectedTarget: [] as SelectResultItem[],
  showSelectedTarget: false,
  conditions: clone(defaultConditions),
  loading: false,
  height: MIN,
});

type ITab = ReturnType<typeof defaultTab>;
// 为什么要有 Tabs 和 windowUi.tab.tabs
// ui 是读取 Tabs[activeIndex] 的值, 如果直接调用 ui.set(Tabs[activeIndex]) 会覆盖掉 windowUi.tab.tabs 中的值
// 所以需要 Tabs 作为原始值, 来保存修改后的数据

let Tabs = [defaultTab()] as ITab[];

const addToTabs = (newTab: ITab) => {
  // console.log(Tabs.length, windowUi.tab.tabs.length);
  Tabs.push(newTab);
  windowUi.tab.tabs.push(newTab);
  // console.log(Tabs.length, windowUi.tab.tabs.length);
  Tab.save(Tabs);
  focusInTabs(newTab.id);
};

const deleteFromTabs = (id: string) => {
  const index = Tabs.findIndex((tab) => tab.id === id);
  Tabs.splice(index, 1);
  windowUi.tab.tabs.splice(index, 1);
  focusInTabs(Tabs[0].id);
  Tab.save(Tabs);
};

const focusInTabs = (v: string) => {
  const prevFocus = windowUi.tab.active.get();
  let index = Tabs.findIndex((tab) => tab.id === prevFocus);
  if (index > -1) Tabs[index] = ui.get();
  windowUi.tab.active.set(v);
  index = Tabs.findIndex((tab) => tab.id === v);
  ui.set(Tabs[index]);
};

const windowUi = observable({
  open: false,
  visible: false,
  mode: {
    max: false,
  },
  history: {
    search: [] as BaseUiItem[],
    viewed: [] as RecentlyViewedItem[],
  },
  filter: {
    open: false,
  },
  tab: {
    active: Tabs[0].id,
    tabs: clone(Tabs),
    nameInputing: false,
  },
  select: {
    open: false,
  },
});

let ui = observable(Tabs.find((tab) => tab.id === windowUi.tab.active.get()));
ui.onChange((v) => {
  const index = Tabs.findIndex((tab) => tab.id === v.id);
  Tabs[index] = v;
  Tab.save(Tabs);
});
ui.conditions.blockRefToString.onChange(async (v) => {
  const search = ui.search.get();
  store.actions.changeSearch("");
  await store.actions.loadingGraph();
  store.actions.changeSearch(search);
});

extension_helper.on_uninstall(
  windowUi.history.viewed.onChange((items) => {
    recentlyViewed.save(items);
  })
);

extension_helper.on_uninstall(
  windowUi.history.search.onChange((items) => {
    searchHistory.save(items);
  })
);

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
  // console.log("keywords = ", keywords);
  return keywords;
};

let _list: ResultItem[] = [];
const setList = (result: ResultItem[]) => {
  _list = result;
  if (store && !store.ui?.isMultipleSelection() && !store.ui?.hasExactPage()) {
    const createPage = {
      text: store.ui.getSearch(),
      isPage: true,
      needCreate: true,
      children: [],
    } as ResultItem;
    _list = [..._list, createPage];
  }

  if (store && !store.ui?.isMultipleSelection()) {
    const addToDN = {
      text: store.ui.getSearch(),
      isPage: true,
      addToDN: true,
      children: [],
      onClick: () => {
        const uid = window.roamAlphaAPI.util.dateToPageUid(new Date());
        window.roamAlphaAPI.createBlock({
          location: {
            "parent-uid": uid,
            order: Number.MAX_SAFE_INTEGER,
          },
          block: {
            string: store.ui.getSearch(),
          },
        });
        store.actions.closeDialog();
        store.actions.changeSearch("");
        Toaster.create({
          position: "bottom",
        }).show({
          intent: "success",
          message: "Added content to daily note",
          action: {
            text: "open",
            intent: "primary",
            onClick: () => {
              window.roamAlphaAPI.ui.mainWindow.openDailyNotes();
            },
          },
        });
      },
    } as ResultItem;
    _list = [..._list, addToDN];
  }

  query.list.set([]);
};

const getList = () => {
  query.list.get();
  return _list;
};

let prevOperator = {
  stop: () => {
    //
  },
};
const trigger = debounce(
  async (config: Omit<QueryConfig, "search"> & { search: string }) => {
    if (!config.search) {
      let filterCount = 0;
      if (config.exclude) {
        Object.keys(config.exclude).forEach((key) => {
          filterCount += (config.exclude as any)[key].length;
        });
      }
      if (config.include) {
        Object.keys(config.include).forEach((key) => {
          filterCount += (config.include as any)[key].length;
        });
      }
      if (filterCount === 0 && !ui.conditions.modificationDate.peek()) {
        // console.log("return search", config);
        return;
      }
    }
    // console.log(search, " start search");
    console.time("Full Query");
    const queryAPi = Query({
      ...config,
      search: keywordsBuildFrom(config.search),
    });
    console.timeEnd("Full Query");
    prevOperator = queryAPi;
    return queryAPi.promise.finally(() => {
      ui.loading.set(false);
    });
  },
  500
);
let prevSearch = "";

const triggerWhenSearchChange = async (next: string, force = false) => {
  const nextStr = next.trim();
  if (!force) {
    if (nextStr === prevSearch) {
      return;
    }
    prevSearch = nextStr;
    if (prevOperator) {
      prevOperator.stop();
    }
    if (nextStr === "") {
      return;
    }
  } else {
    prevSearch = nextStr;
    if (prevOperator) {
      prevOperator.stop();
    }
  }

  // ui.loading.set(true);
  try {
    // const selectedPagesUids = ui.conditions.pages.selected.peek();
    const caseIntensive = ui.conditions.caseIntensive.peek();
    await trigger({
      search: nextStr,
      caseIntensive,
      // uids: selectedPagesUids.map((item) => item.id),
      exclude: {
        pages: getFilterExcludePageIds(),
        tags: getFilterExcludeTags(),
      },
      include: {
        pages: getFilterIncludePageIds(),
        tags: getFilterIncludeTags(),
      },
    });
  } catch (e) {
    console.error(e);
  }
};

const disposeSearch = ui.search.onChange(async (next) => {
  if (windowUi.visible.peek() && isAutoSearch()) {
    triggerWhenSearchChange(next);
  }
});

const getFilterExcludePageIds = (): string[] => {
  const pageFilter = ui.conditions.filter.page.get();
  if (pageFilter?.exclude) {
    return pageFilter.exclude.map((item) => item.id);
  }
  return [];
};

const getFilterIncludePageIds = (): string[] => {
  const pageFilter = ui.conditions.filter.page.get();
  if (pageFilter?.include) {
    return pageFilter.include.map((item) => item.id);
  }
  return [];
};

const getFilterIncludeTags = (): number[] => {
  const tagsFilter = ui.conditions.filter.tags.get();
  if (tagsFilter?.include) {
    return tagsFilter.include.map((item) => item.dbId!);
  }
  return [];
};

const getFilterExcludeTags = (): number[] => {
  const tagsFilter = ui.conditions.filter.tags.get();
  if (tagsFilter?.exclude) {
    return tagsFilter.exclude.map((item) => item.dbId!);
  }
  return [];
};

const dispose = observe(async () => {
  const search = ui.search.peek().trim();
  const caseIntensive = ui.conditions.caseIntensive.get();
  // const exclude = ui.conditions.exclude.get();
  console.log({ search })
  ui.loading.set(!!search);
  try {
    if (prevOperator) {
      prevOperator.stop();
    }
    await trigger({
      search,
      caseIntensive,
      // uids: selectedPagesUids.map((item) => item.id),
      exclude: {
        pages: getFilterExcludePageIds(),
        tags: getFilterExcludeTags(),
      },
      include: {
        pages: getFilterIncludePageIds(),
        tags: getFilterIncludeTags(),
      },
      // exclude: {
      //   pageUids: exclude.pages.map(item => item.id),
      //   tagsUids: exclude.tags.map(item => item.dbId!)
      // }
    });
  } catch (e) {
    console.error(e, " ---");
    ui.loading.set(false);
  }
});

const disposeUiResult = observe(async () => {
  const endUiResultTimer = timer("ui result")
  let uiResult = queryResult.getResult();

  const includePage = ui.conditions.includePage.get();
  const includeBlock = ui.conditions.includeBlock.get();
  const users = ui.conditions.users.selected.get();
  uiResult = uiResult.filter((item) => {
    let result = true;
    if (!includePage) {
      result = !item.isPage;
    }
    if (result && !includeBlock) {
      result = item.isPage;
    }

    if (result && users.length) {
      // console.log(users, {...item}, typeof item.createUser, typeof users[0])
      result = users.some(
        (user) => user.id === item.createUser || !item.createUser
      );
    }
    return result;
  });
  const modificationDate = ui.conditions.modificationDate.get();
  const creationDate = ui.conditions.creationDate.get();

  if (modificationDate) {
    const start = dayjs(modificationDate.start);
    const end = dayjs(modificationDate.end);
    uiResult = uiResult.filter((item) => {
      // console.log(item.editTime, +start, + end)
      return item.editTime >= +start && item.editTime <= +end;
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
              const childText = toResultItem(oi).text as string;
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
  uiResult = uiResult.slice().sort(sortFns[ui.conditions.sort.selected.get()]);
  // console.log("sorted-", uiResult);
  // _list = uiResult;
  // ui.list.set([]);
  endUiResultTimer()
  setList(uiResult);
});

extension_helper.on_uninstall(() => {
  dispose();
  disposeSearch();
  disposeUiResult();
  prevSearch = "";
});

const saveToSearchViewed = (items: ResultItem[]) => {
  const viewed = windowUi.history.viewed.peek();

  windowUi.history.viewed.push(
    ...items
      .filter(
        (item) =>
          viewed.findIndex((vItem) => item.id === vItem.id) === -1 ||
          !!item.text
      )
      .map((item) => ({
        id: item.id,
        text: React.isValidElement(item.text)
          ? item.text.props.children
          : item.text,
        isPage: item.isPage,
      }))
  );
};

export const store = {
  db: observable({
    ui,
  }),
  actions: {
    createPage(title: string, rightSidebar = false) {
      const uid = window.roamAlphaAPI.util.generateUID();

      window.roamAlphaAPI
        .createPage({
          page: {
            title: title,
            uid,
          },
        })
        .then((res) => {
          if (rightSidebar) {
            window.roamAlphaAPI.ui.rightSidebar.addWindow({
              window: {
                "block-uid": uid,
                type: "block",
              },
            });
            return;
          }
          window.roamAlphaAPI.ui.mainWindow.openPage({
            page: {
              title,
            },
          });
        });
    },
    toggleMaximize() {
      windowUi.mode.max.set((prev) => !prev);
    },
    changeShowSelectedTarget() {
      ui.showSelectedTarget.toggle();
      if (ui.showSelectedTarget.peek()) {
      } else {
        // console.log("ahahah");
        ui.selectedTarget.set((prev) => {
          return prev.filter((item) => item.selected === 1);
        });
      }
    },
    changeSelectedTarget(item: ResultItem) {
      const index = ui.selectedTarget.get().findIndex((o) => o.id === item.id);
      if (index > -1) {
        ui.selectedTarget.splice(index, 1);
      } else {
        ui.selectedTarget.push({ ...item, selected: 1 });
      }
    },
    changeSelectedTargetInResult(item: SelectResultItem) {
      const index = ui.selectedTarget.get().findIndex((o) => o.id === item.id);
      ui.selectedTarget.splice(index, 1, {
        ...item,
        selected: item.selected === 1 ? 0 : 1,
      });
    },
    close() {
      if (store.ui.conditions.isPageSelecting()) {
        store.actions.conditions.toggleSelect();
        return;
      }
      if (windowUi.filter.open.get()) {
        store.actions.toggleFilter();
        return;
      }
      store.actions.closeDialog();
    },
    toggleDialog() {
      if (store.ui.conditions.isPageSelecting()) {
        return;
      }
      if (windowUi.visible.get()) {
        if (windowUi.filter.open.get()) {
          store.actions.toggleFilter();
        } else {
          store.actions.closeDialog();
        }
      } else {
        store.actions.openDialog();
        if (!isGraphLoaded()) {
          store.actions.loadingGraph();
        } else {
          store.actions.renewGraph();
        }
      }
    },
    toggleFilter() {
      windowUi.filter.open.set((prev) => !prev);
    },
    openDialog() {
      windowUi.open.set(true);
      windowUi.visible.set(true);
    },
    closeDialog() {
      // ui.open.set(false);
      // console.log("close!!!");
      windowUi.visible.set(false);
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

      ui.conditions.modificationDate.set({
        start: dayjs(range[0]).startOf("day"),
        end: dayjs(range[1]).startOf("day").add(1, "day").subtract(1, "second"),
      });
    },
    changeSearch(s: string) {
      ui.search.set(s);
    },
    searchAgain() {
      triggerWhenSearchChange(ui.search.peek(), true);
    },
    clearSearch() {
      store.actions.changeSearch("");
    },
    useHistory(str: string) {
      store.actions.changeSearch(str);
    },

    history: {
      saveSearch(str: string) {
        windowUi.history.search.set([
          ...windowUi.history.search.peek().filter((item) => item.text !== str),
          {
            id: Date.now() + "",
            text: str,
          },
        ]);
      },
      deleteSearch(id: string) {
        const i = windowUi.history.search.findIndex((item) => item.id === id);
        // console.log("delete:", i, id);
        if (i > -1) {
          windowUi.history.search.splice(i, 1);
        }
      },
      deleteViewedItem(id: string) {
        const index = windowUi.history.viewed
          .peek()
          .findIndex((item) => item.id === id);
        if (index > -1) windowUi.history.viewed.splice(index, 1);
      },
      clearViewed() {
        windowUi.history.viewed.set([]);
      },
      clearSearch() {
        windowUi.history.search.set([]);
      },
    },
    toggleMultiple() {
      ui.multiple.toggle();
      ui.showSelectedTarget.set(false);
    },
    changeSort(index: number) {
      // console.log(index, " -");
      ui.conditions.sort.selected.set(index);
    },
    confirm: {
      openInSidebar(item: ResultItem) {
        const opened = opens.sidebar(item.id);
        if (!opened) {
          deleteListItemByUid(item.id);
        } else {
          saveToSearchViewed([item]);
        }
        return opened;
      },
      openInMain(item: ResultItem) {
        let opened = opens.main.page(item.id);
        if (opened) {
          saveToSearchViewed([item]);
        } else {
          deleteListItemByUid(item.id);
        }
        return opened;
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
      copyResult(oneline = false) {
        const pasteStr = getList()
          // .get()
          .map((item) => {
            if (item.isPage) {
              return `[[${item.text}]]`;
            } else {
              return `((${item.id}))`;
            }
          })
          .join(oneline ? " " : "\n");

        navigator.clipboard.writeText(pasteStr);
      },
    },
    openInsidebarInMultiple() {
      const search = ui.search.peek();
      store.actions.history.saveSearch(search);
      ui.selectedTarget
        .peek()
        .filter((item) => item.selected === 1)
        .forEach((item) => {
          opens.sidebar(item.id);
        });
      ui.selectedTarget.set([]);
      store.actions.toggleDialog();
      ui.showSelectedTarget.set(false);
    },
    confirmMultiple(oneline = false) {
      const search = ui.search.peek();
      store.actions.history.saveSearch(search);
      // console.log(ui.selectedTarget.get(), '----')
      const pasteStr = ui.selectedTarget
        .peek()
        .filter((item) => item.selected === 1)
        .map((item) => {
          if (item.isPage) {
            return `[[${item.text}]]`;
          }
          return `((${item.id}))`;
        })
        .join(oneline ? " " : "\n");
      ui.selectedTarget.set([]);
      navigator.clipboard.writeText(pasteStr);
      store.actions.toggleDialog();
      ui.showSelectedTarget.set(false);
    },
    clearLastEdit() {
      ui.conditions.modificationDate.set(undefined);
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
        store.actions.conditions.filter.page.include.changeSelected({
          id: page[":block/uid"],
          text: page[":node/title"],
        });
      },
      me() {
        const me = getMe();
        store.actions.conditions.changeSelectedUsers({
          id: me[":db/id"],
          text: me[":user/display-name"],
        });
      },
    },
    conditions: {
      filter: {
        tag: {
          include: {
            clearSelected() {
              ui.conditions.filter.tags.include.set([]);
            },
            changeSelected(obj: BaseUiItem) {
              const selected = ui.conditions.filter.tags.include.peek();
              const index = selected.findIndex((item) => item.id === obj.id);
              if (index > -1) {
                ui.conditions.filter.tags.include.splice(index, 1);
              } else {
                ui.conditions.filter.tags.include.push(obj);
              }
            },
          },
          exclude: {
            clearSelected() {
              ui.conditions.filter.tags.exclude.set([]);
            },
            changeSelected(obj: BaseUiItem) {
              const selected = ui.conditions.filter.tags.exclude.peek();
              const index = selected.findIndex((item) => item.id === obj.id);
              if (index > -1) {
                ui.conditions.filter.tags.exclude.splice(index, 1);
              } else {
                ui.conditions.filter.tags.exclude.push(obj);
              }
            },
          },
        },
        page: {
          include: {
            clearSelected() {
              ui.conditions.filter.page.include.set([]);
            },
            changeSelected(obj: BaseUiItem) {
              const selected = ui.conditions.filter.page.include.peek();
              const index = selected.findIndex((item) => item.id === obj.id);
              if (index > -1) {
                ui.conditions.filter.page.include.splice(index, 1);
              } else {
                ui.conditions.filter.page.include.push(obj);
              }
            },
          },
          exclude: {
            clearSelected() {
              ui.conditions.filter.page.exclude.set([]);
            },
            changeSelected(obj: BaseUiItem) {
              const selected = ui.conditions.filter.page.exclude.peek();
              const index = selected.findIndex((item) => item.id === obj.id);
              if (index > -1) {
                ui.conditions.filter.page.exclude.splice(index, 1);
              } else {
                ui.conditions.filter.page.exclude.push(obj);
              }
            },
          },
        },
      },
      toggleSelect(b?: boolean) {
        setTimeout(() => {
          if (b !== undefined) {
            windowUi.select.open.set(b);
          } else {
            windowUi.select.open.toggle();
          }
        }, 100);
      },
      async toggleBlockRefToString() {
        ui.conditions.blockRefToString.toggle();
      },
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
      clearSelectedPages() {
        ui.conditions.pages.selected.set([]);
      },
      changeSelectedPages(obj: { id: string; text: string }) {
        const selected = ui.conditions.pages.selected.peek();
        const index = selected.findIndex((item) => item.id === obj.id);
        if (index > -1) {
          ui.conditions.pages.selected.splice(index, 1);
        } else {
          ui.conditions.pages.selected.push(obj);
        }
      },
      changeSelectedUsers(user: { id: string; text: string }) {
        const selected = ui.conditions.users.selected.peek();
        const index = selected.findIndex((item) => item.id === user.id);
        if (index > -1) {
          ui.conditions.users.selected.splice(index, 1);
        } else {
          ui.conditions.users.selected.push(user);
        }
      },
      reset() {
        ui.conditions.set(clone(defaultConditions));
        ui.conditions.modificationDate.set(undefined);
        ui.conditions.creationDate.set(undefined);
      },
      exclude: {
        page: {
          clearSelected() {
            ui.conditions.exclude.pages.set([]);
          },
          changeSelected(obj: BaseUiItem) {
            const selected = ui.conditions.exclude.pages.peek();
            const index = selected.findIndex((item) => item.id === obj.id);
            if (index > -1) {
              ui.conditions.exclude.pages.splice(index, 1);
            } else {
              ui.conditions.exclude.pages.push(obj);
            }
          },
        },
        tag: {
          clearSelected() {
            ui.conditions.exclude.tags.set([]);
          },

          changeSelected(obj: BaseUiItem) {
            const selected = ui.conditions.exclude.tags.peek();
            const index = selected.findIndex((item) => item.id === obj.id);
            if (index > -1) {
              ui.conditions.exclude.tags.splice(index, 1);
            } else {
              ui.conditions.exclude.tags.push(obj);
            }
          },
        },
      },
    },
    setHeight(vHeight: number) {
      const windowHeight = document.body.getBoundingClientRect().height;
      const MAX = windowHeight - 280;
      // const height = Math.max(MIN, Math.min(vHeight, MAX));
      ui.height.set(MAX);
    },
    onVisibleChange(cb: (b: boolean) => void) {
      return windowUi.visible.onChange(cb);
    },
    async loadingGraph() {
      console.time("Loading graph");
      if (ui.graph.loading.get()) return;
      ui.graph.loading.set(true);
      await delay(1);
      const start = Date.now();
      initCache(ui.conditions.get());
      if (Date.now() - start < 200) {
        await delay(200);
      }
      ui.graph.loading.set(false);
      // ui.graph.loaded.set(true);
      setGraphLoaded(true);
      console.timeEnd("Loading graph");
    },
    async renewGraph() {
      await delay();
      renewCache2(ui.conditions.get());
    },
    result: {
      // 用于重新打开时触发更新
      setList(list: ResultItem[]) {
        setList(list);
      },
    },
    tab: {
      toggleTabNameDialog() {
        /**
         *  延迟是因为, 按 Escape 键时会优先将 nameInput 置为 false, 从而导致在 @see {index.tsx|initListener} 中的判断条件错误
         *  */
        setTimeout(() => {
          windowUi.tab.nameInputing.toggle();
        }, 100);
      },
      changeName(index: number, str: string) {},
      deleteTab(id: string) {
        deleteFromTabs(id);
      },
      addTab(str: string) {
        const newTab = {
          ...defaultTab(),
          title: str,
        };
        addToTabs(newTab);
      },
      focus(v: string) {
        focusInTabs(v);
      },
    },
  },
  ui: {
    tab: {
      canDel(id: string) {
        return Tabs[0].id !== id;
      },
      getTabs() {
        return windowUi.tab.tabs.get();
      },
      isActive(v: string) {
        return v === windowUi.tab.active.get();
      },
      isTabNameInputing() {
        return windowUi.tab.nameInputing.get();
      },
    },
    mode: {
      isMaximize() {
        return windowUi.mode.max.get();
      },
    },
    isLoadingGraph() {
      return ui.graph.loading.get();
    },
    isFilterOpen() {
      return windowUi.filter.open.get();
    },
    isOpen() {
      const visible = windowUi.visible.get();
      return visible;
    },
    getSearch() {
      return ui.search.get();
    },
    getDateRange() {
      return [] as string[];
    },
    isTyped() {
      const filter = ui.conditions.filter.get();
      const filterCount =
        filter.page.exclude.length +
        filter.page.include.length +
        filter.tags.exclude.length +
        filter.tags.include.length;
      const modificationDate = ui.conditions.modificationDate.get();
      if (store.ui.conditions.isPageSelecting()) {
        return true;
      }

      return (
        ui.search.get()?.length ||
        filterCount > 0 ||
        modificationDate?.start ||
        modificationDate?.end
      );
    },
    hasValidSearch() {
      return ui.search.get()?.trim()?.length;
    },

    isMultipleSelection() {
      return ui.multiple.get();
    },
    isShowSelectedTarget() {
      return ui.showSelectedTarget.get();
    },
    getHistory() {
      return windowUi.history;
    },
    history: {
      getViewed() {
        return windowUi.history.viewed;
      },
      getSearch() {
        return windowUi.history.search;
      },
    },
    selectedCount() {
      return ui.selectedTarget.length;
    },
    sort: {
      selection() {
        return ui.conditions.sort.selection.get();
      },
      selectedText() {
        let r =
          ui.conditions.sort.selection[
            ui.conditions.sort.selected.get()
          ].text.get();
        return r;
      },
    },
    date: {
      lastEditRange() {
        const date = ui.conditions.modificationDate.get();
        if (!date) {
          return undefined;
        }
        return [
          new Date(date.start.toString()),
          new Date(date.end.toString()),
        ] as DateRange;
      },
      lastEdit() {
        const date = ui.conditions.modificationDate.get();
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
      isPageSelecting() {
        const r = windowUi.select.open.get();
        return r;
      },
      isBlockRefToString() {
        return ui.conditions.blockRefToString.get();
      },
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
      pages: {
        get() {
          return getAllPages()
            .map((item) => ({
              id: item.block[":block/uid"],
              text: item.block[":node/title"],
              dbId: item.block[":db/id"],
              backlinkCount: item.block[":block/_refs"]?.length || 0,
            }))
            .filter((item) => item.text);
        },
        isSelected(id: string) {
          return (
            ui.conditions.pages.selected
              .get()
              .findIndex((item) => item.id === id) > -1
          );
        },
        getSelected() {
          return ui.conditions.pages.selected.get();
        },
        hasCurrentPage() {
          const c = ui.conditions.pages.current.get();
          return ui.conditions.pages.selected.get().length === 0 && c.id;
        },
      },
      users: {
        get() {
          return getAllUsers()
            .map((item) => ({
              id: item[":db/id"],
              text: item[":user/display-name"],
            }))
            .filter((item) => item.text);
        },
        isSelected(id: string) {
          return (
            ui.conditions.users.selected
              .get()
              .findIndex((item) => item.id === id) > -1
          );
        },
        getSelected() {
          return ui.conditions.users.selected.get();
        },
      },
      exclude: {
        page: {
          getSelected() {
            return ui.conditions.exclude.pages.get();
          },
          isSelected(id: string) {
            return (
              ui.conditions.exclude.pages
                .get()
                .findIndex((item) => item.id === id) > -1
            );
          },
        },
        tag: {
          getSelected() {
            return ui.conditions.exclude.tags.get();
          },
          isSelected(id: string) {
            return (
              ui.conditions.exclude.tags
                .get()
                .findIndex((item) => item.id === id) > -1
            );
          },
        },
      },
      filter: {
        tag: {
          include() {
            return ui.conditions.filter.tags.include.get();
          },
          exclude() {
            return ui.conditions.filter.tags.exclude.get();
          },
        },
        page: {
          include() {
            return ui.conditions.filter.page.include.get();
          },
          exclude() {
            return ui.conditions.filter.page.exclude.get();
          },
        },
      },

      hasChanged() {
        const nowConditions = ui.conditions.get();
        // console.log(nowConditions, " --- ", defaultConditions, query.people.get());
        return [
          nowConditions.filter.page.exclude.length,
          nowConditions.filter.page.include.length,
          nowConditions.filter.tags.include.length,
          nowConditions.filter.tags.include.length,
          nowConditions.modificationDate !== undefined,
          nowConditions.creationDate !== undefined,
          nowConditions.users.selected.length !== 0,
          nowConditions.caseIntensive !== defaultConditions.caseIntensive,
          nowConditions.includeBlock !== defaultConditions.includeBlock,
          nowConditions.includePage !== defaultConditions.includePage,
          nowConditions.includeCode !== defaultConditions.includeCode,
          nowConditions.pages.selected.length !==
            defaultConditions.pages.selected.length,
          nowConditions.sort.selected !== defaultConditions.sort.selected,
        ].some((v) => v);
      },
    },
    isSelectedTarget(item: ResultItem) {
      const r = ui.selectedTarget.get().findIndex((o) => o.id === item.id) > -1;
      return r;
    },
    isSelectedTargetInResult(item: SelectResultItem) {
      return item.selected === 1;
    },
    selectedTarget() {
      return ui.selectedTarget;
    },

    result: {
      size() {
        return queryResult.getResult().length;
      },
      list() {
        return getList();
      },
      listSize() {
        return getList().length;
      },
      getListStyle() {
        const height = ui.height.get();
        return {
          height,
          minHeight: height,
        };
      },
    },

    hasExactPage() {
      const first = queryResult.getResult()[0];

      return first && first.isPage && first.text === ui.search.get();
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
      return getList().length > 0;
    },
  },
};

windowUi.visible.onChange(async (next) => {
  const el = document.querySelector("." + CONSTNATS.el);
  if (el) {
    if (!next) {
      el.classList.add("invisible");
    } else {
      el.classList.remove("invisible");
    }
  }
  if (!next) {
  } else {
    setTimeout(() => {
      triggerWhenSearchChange(ui.search.peek());
    }, 10);
    const page = await getCurrentPage();
    if (page) {
      ui.conditions.pages.current.set({
        id: page[":block/uid"],
        text: page[":node/title"],
      });
    }
  }
});

export const initStore = () => {
  const tabConfig = Tab.read();
  if (tabConfig) {
    Tabs = tabConfig;
    windowUi.tab.tabs.set(clone(tabConfig));
    focusInTabs(Tabs[0].id);
  }

  windowUi.history.viewed.set(recentlyViewed.getAll());
  windowUi.history.search.set(searchHistory.getAll());
};

// @ts-ignore
// window._store = store;
function deleteListItemByUid(id: string) {
  deleteFromCacheByUid(id);
  store.actions.searchAgain();
  // const foundIndex = ui.list.findIndex(item => item.id === id);
  // foundIndex > -1 && ui.list.splice(foundIndex, 1);
}
