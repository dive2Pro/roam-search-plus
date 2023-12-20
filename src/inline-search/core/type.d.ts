import React from "react";
import { type PullBlock } from "roamjs-components/types";
import { type SearchInlineFilterModel } from "./SearchInlineFilterModel";
import { type ResultFilterModel } from "./ResultFilterModel";
import { IconName } from "@blueprintjs/core";
export type Block = PullBlock;

export type IConnector = "OR" | "AND";

export interface IOperator<T> {
  label: string;
  title?: string;
  rightIcon?: string;
  filterMethod: (block: Block, key: keyof Block) => boolean;

  value: T;
  onChange: (value: T) => void;
  reset: () => void;
  items?: any[];

  Input: React.JSXElementConstructor<{
    value: T;
    onChange: (value: T) => void;
    onBlur: () => void;
  }>;
}

export interface IFilterField {
  onSelect(operator: string): void;
  label: string;
  operators: IOperator<any>[];
  activeOperator: IOperator<any>;

  filterData: (b: Block[]) => Block[];
}



export interface ITabModel {
  data: TabInfo;

  icon: IconName;
  saveLabel: () => void;
  changeLabel: (label: string) => void;

  saveFilterJson(json: {}): void;

  saveResultFilterQuery(query: string): void;

  saveResultFilterType(type: string): void;

  viewType: ViewType;
  searchResult: PullBlock[];

  hydrate(tabInfo: TabInfo): void;

  search: () => void;

  searchFilterModel: SearchInlineFilterModel;
  // resultFilterModel: ResultFilterModel;
}

export type TabInfo = {
  id: string;
  query: string;
  type: string;
  json: string;
  label: string;
  viewType: "side-menu" | "grid";
};
