import React from "react";
import { PullBlock } from "roamjs-components/types";

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

  filterData: (b: Block[]) => Promise<Block[]> | Block[];
}
