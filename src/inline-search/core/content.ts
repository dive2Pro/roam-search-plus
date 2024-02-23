import { makeAutoObservable } from "mobx";
import { Empty, RegexInput, TextInput } from "./comps";
import type { Block, IFilterField, IOperator } from "./type";
import { SearchInlineModel } from ".";
import { InputGroup } from "@blueprintjs/core";
import { PullBlock } from "roamjs-components/types";
import Fuse from "fuse.js";

class DoesNotContainsOperator implements IOperator<string> {
  label = "does not contains";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as string;
    if (!this.value) {
      return true;
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
    return b ? b === this.value : false;
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
    return b ? b !== this.value : false;
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
    const b = block[":block/string"] as string;

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
    return !!b;
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
    try {
      return !!b && new RegExp(this.value).test(b);
    } catch (e) {
      return true
    }
  };

  value = "";

  onChange = (v: string) => {
    this.value = v;
    console.log(v, " ----- ");
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

class FuzzyOperator implements IOperator<string> {
  // fuse = new Fuse([] as PullBlock[], {
  //   useExtendedSearch: true,
  //   includeMatches: true,
  //   keys: [":block/string", ":node/title"],
  // });
  filter(blocks: PullBlock[]) {
    // this.fuse.setCollection(blocks);
    console.time("fuzzy");
    const indexs = Fuse.createIndex([":block/string", ":node/title"], blocks);
    const result = new Fuse(
      blocks,
      {
        useExtendedSearch: true,
        includeMatches: true,
        keys: [":block/string", ":node/title"],
      },
      indexs
    )
      .search(this.value)
      .map(({ item }) => item);
    console.timeEnd("fuzzy");
    return result;
  }

  label = "fuzzy";
  rightIcon = "fuzzy";

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
    new FuzzyOperator(),
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
    // TODO: 优化
    if (this.activeOperator instanceof FuzzyOperator) {
      return this.activeOperator.filter(blocks);
      // return blocks
    }
    console.time("T");
    const r = blocks.filter((block) => {
      return (
        this.activeOperator.filterMethod(block, ":node/title") ||
        this.activeOperator.filterMethod(block, ":block/string")
      );
    });
    console.timeEnd("T");

    return r;
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.value = oldOperator.value;
    this.model.search();
  }
}
