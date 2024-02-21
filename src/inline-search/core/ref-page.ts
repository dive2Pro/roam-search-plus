import { makeAutoObservable } from "mobx";
import { Block, IFilterField, IOperator } from "./type";
import { Empty, MultiSelectField } from "./comps";
import { RefsPullBlock, getInfoById, getParentsRefsById, isPageId } from "../../roam";
import { SearchInlineModel } from ".";
import { allPageRefsItems } from "./allItems";
import { JSXElementConstructor } from "react";
import { PullBlock } from "roamjs-components/types";

const DailyNotesItem = { label: "Daily Notes", uid: "daily notes", icon: "calendar" };

function getAllItems() {
  console.log(allPageRefsItems.items, " = items");
  return allPageRefsItems.items;
}

export class RefFilter implements IFilterField {
  static displayName = "page ref";
  label: string = "page ref";

  operators: IOperator<any>[] = [
    new UnderAnyOfOperator(),
    new NotUnderAnyOfOperator(),
    new ContainsAnyOfOperator(),
    new ContainsOperator(),
    new EqualsToOperator(),
    new DoesNotContainsOperator(),
    // new ExcludesOperator(),
    // new DoesNotEqualsToOperator(),
    new IsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];

  constructor(public model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      // 这里的 refs 应该都要是 page refs
      return this.activeOperator.filterMethod(block, ":block/refs");
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    // console.log(oldOperator.value, ' === value ===')

    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.value = oldOperator.value;
    this.model.search();
  }
}

class UnderAnyOfOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "under any of";
  title = "Hierarchical search";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: RefsPullBlock, k: keyof Block) => {
    // const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    const parents = getParentsRefsById(block[":db/id"]);
    // console.log(this.value , ' = value ', block[':block/page'], JSON.stringify({...block}))
    return this.value.some((v) => parents.some((p) => p === v.id));
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }
  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

function isValidDate(dateString: string) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if(!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const dateNum = date.getTime();

  return !isNaN(dateNum);
}

class NotUnderAnyOfOperator<
  T extends { label: string; uid: string; id: number }
> implements IOperator<T[]>
{
  label = "not under any of";
  dailyNotesSelected = false;

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: RefsPullBlock, k: keyof Block) => {
    // const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    
    const parents = getParentsRefsById(block[":db/id"]);
    // console.log(this.value , ' = value ', block[':block/page'], JSON.stringify({...block}))
   
    if (this.dailyNotesSelected) {
      const page = block[":block/page"] ? getInfoById(block[':block/page'][":db/id"]) : undefined
      if(page) {
        if (isValidDate(page[":node/title"] || "")) {
          return false;
        }
      }
    }
    return !parents ? true :  this.value.every(
      (v) => !parents.some((p) => p === v.id)
    );
  };

  get items() {
    // 添加过滤掉 daylies notes 的选项

    return [DailyNotesItem, ...getAllItems()];
  }
  value: T[] = [];

  onChange = (v: T[]) => {
    this.dailyNotesSelected = !!v.find(
      (item) => item.uid === DailyNotesItem.uid
    );
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class ContainsAnyOfOperator<
  T extends { label: string; uid: string; id: number }
> implements IOperator<T[]>
{
  label = "contains any of";
  title?: string = "Inline search";
  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    return b
      ? this.value.some((v) => b.some((item) => item[":db/id"] === v.id))
      : false;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }
  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class ExcludesOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "excludes";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    return b
      ? b.every((item) => !this.value.some((v) => item[":db/id"] === v.id))
      : false;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class ContainsOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    return b
      ? this.value.every((v) => b.some((item) => item[":db/id"] === v.id))
      : false;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class DoesNotContainsOperator<
  T extends { label: string; uid: string; id: number }
> implements IOperator<T[]>
{
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    return b
      ? this.value.every((v) => !b.some((item) => item[":db/id"] === v.id))
      : false;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class EqualsToOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    return b
      ? this.value.length === b.length &&
          b.every((item) => this.value.some((v) => item[":db/id"] === v.id))
      : false;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = (v: T[]) => {
    this.value = v;
  };

  reset() {
    this.value = [];
  }

  Input = MultiSelectField;
}

class IsEmptyOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "is empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as Block[":block/refs"];
    return !b || b.filter((item) => isPageId(item[":db/id"])).length === 0;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {};

  reset() {
    this.value = [];
  }
  Input = Empty;
}

class IsNotEmptyOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "is not empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as Block[":block/refs"];
    return b && b.filter((item) => isPageId(item[":db/id"])).length > 0;
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {};

  reset() {
    this.value = [];
  }

  Input = Empty;
}


class HasRelavantOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  title?: string;
  rightIcon?: string;
  
  filterMethod: (block: PullBlock, key: keyof PullBlock) => boolean = (block) => {
    // 这是一个递归的过程
    // 
    return true;
  };

  value: T[] = [];
  onChange = (value: T[]) => {
    this.value = value;
    // 这里需要获取所有相关的 block 和 page 的 id 到内存中？
    // 1. 找到选择的 value 的 相关 refs 以及其
  };
  reset: () => void = () => {
    this.value = [];
  };
  get items() {
    return getAllItems();
  };
  Input = MultiSelectField;
  label = "has relavant";
}