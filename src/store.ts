import { DateRange } from "@blueprintjs/datetime";
import { observable, ObservableObject } from "@legendapp/state";
import dayjs, { Dayjs } from "dayjs";
import { PullBlock } from "roamjs-components/types";

const roamQuery = {
  findByString(str: string) {
    window.roamAlphaAPI.data.fast.q(
      `[:find (pull ?b [
      :block/string 
      :node/title 
      :block/uid 
 ]) :where [?b :block/uid]
              [?b :block/string ?t]
              [(clojure.string/includes? ?t "${str}")]
    ]`
    );
  }
};

export type ResultItem = {
  id: string;
  text: string;
  uid: string;
  editTime: number;
  createTime: number;
  createUser: number;
  isPage: boolean;
  editUser: number;
  paths: string[];
  isSelected: boolean;
};

type SelectDate =
  | {
      // 这样定义, 可以在不同的属性中复制
      start: Dayjs;
      end: Dayjs;
    }
  | undefined;
const query = observable({
  creationDate: undefined as SelectDate,
  modificationDate: undefined as SelectDate,
  search: "wwe",
  people: [],
  inPages: [],
  result: [
    {
      id: "1",
      text: `there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        `,
      uid: "q1",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: false,
    },
    {
      id: "2",
      text: "there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. ",

      uid: "we",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: true,
    },
    {
      id: "3",
      text: `there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        `,
      uid: "q11",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: false,
    },
    {
      id: "4",

      text: "there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. ",

      uid: "weq",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: true,
    },
    {
      id: "5",

      text: `there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. 
        `,
      uid: "q1w",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: false,
    },
    {
      id: "6",

      text: "there are too much 总是 game over there nothing will leave empty, that could be the worse thing every before. ",

      uid: "wee",
      paths: [
        "page/jkj空间定居 帆赛发 kjowokksjksjkjskdjf",
        "block1 靖峰竞赛就赛警方吃we 人 english",
        "block2",
      ],
      isPage: true,
    },
  ] as ResultItem[],
});

const copySelectedTarget = observable([] as ResultItem[]);

const ui = observable({
  open: false,
  multiple: false,
  selectedTarget: [] as ResultItem[],
  showSelectedTarget: false,
  conditions: {
    onlyPage: false
  },
  copySelectedTarget,
  previewSelected: false,
  history: {
    search: [
      {
        id: 1,
        text: "qwe33"
      }
    ]
  },
  sort: {
    selection: [
      {
        text: "-"
      },
      { text: "By creation - recent to oldest" },
      {
        text: "By creation - oldest to recent"
      },
      { text: "By modification - recent to oldest" },
      { text: "By modification - oldest to  recent" }
    ],
    selected: 0
  },
  tags: [] as string[],
  pages: {
    selected: [] as string[],
    items: [] as string[]
  }
});

const selectedTargetStore = new Map<string, ObservableObject<ResultItem>>();

export const store = {
  db: observable({
    ui,
    query
  }),
  actions: {
    changeShowSelectedTarget() {
      ui.showSelectedTarget.toggle();
      if (ui.showSelectedTarget.peek()) {
        ui.copySelectedTarget.set(
          observable(query.result.get().filter((o) => o.isSelected))
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

        query.result.forEach((item) => {
          var a = selectedTargetStore.get(item.peek().uid);
          console.log(item, " = item");
        });

        query.result.set(query.result.get());
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
      selectedTargetStore.set(item.peek().uid, item);
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
        end: dayjs(range[1]).startOf("day").add(1, "day").subtract(1, "second")
      });
    },
    changeSearch(s: string) {
      query.search.set(s);
    },
    saveHistory(str: string) {
      ui.history.search.push({
        id: Date.now(),
        text: str
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
      }
    },
    conditions: {
      toggleOnlyPage() {
        ui.conditions.onlyPage.toggle();
      }
    },
    changeTags(tags: string[]) {
      ui.tags.set(tags);
    },
    changeSelectedPages(pages: string[]) {
      ui.pages.selected.set(pages);
    }
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
      return query.result.get().filter((o) => o.isSelected).length;
    },
    sort: {
      selection() {
        return ui.sort.selection.get();
      },
      selectedText() {
        let r = ui.sort.selection[ui.sort.selected.get()].text.get();
        return r;
      }
    },
    date: {
      lastEditRange() {
        const date = query.modificationDate.get();
        if (!date) {
          return undefined;
        }
        return [
          new Date(date.start.toString()),
          new Date(date.end.toString())
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
      }
    },
    conditions: {
      isOnlyPage() {
        return ui.conditions.onlyPage.get();
      }
    },
    tags: {
      getTags() {
        return ui.tags.get();
      }
    },
    isSelectedTarget(item: ObservableObject<ResultItem>) {
      // const r =
      //   ui.selectedTarget.get().findIndex((o) => o.uid === item.peek().uid) >
      //   -1;
      console.log(" =r change", item.peek().uid);
      return item.isSelected.get();
    },
    pages: {
      get() {
        return ui.pages.items.get();
      },
      isSelected(text: string) {
        return ui.pages.selected.get().indexOf(text) > -1;
      }
    },
    result: {
      size() {
        return query.result.get().length;
      },
      list() {
        if (ui.conditions.onlyPage.get()) {
          const v = query.result.filter((item) => item.isPage.get()) as unknown as ResultItem[];
          return observable(v);
        }
        return query.result;
      }
    },
    copySelectedTarget() {
      return ui.copySelectedTarget;
    }
  }
};

ui.open.onChange((next) => {
  if (next !== true) {
    query.search.set("");
  }
});

// @ts-ignore
window._store = store;
