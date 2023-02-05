import { TextArea, Toast, Toaster } from "@blueprintjs/core";
import { DateRange } from "@blueprintjs/datetime";
import {
  batch,
  computed,
  observable,
  ObservableObject,
  observe,
} from "@legendapp/state";
import dayjs, { Dayjs } from "dayjs";
import { ReactNode } from "react";
import { PullBlock } from "roamjs-components/types";
import { recentlyViewed, searchHistory, Tab } from "./extentionApi";
import {
  clone,
  CONSTNATS,
  debounce,
  extension_helper,
} from "./helper";
import { Query } from "./query";
import {
  CacheBlockType,
  deleteFromCacheByUid,
  findLowestParentFromBlocks,
  getAllPages,
  getAllUsers,
  getCurrentPage,
  getMe,
  getPageUidsFromUids,
  getParentsStrFromBlockUid,
  initCache,
  opens,
  renewCache2,
} from "./roam";

const delay = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

export function findLowestParentFromResult(block: ResultItem) {
  if (block.children.length) {
    const lowestParent = findLowestParentFromBlocks(
      block.children.map((item) => ({ uid: item.id }))
    );
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
          (block) => block.id !== lowestParent[":block/uid"]
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
  children: ResultItem[];
  createUser: string | number;
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
  caseIntensive: true,
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
    tags: [] as (BaseUiItem)[],
    blocks: [] as BaseUiItem[]
  },
  filter: {
    tags: {
      include: [] as BaseUiItem[],
      exclude: [] as BaseUiItem[]
    },
    page: {
      include: [] as BaseUiItem[],
      exclude: [] as BaseUiItem[]
    }
  }
};

const defaultTab = () => ({
  title: 'Search+',
  id: window.roamAlphaAPI.util.generateUID(),
  graph: {
    loading: false,
    loaded: false,
  },
  search: "",
  multiple: false,
  selectedTarget: [] as SelectResultItem[],
  showSelectedTarget: false,
  conditions: clone(defaultConditions),
  loading: false,
  height: MIN,
});

type ITab = ReturnType<typeof defaultTab>
// 为什么要有 Tabs 和 windowUi.tab.tabs
// ui 是读取 Tabs[activeIndex] 的值, 如果直接调用 ui.set(Tabs[activeIndex]) 会覆盖掉 windowUi.tab.tabs 中的值
// 所以需要 Tabs 作为原始值, 来保存修改后的数据

let Tabs = ([defaultTab()]) as ITab[];

const addToTabs = (newTab: ITab) => {
  console.log(Tabs.length, windowUi.tab.tabs.length)
  Tabs.push(newTab);
  windowUi.tab.tabs.push(newTab);
  console.log(Tabs.length, windowUi.tab.tabs.length)
  Tab.save(Tabs);
  focusInTabs(newTab.id);
}

const deleteFromTabs = (id: string) => {
  const index = Tabs.findIndex(tab => tab.id === id);
  Tabs.splice(index, 1);
  windowUi.tab.tabs.splice(index, 1);
  focusInTabs(Tabs[0].id);
  Tab.save(Tabs);
};

const focusInTabs = (v: string) => {
  const prevFocus = windowUi.tab.active.get();
  let index = Tabs.findIndex(tab => tab.id === prevFocus);
  if (index > -1)
    Tabs[index] = ui.get();
  windowUi.tab.active.set(v);
  index = Tabs.findIndex(tab => tab.id === v);
  ui.set(Tabs[index]);
}


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
    open: false
  }
});

let ui = observable(Tabs.find(tab => tab.id === windowUi.tab.active.get()))
ui.onChange(v => {
  const index = Tabs.findIndex(tab => tab.id === v.id)
  Tabs[index] = v;
  Tab.save(Tabs);
})
ui.conditions.blockRefToString.onChange(async v => {
  const search = ui.search.get();
  store.actions.changeSearch("");
  await store.actions.loadingGraph();
  store.actions.changeSearch(search);
})

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

