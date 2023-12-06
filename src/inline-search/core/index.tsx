import React, { useEffect, useLayoutEffect, useRef } from "react";

import { FocusStyleManager, Icon, InputGroup, Menu } from "@blueprintjs/core";

import "./app.css";

FocusStyleManager.onlyShowFocusOnTabs();

import { useState } from "react";
import { makeAutoObservable, reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { Button, MenuItem, Popover } from "@blueprintjs/core";
import "normalize.css";
import { TitleFilter, StringFilter } from "./string";
import type { IConnector, Block, IFilterField } from "./type";
import { RefFilter } from "./multiple";
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
let id = 0;
// ------------------------------
class FilterPlaceholder {
  constructor(private group: FilterGroup, public model: SearchInlineModel) {
    makeAutoObservable(this);
  }
  id = id++;
  mounted = false;

  onSelect(name: string) {
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
      name: "Content",
      gen: () => new ContentFilter(this.model),
    },
    {
      name: "Page ref",
      gen: () => new RefFilter(this.model),
    },
    {
      name: "Created time",
      gen: () => new CreatedDateFilter(this.model),
    },
    {
      name: "Edit time",
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
};

class FilterGroup {
  id = Date.now();
  fieldType: "page" | "block" = "page";
  label: string = "group";
  creating = true;
  filters: FilterPlaceholder[] = [];
  groups: FilterGroup[] = [];
  connector: IConnector = "AND";

  constructor(public model: SearchInlineModel, private parent?: FilterGroup) {
    makeAutoObservable(this);
  }

  onFieldTypeChange(type: "page" | "block") {
    this.fieldType = type;
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
      console.log(newGroup, " condition ");
    } else {
      this.model.groupCurrentConditions();
    }
  }

  filterData(_source: Block[]): Block[] {
    console.log(_source, " = sou");
    // if (this.filters.length === 1 && this.groups.length === 0) {
    //   return this.filters[0].delegate
    //     ? this.filters[0].delegate.filterData(_source)
    //     : _source;
    // } else if (this.filters.length === 0 && this.groups.length === 1) {
    //   return this.groups[0].filterData(_source);
    // }
    if (this.connector === "AND") {
      let source = _source;
      console.log(source, " = ");
      this.filters.forEach((filter) => {
        if (filter.delegate) {
          const result = filter.delegate.filterData(source);
          source = result;
        }
      });
      this.groups
        .filter((group) => {
          // return group.filters.length > 0 || group.groups.length > 0;
          return group.isValidGroup();
        })
        .forEach((group) => {
          source = group.filterData(source);
        });
      return source;
    } else {
      const filterResult = this.filters.reduce((p, filter) => {
        if (filter.delegate) {
          return [...p, ...filter.delegate.filterData(_source)];
        }
        return p;
      }, [] as Block[]);
      const result = this.groups
        .filter((group) => {
          // return group.filters.length > 0 || group.groups.length > 0;
          return group.isValidGroup();
        })
        .reduce((p, group) => {
          const result = group.filterData(_source);

          return [...p, ...result];
        }, filterResult);
      return uniqueArray(result);
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
    };
  }
}

// ---------------- Operator end ------------

export function useSearchInlineModel(cb: (v: {}) => void) {
  const model = useState(() => new SearchInlineModel(cb))[0];
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
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [":block/string", ":node/title"],
};

export class ResultFilterModel {
  constructor(public model: SearchInlineModel) {
    makeAutoObservable(this, { result: false });
  }

  type = "all";
  query = "";
  fuse: Fuse<Block> = new Fuse([], fuseOptions);

  changeType = (v: string) => {
    this.type = v;
  };

  changeQuery = (v: string) => {
    this.query = v;
  };

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

  registerListeners(cb: (data: FuseResult<Block>[]) => void) {
    const dispose = reaction(
      () => [this.query.trim(), this.result] as const,
      ([query, result]) => {
        console.log(query, " = query");
        if (!query.trim()) {
          cb(
            this.result.map((item) => ({
              item,
              refIndex: 0,
              matches: [],
            }))
          );
          return;
        }
        this.fuse.setCollection(result);
        cb(this.fuse.search(query));
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
  }
}
export class SearchInlineModel {
  group = new FilterGroup(this);
  _updateTime = Date.now();
  result: Block[] = [];
  filter = new ResultFilterModel(this);

  constructor(private onUpdate: (v: {}) => void) {
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

  /**
   * 被 SearchFilter 重置触发更新
   */

  get searchResult() {
    this._updateTime; // 用于触发更新
    return this.result;
  }

  search() {
    // set to field
    const result = this.group.filterData(this.getData());
    this._updateTime = Date.now();
    this.result = [...result.map((item) => ({ ...item }))];
    console.log(this.result, " = result ");
    this.save();
  }

  hydrate(json: any) {
    console.log(`hydrate: `, json);
    this.group.hydrate(json);
  }

  private save() {
    this.onUpdate(JSON.stringify(this.group.toJSON()));
  }
}

// ------------------- React Start ---------------

export const SearchInline = observer(
  ({ model }: { model: SearchInlineModel }) => {
    useEffect(() => {
      // model.hydrate();
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

const layoutChangeEvent = new (class {
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

const SearchFilters = observer(
  (props: { group: FilterGroup; onSearch: () => void }) => {
    const max = props.group.filters.length + props.group.groups.length;
    const ref = useRef<HTMLDivElement>(null);
    const [state, setState] = useState({ top: 0, bottom: 0 });
    const [id] = useState(Date.now());
    console.log(props.group, " = group");
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
        console.log(firstRect, first, last, lastRect, " = first");
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
                <div style={{ flex: 1 }}>
                  <SearchGroup group={g} onSearch={props.onSearch} />
                </div>
                <RemoveConditionGroup
                  onClose={() => {
                    // TODO:

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
