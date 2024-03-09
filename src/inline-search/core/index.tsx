import React, { useEffect, useLayoutEffect, useRef } from "react";

import { FocusStyleManager, Icon, InputGroup, Menu } from "@blueprintjs/core";

import "./app.css";

FocusStyleManager.onlyShowFocusOnTabs();

import { useState } from "react";
import { makeAutoObservable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { Button, MenuItem, Popover } from "@blueprintjs/core";
import "normalize.css";
import type { IConnector, Block, IFilterField } from "./type";
import { RefFilter } from "./ref-page";
import {
  FieldView,
  FieldsSelect,
  OperatorsSelect,
  RemoveCondition,
  RemoveConditionGroup,
} from "./comps";
import { CreatedDateFilter, EditDateFilter } from "./date";
import { ContentFilter } from "./content";
import Fuse, { FuseResult } from "fuse.js";
import { BlockRefFilter } from "./ref-block";
import { delay } from "../../delay";
import { PullBlock } from "roamjs-components/types";
import shuffle from "lodash.shuffle";
import { deleteFromCacheByUid } from "../../roam";
import { debounce } from "../../helper";

let id = 0;
// ------------------------------
class FilterPlaceholder {
  constructor(private group: FilterGroup, public model: SearchInlineModel) {
    makeAutoObservable(this);
  }
  id = id++;
  mounted = false;

  onSelect(name: string) {
    // console.log(`onSelect ${name}`);
    this.delegate = this.filterOptions
      .find((option) => option.name === name)!
      .gen();

    return this.delegate;
  }
  filterOptions = [
    // {
    //   name: "Page title",
    //   gen: () => new TitleFilter(this.model),
    // },
    {
      name: ContentFilter.diaplayName,
      gen: () => new ContentFilter(this.model),
    },
    {
      name: RefFilter.displayName,
      gen: () => new RefFilter(this.model),
    },
    {
      name: BlockRefFilter.displayName,
      gen: () => new BlockRefFilter(this.model),
    },
    {
      name: CreatedDateFilter.diaplayName,
      gen: () => new CreatedDateFilter(this.model),
    },
    {
      name: EditDateFilter.diaplayName,
      gen: () => new EditDateFilter(this.model),
    },
  ];

  delegate: null | IFilterField = null;

  toJSON() {
    return {
      id: this.id,
      mounted: this.mounted,
      delegate: this.delegate
        ? {
            name: this.delegate.label,
            operator: this.delegate.activeOperator.label,
            value: this.delegate.activeOperator.value,
          }
        : undefined,
    };
  }

  hydrate(filter: FiltersType) {
    this.id = filter.id;
    this.mounted = filter.mounted;
    if (!filter.delegate) {
      return;
    }
    this.delegate = this.onSelect(filter.delegate.name);
    if (!this.delegate) {
      return;
    }
    this.delegate.onSelect(filter.delegate.operator);
    this.delegate.activeOperator.value = filter.delegate.value;
  }
}

// ---------------- filter end -------------

// ---------------- Operator start ------------

type FiltersType = {
  id: number;
  mounted: boolean;
  delegate?: { name: string; operator: string; value: string };
};

type GroupsType = {
  filters: FiltersType[];
  groups: GroupsType[];
  connector: IConnector;
};

class FilterGroup {
  id = Date.now();
  creating = true;
  filters: FilterPlaceholder[] = [];
  groups: FilterGroup[] = [];
  connector: IConnector = "AND";

  constructor(public model: SearchInlineModel, private parent?: FilterGroup) {
    makeAutoObservable(this);
  }

  changeParent(parent: FilterGroup) {
    this.parent = parent;
  }

  get filterMethod() {
    if (this.connector === "AND") {
      return "And";
    } else {
      return "Or";
    }
  }

  isValidGroup(): boolean {
    return (
      this.filters.some((filter) => filter.delegate) ||
      this.groups.some((group) => group.isValidGroup())
    );
  }

  removeCondition(i: number) {
    this.filters.splice(i, 1);
    this.model.search();
  }

  removeConditionGroup(i: number) {
    this.groups.splice(i, 1);
    this.model.search();
  }

  hydrate(json: GroupsType) {
    this.filters = json.filters.map((filter) => {
      const instance = new FilterPlaceholder(this, this.model);
      instance.hydrate(filter);
      return instance;
    });

    this.groups = json.groups.map((groupData) => {
      const group = new FilterGroup(this.model, this);
      group.hydrate(groupData);
      return group;
    });

    this.connector = json.connector;
  }

  toggleConnector() {
    this.connector = this.connector === "AND" ? "OR" : "AND";
    this.model.search();
  }

  addFilterCondition(filter?: FilterPlaceholder) {
    this.filters.push(filter || new FilterPlaceholder(this, this.model));
  }

  addFilterConditionGroup(group?: FilterGroup) {
    const newGroup = new FilterGroup(this.model, this);
    newGroup.addFilterCondition();
    this.groups.push(group || newGroup);
  }

  groupCurrentConditions() {
    if (this.parent) {
      const parent = this.parent;
      const index = parent.groups.findIndex((g) => g === this);
      const newGroup = new FilterGroup(this.model, parent);
      // if(this.group.groups.length === 0)
      newGroup.addFilterCondition();
      this.parent = newGroup;
      newGroup.addFilterConditionGroup(this);
      parent.groups.splice(index, 1, newGroup);
      // console.log(newGroup, " condition ");
    } else {
      this.model.groupCurrentConditions();
    }
  }

  async filterData(_source: Block[]): Promise<Block[]> {
    if (this.connector === "AND") {
      let source = _source;
      // console.log(source, " = ");
      for (const filter of this.filters) {
        if (filter.delegate) {
          const result = await filter.delegate.filterData(source);
          source = result;
        }
      }

      const groups = this.groups.filter((group) => {
        // return group.filters.length > 0 || group.groups.length > 0;
        return group.isValidGroup();
      });
      for (const group of groups) {
        source = await group.filterData(source);
      }
      return source;
    } else {
      let total = [] as Block[];

      for (const filter of this.filters) {
        if (filter.delegate) {
          total = [...total, ...(await filter.delegate.filterData(_source))];
        }
      }

      const groups = this.groups.filter((group) => {
        // return group.filters.length > 0 || group.groups.length > 0;
        return group.isValidGroup();
      });
      for (const group of groups) {
        const result = group.filterData(_source);

        total = [...total, ...(await result)];
      }
      return uniqueArray(total);
    }

    function uniqueArray<T extends Block>(objs: T[]) {
      // 根据对象的 uid 进行去重
      return Array.from(
        new Map(objs.map((obj) => [obj[":block/uid"], obj])).values()
      );
    }
  }

  toJSON(): GroupsType {
    const filters = this.filters.map((filter) => {
      return filter.toJSON();
    });
    const groups = this.groups.map((group) => group.toJSON());
    return {
      filters,
      groups,
      connector: this.connector,
    };
  }
}

// ---------------- Operator end ------------

export class InlineRoamBlockInfo {
  title = "Inline search of ";

  constructor(
    private id: string,
    private searchModelGetter: () => SearchInlineModel
  ) {
    makeAutoObservable(this);
  }

  get searchModel() {
    return this.searchModelGetter();
  }
  private hydrateImpl(blockProps: {
    query?: string;
    type?: string;
    json?: {};
    title?: string;
    viewType: string;
  }) {
    this.searchModel.filter.hydrate({
      query: blockProps.query,
      type: blockProps.type || "all",
      viewType: blockProps.viewType,
    });

    if (blockProps.json) {
      this.searchModel.hydrate(blockProps.json);
    }

    if (blockProps.title) {
      this.title = blockProps.title;
    }

    setTimeout(() => {
      layoutChangeEvent.dispatch();
    }, 200);
  }
  hydrateByData(blockProps: Record<string, any>) {
    const json = blockProps["inline-search"];
    // console.log(blockProps, " = props");
    this.hydrateImpl({
      title: blockProps["inline-search-title"],
      json: json ? JSON.parse(json) : undefined,
      query: blockProps["inline-search-result-filter-query"] || "",

      type: blockProps["inline-search-result-filter-type"] || "all",
      viewType:
        blockProps["inline-search-result-filter-view-type"] || "side-menu",
    });
    saveConfigToFirstChild(this.id, JSON.stringify(blockProps));
  }

  hydrate() {
    // 修改为从当前的第一个子 block 获取
    const blockProps = getConfigFromFirstChild(this.id);

    if (blockProps) {
      this.hydrateByData(blockProps);
    }
  }
  getBlockProps() {
    return getConfigFromFirstChild(this.id);
  }
  private getInfo() {
    const blockProps = this.getBlockProps();
    return Object.keys(blockProps).reduce((p, c) => {
      p[c] = blockProps[c as keyof typeof blockProps];
      return p;
    }, {} as Record<string, unknown>);
  }
  saveFilterJson(json: {}) {
    saveConfigToFirstChild(
      this.id,
      JSON.stringify({
        ...this.getInfo(),
        "inline-search": json,
      })
    );
  }

  saveResultViewType(type: string) {
    saveConfigToFirstChild(
      this.id,
      JSON.stringify({
        ...this.getInfo(),
        "inline-search-result-filter-view-type": type,
      })
    );
  }
  saveResultFilterQuery(query: string) {
    saveConfigToFirstChild(
      this.id,
      JSON.stringify({
        ...this.getInfo(),
        "inline-search-result-filter-query": query,
      })
    );
  }

  saveResultFilterType(type: string) {
    saveConfigToFirstChild(
      this.id,
      JSON.stringify({
        ...this.getInfo(),
        "inline-search-result-filter-type": type,
      })
    );
  }

  changeTitle(v: string): void {
    this.title = v;
  }

  saveTitle(v: string) {
    saveConfigToFirstChild(
      this.id,
      JSON.stringify({
        ...this.getInfo(),
        "inline-search-title": v,
      })
    );
  }
}

export function useSearchInlineModel(inlineModel: InlineRoamBlockInfo) {
  const model = useState(() => new SearchInlineModel(inlineModel))[0];
  return model;
}

const fuseOptions = {
  // isCaseSensitive: false,
  // includeScore: true,
  // shouldSort: true,
  includeMatches: true,
  // findAllMatches: true,
  // minMatchCharLength: 1,
  // location: 0,
  // threshold: 0.4,
  // distance: 80,
  useExtendedSearch: true,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [":block/string", ":node/title"],
};

export class FuseResultModel {
  _updateTime = Date.now();
  shuffle() {
    this.result = shuffle(this.result);
  }
  _result: FuseResult<PullBlock>[] = [];

  get result() {
    this._updateTime;
    return this._result;
  }

  set result(v) {
    this._result = v;
    this._updateTime = Date.now();
  }
  constructor() {
    makeAutoObservable(this, { _result: false });
  }
}

export class ResultFilterModel {
  constructor(public model: SearchInlineModel) {
    makeAutoObservable(this, {
      result: false,

      fuseResultModel: false,
    });
  }
  fuseResultModel = new FuseResultModel();

  type = "all";
  viewType = "side-menu";
  query = "";

  queryChangedTime = Date.now();

  changeViewType(type: string) {
    this.viewType = type as "grid";
    this.model.blockInfo.saveResultViewType(type);
  }

  changeType = (v: string) => {
    this.type = v;
    this.model.blockInfo.saveResultFilterType(v);
  };

  changeQuery = (v: string) => {
    this.query = v;
    this.model.blockInfo.saveResultFilterQuery(v);
    this.changeQueryTime();
  };

  changeQueryTime = debounce(() => {
    this.queryChangedTime = Date.now();
  }, 250);

  filter = (bs: Block[]) => {
    switch (this.type) {
      case "all":
        return bs;
      case "page":
        return bs.filter((b) => !b[":block/parents"]);
      case "block":
        return bs.filter((b) => b[":block/parents"]);
    }
    return bs;
  };

  get result() {
    return this.filter(this.model.searchResult);
  }

  shuffle() {
    this.fuseResultModel.shuffle();
  }

  registerListeners(cb: (data: FuseResultModel) => void) {
    cb(this.fuseResultModel);
    const dispose = reaction(
      () => [this.queryChangedTime, this.result] as const,
      ([_queryTime, result]) => {
        const query = this.query;
        // console.log(query, " = query");
        if (!query.trim()) {
          console.time(" result -");
          this.fuseResultModel.result = this.result.map((item) => ({
            item,
            refIndex: 0,
            matches: [],
          }));
          console.timeEnd(" result -");

          return;
        }
        const indexs = Fuse.createIndex(fuseOptions.keys, result);
        this.fuseResultModel.result = new Fuse(
          result,
          fuseOptions,
          indexs
        ).search(query.trim());
      },
      {
        name: "fuse",
        delay: 500,
        fireImmediately: true,
      }
    );
    return dispose;
  }

  get hasFilter() {
    return this.type !== "all" || this.query !== "";
  }

  reset() {
    this.type = "all";
    this.query = "";
    this.model.blockInfo.saveResultFilterQuery("");
    this.model.blockInfo.saveResultFilterType("all");
  }

  hydrate(json: { query: string; type: string; viewType: string }) {
    this.query = json.query;
    this.type = json.type;
    this.viewType = json.viewType;
  }

  deleteById(id: string) {
    this.model.deleteById(id);
  }
}
export class SearchInlineModel {
  group = new FilterGroup(this);
  _updateTime = Date.now();
  result: Block[] = [];
  filter = new ResultFilterModel(this);

  isLoading = false;

  constructor(public blockInfo: InlineRoamBlockInfo) {
    makeAutoObservable(this, {
      result: false,
      searchResult: false,
    });
  }

  groupCurrentConditions() {
    const newGroup = new FilterGroup(this);
    newGroup.addFilterCondition();
    newGroup.addFilterConditionGroup(this.group);
    this.group.changeParent(newGroup);
    this.group = newGroup;
  }

  /**
   * 重置为获取 Cache 中的数据
   */
  getData: () => Block[] = () => {
    return [];
  };

  deleteById = (id: string) => {
    this.result = this.result.filter((item) => item[":block/uid"] !== id);
    this._updateTime = Date.now();
    window.roamAlphaAPI.deletePage({
      page: {
        uid: id,
      },
      block: {
        uid: id,
      },
    });
    //  window.roamAlphaAPI.deleteBlock({
    //    block: {
    //      uid: id,
    //    },
    //  });
    deleteFromCacheByUid(id);
  };
  /**
   * 被 SearchFilter 重置触发更新
   */

  get searchResult() {
    this._updateTime; // 用于触发更新
    return this.result;
  }

  private searchKeyIndex = 0;
  search = async () => {
    // set to field
    this.isLoading = true;
    await delay(10);
    const index = ++this.searchKeyIndex;
    const result = await this.group.filterData(this.getData());
    if (index !== this.searchKeyIndex) {
      return;
    }
    runInAction(() => {
      this._updateTime = Date.now();
      console.time("result");
      // this.result = [...result.map((item) => ({ ...item }))];
      this.result = result;
      // console.log(this.result, " = result ");
      this.save();
      this.isLoading = false;
      console.timeEnd("result");
    });
  };

  hydrate(json: any) {
    // console.log(`hydrate: `, json);
    this.group.hydrate(json);
    // this.search();
  }

  private save() {
    this.blockInfo.saveFilterJson(JSON.stringify(this.group.toJSON()));
  }
}

// ------------------- React Start ---------------

export const SearchInline = observer(
  ({ model }: { model: SearchInlineModel }) => {
    useEffect(() => {
      layoutChangeEvent.dispatch();
    }, []);
    return <SearchGroup group={model.group} onSearch={() => model.search()} />;
  }
);

const SearchGroup = observer(
  ({ group, onSearch }: { group: FilterGroup; onSearch: () => void }) => {
    return (
      <div className="search-group">
        <div className="flex">
          <SearchFilters group={group} onSearch={onSearch} />
        </div>
        <section className="search-group-btns">
          <Button
            onClick={() => {
              group.addFilterCondition();
              layoutChangeEvent.dispatch();
            }}
            minimal
            intent="primary"
            small
          >
            Add filter condition
          </Button>
          <Popover
            interactionKind="hover"
            content={
              <Menu>
                <MenuItem
                  onClick={() => {
                    group.addFilterConditionGroup();
                    layoutChangeEvent.dispatch();
                  }}
                  text="Add filter condition group"
                />
                <MenuItem
                  onClick={() => {
                    group.groupCurrentConditions();
                    layoutChangeEvent.dispatch();
                  }}
                  text="Group current conditions and Add"
                />
              </Menu>
            }
          >
            <Button minimal icon="caret-down" />
          </Popover>
        </section>
      </div>
    );
  }
);

const AndOrToggle = observer(({ group }: { group: FilterGroup }) => {
  return (
    <div
      className="flex"
      style={{ alignItems: "center", justifyContent: "center" }}
      onClick={(e) => {
        e.preventDefault();
        group.toggleConnector();
      }}
    >
      {group.filterMethod}
      <Icon icon="double-caret-vertical" />
    </div>
  );
});

export const layoutChangeEvent = new (class {
  listeners: (() => void)[] = [];

  listen(cb: () => void) {
    const index = this.listeners.push(cb);
    return () => {
      this.listeners.splice(index, 1);
    };
  }

  dispatch() {
    document.querySelectorAll(".search-rect").forEach((item) => item.remove());
    setTimeout(() => {
      this.listeners.forEach((cb) => cb());
    }, 0);
  }
})();

function useForceUpdate() {
  const [, setState] = useState(0);
  return () => {
    setState(Date.now());
  };
}
const SearchFilters = observer(
  (props: { group: FilterGroup; onSearch: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [state, setState] = useState({ top: 0, bottom: 0 });
    const forceUpdate = useForceUpdate();
    useEffect(() => {
      let el: HTMLDivElement;
      const createARoundDiv = () => {
        const div = ref.current;
        const first = div?.firstElementChild;
        const last = div?.lastElementChild;
        // console.log(div, first, last, " ---- ", el, div);
        if (first == null || last == null || first === last) {
          // remove
          return;
        }
        const firstRect = first.getBoundingClientRect();
        const lastRect = last.getBoundingClientRect();
        // console.log(firstRect, first, last, lastRect, " = first");
        const rectSize = {
          top: (first as HTMLElement).offsetTop + firstRect.height / 2 + 2,
          bottom:
            lastRect.bottom -
            (firstRect.top + firstRect.height / 2) -
            lastRect.height / 2,
        };
        setState(rectSize);
        if (!el) {
        }
        el = document.createElement("div");
        div?.closest(".search-filters-container")!.appendChild(el);

        el.style.position = "absolute";
        el.style.top = rectSize.top + "px";
        el.style.height = 5 + rectSize.bottom + "px";
        el.className = "search-rect";
      };
      const unsub = layoutChangeEvent.listen(createARoundDiv);
      return () => {
        unsub();
        el?.remove();
      };
    }, []);
    const isShowToggle =
      props.group.filters.length + props.group.groups.length > 1;
    return (
      <div
        className="search-filters-container"
        style={
          isShowToggle
            ? {
                paddingLeft: 50,
              }
            : {}
        }
      >
        {isShowToggle ? (
          <div
            className="search-group-toggle"
            style={{
              top: state?.top + (state?.bottom - state.top) / 2 + 3,
            }}
          >
            <AndOrToggle group={props.group} />
          </div>
        ) : null}
        <div className="search-filters" ref={ref}>
          {props.group.filters.map((f, i) => {
            return (
              <FieldView
                key={f.id}
                filterModel={f}
                className={`flex gap-8 search-filter`}
              >
                <FieldsSelect
                  items={f.filterOptions}
                  onSelect={(name) => {
                    f.onSelect(name);
                  }}
                  selectedItem={
                    f.delegate
                      ? {
                          name: f.delegate?.label,
                        }
                      : undefined
                  }
                />
                <OperatorsSelect
                  disabled={!f.delegate}
                  items={f.delegate?.operators}
                  onSelect={(operator) => {
                    f.delegate!.onSelect(operator);
                  }}
                  activeItem={f.delegate?.activeOperator}
                />
                {f.delegate?.activeOperator ? (
                  <f.delegate.activeOperator.Input
                    key={f.delegate.activeOperator.label + i}
                    {...{
                      onChange: f.delegate.activeOperator.onChange,
                      value: f.delegate.activeOperator.value,
                      items: f.delegate.activeOperator.items,
                    }}
                    onBlur={() => {
                      props.onSearch();
                    }}
                  />
                ) : (
                  <InputGroup disabled placeholder="Select Target Value" />
                )}
                <div style={{ flex: 1 }} />
                <RemoveCondition
                  onClose={() => {
                    // TODO:
                    props.group.removeCondition(i);
                    layoutChangeEvent.dispatch();
                  }}
                />
              </FieldView>
            );
          })}
          {props.group.groups.map((g, i) => {
            return (
              <div key={g.id} className="inner-group flex">
                <SearchGroup group={g} onSearch={props.onSearch} />
                <RemoveConditionGroup
                  onClose={() => {
                    props.group.removeConditionGroup(i);
                    layoutChangeEvent.dispatch();
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
function getConfigFromFirstChild(id: string) {
  const configStr = window.roamAlphaAPI.q(
    `[
      :find ?s 
      :where 
        [?c :block/string ?s] 
        [?c :block/order 0] 
        [?p :block/children ?c] 
        [?p :block/uid "${id}"]
     ]`
  )?.[0]?.[0] as string;

  try {
    console.log(configStr, " = config Str");
    return JSON.parse(configStr);
  } catch (error) {
    return {};
  }
}

function saveConfigToFirstChild(id: string, config: string) {
  const firstChildUid = window.roamAlphaAPI.q(
    `[
      :find ?s .
      :where 
        [?c :block/uid ?s] 
        [?c :block/order 0] 
        [?p :block/children ?c] 
        [?p :block/uid "${id}"]
     ]`
  ) as unknown as string | undefined;
  if (firstChildUid) {
    return window.roamAlphaAPI.updateBlock({
      block: {
        uid: firstChildUid,
        string: config,
      },
    });
  }
  window.roamAlphaAPI.createBlock({
    block: {
      string: config,
    },
    location: {
      "parent-uid": id,
      order: 0,
    },
  });
  window.roamAlphaAPI.updateBlock({
    block: {
      uid: id,
      open: false,
    },
  });
}
