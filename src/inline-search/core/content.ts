import { makeAutoObservable } from "mobx";
import { Empty, RegexInput, TextInput } from "./comps";
import type { Block, IFilterField, IOperator } from "./type";
import { SearchInlineModel } from ".";
import { InputGroup } from "@blueprintjs/core";

class DoesNotContainsOperator implements IOperator<string> {
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    if(!this.value) {
      return true
    }
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
    return b ? b === (this.value) : false;
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
    return b ? b !== (this.value) : false;
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

class ContentIsEmptyOperator implements IOperator<string> {
  label = "is empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block) => {
    const b = block[':block/string'] as string;
    
    return b === "" && !!block[":block/parents"];
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
    return !!b 
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


class RegexOperator implements IOperator<string> {
  label = "regex";
  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    return !!b && new RegExp(this.value).test(b);
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
    console.log(v, ' ----- ')
  };

  reset() {
    this.value = "";
  }
  Input = RegexInput;
}

class SentencesContainsOperator implements IOperator<string> {
  label = "contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, key: keyof Block) => {
    return !!block[key] && (block[key] + "").includes(this.value);
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

export class ContentFilter implements IFilterField {
  static diaplayName = "content";
  label: string = "content";
  operators: IOperator<any>[] = [
    new SentencesContainsOperator(),
    new DoesNotContainsOperator(),
    new RegexOperator(),
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new ContentIsEmptyOperator(),
    new IsNotEmptyOperator(),
  ];
  activeOperator = this.operators[0];

  constructor(private model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return (
        this.activeOperator.filterMethod(block, ":node/title") ||
        this.activeOperator.filterMethod(block, ":block/string")
      );
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.value = oldOperator.value;
    this.model.search();
  }
}
