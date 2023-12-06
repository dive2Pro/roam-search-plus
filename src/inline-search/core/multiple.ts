import { makeAutoObservable } from "mobx";
import { Block, IFilterField, IOperator } from "./type";
import { Empty, MultiSelectField } from "./comps";
import { getAllPages } from "../../roam";
import { SearchInlineModel } from ".";

function getAllItems() {
  return getAllPages()
    .filter((page) => !page.isBlock)
    .map((page) => {
      const r = {
        uid: page.block[":block/uid"],
        label: page.block[":node/title"],
        id: page.block[":db/id"],
        editTime: page.block[':edit/time'],
        createTime: page.block[":create/time"]
      };

      // console.log(r, ' =r')
      return r;
    }).sort((a, b) => {
      return b.editTime - a.editTime
    });
}

export class RefFilter implements IFilterField {
  label: string = "Page ref";

  operators: IOperator<any>[] = [
    new ContainsAnyOfOperator(),
    new UnderAnyOfOperator(),
    new ExcludesOperator(),
    new ContainsOperator(),
    new DoesNotContainsOperator(),
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new IsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];

  constructor(public model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, ":block/refs");
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    // console.log(oldOperator.value, ' === value ===')
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.value = oldOperator.value;
    this.model.search()
  }
}


class UnderAnyOfOperator<T extends { label: string; uid: string; id: number }>
  implements IOperator<T[]>
{
  label = "under any of";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as { ":db/id": number }[] | undefined;
    if (!this.value.length) {
      return true;
    }
    const pages = block[":block/parents"] || [];
    // console.log(this.value , ' = value ', block[':block/page'], JSON.stringify({...block}))
    return this.value.some((v) => pages.some(p => p[":db/id"] === v.id))
  };

  get items() {
    // 获取所有的
    return getAllItems();
  }
  value: T[] = [];

  onChange = ([v]: T[]) => {
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    console.log(newArr, " ---- ");
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    console.log(newArr, " ---- ");
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    this.value = newArr;
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

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      v && newArr.push(v);
    } else {
      newArr.splice(index, 1);
    }
    this.value = newArr;
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
    const b = block[k] as string;
    return !b || b.length === 0;
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
    const b = block[k] as string;
    return b && b.length > 0;
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
