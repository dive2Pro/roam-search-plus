import { makeAutoObservable } from "mobx";
import { Block, IFilterField, IOperator } from "./type";
import { Empty, MultiSelectField } from "./comps";
import {
  RefsPullBlock,
  getParentsRefsById,
  isPageByUid,
  isPageId,
} from "../../roam";
import { SearchInlineModel } from ".";
import { allPageRefsItems } from "./allItems";

function getAllItems() {
  console.log(allPageRefsItems.items, ' = items')
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

class NotUnderAnyOfOperator<
  T extends { label: string; uid: string; id: number }
> implements IOperator<T[]>
{
  label = "not under any of";

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
    return this.value.every(
      (v) => parents.length && !parents.some((p) => p === v.id)
    );
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

class DoesNotEqualsToOperator<
  T extends { label: string; uid: string; id: number }
> implements IOperator<T[]>
{
  label = "does not equals to";

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