let _result: ResultItem[] = [];
const setResult = (result: ResultItem[]) => {
  _result = result;
  query.result.set([]);
};
const getResult = () => {
  query.result.get();
  return _result;
};

let _list: ResultItem[] = [];
const setList = (result: ResultItem[]) => {
  _list = result;
  query.list.set([]);
};

const getList = () => {
  query.list.get();
  return _list;
};

let cancelPre = () => { };
const trigger = debounce(
  async (config: Omit<QueryConfig, 'search'> & { search: string }) => {
    cancelPre();
    if (!config.search) {
      return;
    }
    // console.log(search, " start search");
    const queryAPi = Query({
      ...config,
      search: keywordsBuildFrom(config.search),
    });
    cancelPre = queryAPi.cancel;
    await queryAPi.promise.then(([pages, topBlocks, lowBlocks]) => {
      // console.log(pages.map( item => item[':block/uid']), topBlocks, " - set result-- " + search, lowBlocks);
      console.time("promise");
      batch(() => {
        // query.result.set({
        //   pages,
        //   topBlocks,
        //   lowBlocks,
        // });
      });
      console.timeEnd("promise");
      console.time("2222");

      const result: ResultItem[] = [
        ...pages.map((block) => {
          return {
            id: block.block[":block/uid"],
            text: block.block[":node/title"],
            editTime: block.block[":edit/time"] || block.block[":create/time"],
            createTime: block.block[":create/time"],
            isPage: true,
            paths: [],
            isSelected: false,
            children: [],
            createUser: block.block[":create/user"]?.[":db/id"],
          };
        }),
        ...topBlocks.map((block) => {
          return {
            id: block.block[":block/uid"],
            text: block.block[":block/string"],
            editTime: block.block[":edit/time"] || block.block[":create/time"],
            createTime: block.block[":create/time"],
            isPage: false,
            createUser: block.block[":create/user"]?.[":db/id"],
            // paths: block.parents.map(
            //   (item) => item[":block/string"] || item[":node/title"]
            // ),
            paths: [],
            isSelected: false,
            children: [],
          };
        }),
        ...(lowBlocks || []).map((item) => {
          // 找到这些 children 层级最低的共同 parent block

          if (item.children.length > 1) {
            // const lowestParent = findLowestParentFromBlocks(
            //   item.children.map((item) => ({ uid: item.block[":block/uid"] }))
            // );
            // if (lowestParent) {
            // }
          }
          return {
            id: item.page.block[":block/uid"],
            text: item.page.block[":node/title"],
            editTime:
              item.page.block[":edit/time"] || item.page.block[":create/time"],
            createTime: item.page.block[":create/time"],
            createUser: item.page.block[":create/user"]?.[":db/id"],
            isPage: false,
            paths: [],
            isSelected: false,
            children: item.children.map((block) => {
              return {
                id: block.block[":block/uid"],
                text: block.block[":block/string"],
                editTime:
                  block.block[":edit/time"] || block.block[":create/time"],
                createTime: block.block[":create/time"],
                isPage: false,
                // paths: block.parents.map(
                //   (item) => item[":block/string"] || item[":node/title"]
                // ),
                paths: [],
                isSelected: false,
                children: [],
                createUser: block.block[":create/user"]?.[":db/id"],
              };
            }),
          };
        }),
      ];
      // _result = result;
      // console.log(" ui result = ", result);
      // ui.result.set([]);
      console.timeEnd("2222");
      setResult(result);
    });
    ui.loading.set(false);
  },
  500
);
let prevSearch = "";

const triggerWhenSearchChange = async (next: string) => {
  if (!next) {
    return;
  }
  const nextStr = next.trim();
  if (nextStr !== prevSearch) {
    ui.loading.set(!!nextStr);
    try {
      // const selectedPagesUids = ui.conditions.pages.selected.peek();
      const caseIntensive = ui.conditions.caseIntensive.peek();
      const pageFilter = ui.conditions.filter.page.peek();
      const tagFilter = ui.conditions.filter.tags.peek();
      await trigger({
        search: nextStr,
        caseIntensive,
        // uids: selectedPagesUids.map((item) => item.id),
        exclude: {
          pages: pageFilter.exclude.map(item => item.id),
          tags: tagFilter.exclude.map(item => item.dbId!),
        },
        include: {
          pages: pageFilter.include.map(item => item.id),
          tags: tagFilter.include.map(item => item.dbId!),
        }
      });
    } catch (e) {
      console.error(e);
      ui.loading.set(false);
    }
  }
};

