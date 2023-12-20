import { makeAutoObservable } from "mobx";
import { Empty, DateRange, TextInput, SelectDay } from "./comps";
import type { Block, IFilterField, IOperator } from "./type";
import dayjs from "dayjs";
import { SearchInlineFilterModel } from "./SearchInlineFilterModel";

type DateRange = [number, number] | undefined;
type SingleDay = number | undefined;

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

class NotLessThanOperator implements IOperator<SingleDay> {
  label = "not less than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k] as number;
    if (!this.value) {
      return false;
    }
    return dayjs(dayjs(b)).isAfter(this.value);
  };

  value: SingleDay = undefined;

  onChange = (v: SingleDay) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = SelectDay;
}

class LessThanOperator implements IOperator<SingleDay> {
  label = "less than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isBefore(dayjs(this.value));
  };

  value: SingleDay = undefined;

  onChange = (v: SingleDay) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = SelectDay;
}

class NotGreaterThanOperator implements IOperator<SingleDay> {
  label = "not grater than";

  constructor() {
    makeAutoObservable(this);
  }
  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isBefore(dayjs(this.value));
  };

  value: SingleDay = undefined;

  onChange = (v: SingleDay) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = SelectDay;
}

class GreaterThanOperator implements IOperator<SingleDay> {
  label = "greater than";

  constructor() {
    makeAutoObservable(this);
  }

  filterMethod = (block: Block, k: keyof Block) => {
    const b = block[k];
    if (!this.value) {
      return false;
    }
    return dayjs(b as number).isAfter(dayjs(this.value));
  };

  value: SingleDay = undefined;

  onChange = (v: SingleDay) => {
    this.value = v;
  };

  reset() {
    this.value = undefined;
  }

  Input = SelectDay;
}

export class EditDateFilter implements IFilterField {
  static diaplayName = "edit time";
  label: string = "edit time";
  operators: IOperator<any>[] = [
    new EqualsToOperator(),
    new DoesNotEqualsToOperator(),
    new GreaterThanOperator(),
    new NotLessThanOperator(),
    new LessThanOperator(),
    new NotGreaterThanOperator(),
  ];
  constructor(private model: SearchInlineFilterModel) {
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
  static diaplayName = "created time";
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

  constructor(private model: SearchInlineFilterModel) {
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
