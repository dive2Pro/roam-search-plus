import { makeAutoObservable } from "mobx";
import { Block, IFilterField, IOperator } from "./type";
import { Empty, MultiSelectField } from "./comps";

export class RefFilter implements IFilterField {
  label: string = "ref";

  operators: IOperator<any>[] = [
    new ContainsAnyOfOperator(),
    new ExcludesOperator(),
    new ContainsOperator(),
    new DoesNotContainsOperator(),
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new IsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];

  constructor() {
    makeAutoObservable(this);
    // TODO 获取数据
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, ":block/string");
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.onChange(oldOperator.value);
  }
}

class ContainsAnyOfOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "contains any of";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }
  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class ExcludesOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "excludes";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class ContainsOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class DoesNotContainsOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class EqualsToOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class DoesNotEqualsToOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "does not equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {
    // this.value = v;
    const newArr = [...this.value];
    const index = this.value.findIndex((item) => item.uid === v.uid);
    if (index === -1) {
      newArr.push(v);
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

class IsEmptyOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "is empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {};

  reset() {
    this.value = [];
  }
  Input = Empty;
}

class IsNotEmptyOperator<T extends { label: string; uid: string }>
  implements IOperator<T[]>
{
  label = "is not empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    // TODO:
    return true;
  };

  get items() {
    // 获取所有的
    return [
      { label: "q-w", uid: "qc1" },
      { label: "q-c", uid: "qc2" },
      { label: "囧订饭塞饭", uid: "qc3" },
      { label: "东寺街扽赛凡 三定凡事开发", uid: "qc4" },
    ];
  }

  value: T[] = [];

  onChange = ([v]: T[]) => {};

  reset() {
    this.value = [];
  }

  Input = Empty;
}
