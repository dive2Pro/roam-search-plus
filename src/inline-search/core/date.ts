import { makeAutoObservable } from "mobx";
import { Empty, DateRange, TextInput } from "./comps";
import type { Block, IFilterField, IOperator } from "./type";
import dayjs from "dayjs";
import { SearchInlineModel } from ".";

type DateRange = [number, number] | undefined;

class EqualsToOperator implements IOperator<DateRange> {
  label = "equals to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as number;
    if (!this.value) {
      return false;
    }
    // console.log(b, ' equals to ', this.value)
    return (
      dayjs(b).isAfter(dayjs(this.value[0])) &&
      dayjs(b).isBefore(dayjs(this.value[1]))
    );
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    // console.log(v, ' - on change')
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

class DoesNotEqualsToOperator implements IOperator<DateRange> {
  label = "does not equal to";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return (
      dayjs(this.value[0]).isBefore(dayjs(b as number)) ||
      dayjs(this.value[1]).isAfter(dayjs(b as number))
    );
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

class IsEmptyOperator implements IOperator<DateRange> {
  label = "is empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    return !b;
  };

  value: DateRange = undefined;

  onChange = () => {
    this.value = undefined;
  };

  reset() {
    this.value = undefined;
  }

  Input = Empty;
}

class IsNotEmptyOperator implements IOperator<DateRange> {
  label = "is not empty";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as unknown as number;
    return b > 0;
  };

  value: DateRange = undefined;

  onChange = () => {
    this.value = undefined;
  };

  reset() {
    this.value = undefined;
  }

  Input = Empty;
}

class NotLessThanOperator implements IOperator<DateRange> {
  label = "not less than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as number;
    if (!this.value) {
      return false;
    }
    return dayjs(dayjs(b)).isAfter(this.value[0]);
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

class LessThanOperator implements IOperator<DateRange> {
  label = "less than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isBefore(dayjs(this.value[0]));
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

class NotGreaterThanOperator implements IOperator<DateRange> {
  label = "not grater than";

  constructor() {
    makeAutoObservable(this);
  }
  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isBefore(dayjs(this.value[0]));
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

class GreaterThanOperator implements IOperator<DateRange> {
  label = "greater than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isAfter(dayjs(this.value[1]));
  };

  value: DateRange = undefined;

  onChange = (v: DateRange) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = DateRange;
}

export class EditDateFilter implements IFilterField {
  label: string = "edit time";
  operators: IOperator<any>[] = [
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new GreaterThanOperator(),
    new NotLessThanOperator(),
    new LessThanOperator(),
    new NotGreaterThanOperator(),
  ];
  constructor(private model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  activeOperator = this.operators[0];

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, ":edit/time");
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.onChange(oldOperator.value);
    this.model.search();
  }
}

export class CreatedDateFilter implements IFilterField {
  label: string = "created time";
  operators: IOperator<any>[] = [
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new GreaterThanOperator(),
    new NotLessThanOperator(),
    new LessThanOperator(),
    new NotGreaterThanOperator(),
  ];
  activeOperator = this.operators[0];

  constructor(private model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  filterData = (blocks: Block[]) => {
    return blocks.filter((block) => {
      return this.activeOperator.filterMethod(block, ":create/time");
    });
  };

  onSelect(operator: string) {
    const oldOperator = this.activeOperator;
    this.activeOperator = this.operators.find((ope) => ope.label === operator)!;
    this.activeOperator.onChange(oldOperator.value);
    this.model.search();
  }
}