const disposeSearch = ui.search.onChange(async (next) => {
  triggerWhenSearchChange(next);
});

const dispose = observe(async () => {
  const search = ui.search.peek().trim();
  const caseIntensive = ui.conditions.caseIntensive.get();
  // const exclude = ui.conditions.exclude.get();
  const pageFilter = ui.conditions.filter.page.get();
  const tagFilter = ui.conditions.filter.tags.get();
  ui.loading.set(!!search);
  try {
    await trigger(
      {
        search,
        caseIntensive,
        // uids: selectedPagesUids.map((item) => item.id),
        exclude: {
          pages: pageFilter.exclude.map(item => item.id),
          tags: tagFilter.exclude.map(item => item.dbId!),
        },
        include: {
          pages: pageFilter.include.map(item => item.id),
          tags: tagFilter.include.map(item => item.dbId!),
        }
        // exclude: {
        //   pageUids: exclude.pages.map(item => item.id),
        //   tagsUids: exclude.tags.map(item => item.dbId!)
        // }
      }
    );
  } catch (e) {
    console.error(e, " ---");
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
  let uiResult = getResult();

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
      result = users.some((user) => user.id === item.createUser);
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
  const modificationDate = ui.conditions.modificationDate.get();
  const creationDate = ui.conditions.creationDate.get();

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

  // console.log(ui.conditions.includeCode.get(), " - get render");
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
  uiResult = uiResult.slice().sort(sortFns[ui.conditions.sort.selected.get()]);
  // console.log("sorted-", uiResult);
  // _list = uiResult;
  // ui.list.set([]);
  setList(uiResult);
});

const disposeUiResultSort = observe(() => {
  // TODO:
});

const disposeUiSelectablePages = observe(() => {
  // const list = getResult();
  // const pages = list
  //   .filter((item) => item.isPage)
  //   .map((item) => ({
  //     id: item.id,
  //     text: item.text as string,
  //   }));
  // const pageBlocks = pull_many(
  //   getPageUidsFromUids(
  //     list.filter((item) => !item.isPage).map((item) => item.id)
  //   )
  // );
  // console.log(
  //   [...pages,
  //   ...pageBlocks.map((item) => ({
  //     id: item[":block/uid"],
  //     text: item[":node/title"],
  //   }))].filter(item => item.text),
  //   " ----"
  // );
  // ui.conditions.pages.items.set(
  //   [
  //     ...pages,
  //     ...pageBlocks.map((item) => ({
  //       id: item.block[":block/uid"],
  //       text: item.block[":node/title"],
  //     })),
  //   ].filter((item) => item.text)
  // );
});

extension_helper.on_uninstall(() => {
  dispose();
  disposeSearch();
  disposeUiResult();
  disposeUiResultSort();
  disposeUiSelectablePages();
});

const saveToSearchViewed = (items: ResultItem[]) => {
  const viewed = windowUi.history.viewed.peek();
  windowUi.history.viewed.push(
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
  }),
  actions: {
    toggleMaximize() {
      windowUi.mode.max.set((prev) => !prev);
    },
    changeShowSelectedTarget() {
      ui.showSelectedTarget.toggle();
      if (ui.showSelectedTarget.peek()) {
      } else {
        console.log("ahahah");
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
    toggleDialog() {
      if (store.ui.conditions.isPageSelecting()) {
        return
      }
      if (windowUi.visible.get()) {
        if (windowUi.filter.open.get()) {
          store.actions.toggleFilter();
        } else {
          store.actions.closeDialog();
        }
      } else {
        store.actions.openDialog();
        if (!ui.graph.loaded.get()) {
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
      // console.log(s, " ---s");
      ui.search.set(s);
    },
    searchAgain() {
      triggerWhenSearchChange(ui.search.peek());
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
        .filter(item => item.selected === 1)
        .forEach((item) => {
          opens.sidebar(item.id)
        })
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
        .filter(item => item.selected === 1)
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
            }
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
            }
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

          }
        }
      },
      toggleSelect() {
        setTimeout(() => {
          windowUi.select.open.toggle();
        }, 100)
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
        ui.conditions.pages.selected.set([])
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
          }
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
          }
        }
      }
    },
    setHeight(vHeight: number) {
      const windowHeight = document.body.getBoundingClientRect().height;
      const MAX = windowHeight - 250;
      const height = Math.max(MIN, Math.min(vHeight, MAX));
      ui.height.set(height);
    },
    onVisibleChange(cb: (b: boolean) => void) {
      return windowUi.visible.onChange(cb);
    },
    async loadingGraph() {
      ui.graph.loading.set(true);
      await delay(10);
      const start = Date.now();
      initCache(ui.conditions.get());
      if (Date.now() - start < 200) {
        await delay(200);
      }
      ui.graph.loading.set(false);
      ui.graph.loaded.set(true);
    },
    async renewGraph() {
      await delay();
      renewCache2(ui.conditions.get());
    },
    result: {
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
        }, 100)
      },
      changeName(index: number, str: string) {

      },
      deleteTab(id: string) {
        deleteFromTabs(id);
      },
      addTab(str: string) {
        const newTab = ({
          ...defaultTab(),
          title: str
        })
        addToTabs(newTab)
      },
      focus(v: string) {
        focusInTabs(v);
      }
    }
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
        return windowUi.tab.nameInputing.get()
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
      return ui.search.get()?.length;
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
        return windowUi.select.open.get()
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
              dbId: item.block[":db/id"]
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
            return ui.conditions.exclude.pages.get()
          },
          isSelected(id: string) {
            return ui.conditions.exclude.pages.get().findIndex(item => item.id === id) > -1
          }
        },
        tag: {
          getSelected() {
            return ui.conditions.exclude.tags.get()
          },
          isSelected(id: string) {
            return ui.conditions.exclude.tags.get().findIndex(item => item.id === id) > -1
          }
        }
      },
      filter: {
        tag: {
          include() {
            return ui.conditions.filter.tags.include.get();
          },
          exclude() {
            return ui.conditions.filter.tags.exclude.get();
          }
        },
        page: {
          include() {
            return ui.conditions.filter.page.include.get();
          },
          exclude() {
            return ui.conditions.filter.page.exclude.get();
          }
        }
      },

      hasChanged() {
        const nowConditions = ui.conditions.get();
        // console.log(nowConditions, " --- ", defaultConditions, query.people.get());
        return [
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
        return getResult().length;
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

    isLoading() {
      return ui.loading.get();
      // return true;
    },
    getPathsFromUid(uid: string) {
      return getParentsStrFromBlockUid(uid);
    },
    size: {
      resultList() { },
    },
    hasResult() {
      return store.ui.getSearch().length > 0 && getResult().length > 0;
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
windowUi.open.onChange((next) => {
  if (next !== true) {
    // ui.search.set("");
  } else {
  }
});

export const initStore = (extensionAPI: RoamExtensionAPI) => {
  const tabConfig = Tab.read()
  if (tabConfig) {
    Tabs = tabConfig;
    windowUi.tab.tabs.set(clone(tabConfig));
    focusInTabs(Tabs[0].id);
  }
  windowUi.history.viewed.set(recentlyViewed.getAll());
  windowUi.history.search.set(searchHistory.getAll());
};

// @ts-ignore
window._store = store;
function deleteListItemByUid(id: string) {
  deleteFromCacheByUid(id);
  store.actions.searchAgain();
  // const foundIndex = ui.list.findIndex(item => item.id === id);
  // foundIndex > -1 && ui.list.splice(foundIndex, 1);
}
