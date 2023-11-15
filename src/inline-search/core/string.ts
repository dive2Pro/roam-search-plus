import { makeAutoObservable } from "mobx";
import { Empty, TextInput } from "./comps";
import type { Block, IFilterField, IOperator } from "./type";

class DoesNotContainsOperator implements IOperator<string> {
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = TextInput;
}

class EqualsToOperator implements IOperator<string> {
  label = "equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = TextInput;
}

class DoesNotEqualsToOperator implements IOperator<string> {
  label = "does not equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = TextInput;
}

class IsEmptyOperator implements IOperator<string> {
  label = "is empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = Empty;
}

class IsNotEmptyOperator implements IOperator<string> {
  label = "is not empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return b ? !b.includes(this.value) : false;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }

  Input = Empty;
}

class ExistOperator implements IOperator<string> {
  label = "is exist";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: string) => {
    return k in block;
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }
  Input = Empty;
}

class SentencesContainsOperator implements IOperator<string> {
  label = "contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, key: keyof Block) => {
    return !!block[key] && block[key].includes(this.value);
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
  };

  reset() {
    this.value = "";
  }
  Input = TextInput;
}

export class StringFilter implements IFilterField {
  label: string = "string";
  operators: IOperator<any>[] = [
    new SentencesContainsOperator(),
    new DoesNotContainsOperator(),
    new ExistOperator(),
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new IsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];
  constructor() {
    makeAutoObservable(this);
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, "string");
    });
  };

  onSelect(operator: string) {
    this.activeOperator.reset();
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
  }
}

export class TitleFilter implements IFilterField {
  label: string = "title";
  operators: IOperator<any>[] = [
    new SentencesContainsOperator(),
    new DoesNotContainsOperator(),
    new ExistOperator(),
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new IsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];
  activeOperator = this.operators[0];

  constructor() {
    makeAutoObservable(this);
  }

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, "title");
    });
  };

  onSelect(operator: string) {
    this.activeOperator.reset();
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
  }
}
