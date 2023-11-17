import { HTMLSelect, InputGroup, Tooltip } from "@blueprintjs/core";
import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

import { Button, MenuItem, Popover } from "@blueprintjs/core";
import {
  IItemRendererProps,
  MultiSelect,
  Select,
  Suggest,
} from "@blueprintjs/select";
import { DateInput, DateRangeInput } from "@blueprintjs/datetime";

export const Empty = () => <></>;

export const TextInput = (props: {
  onBlur: () => void;
  value: string;
  onChange: (v: string) => void;
}) => {
  return (
    <InputGroup
      value={props.value}
      onChange={(e) => {
        props.onChange((e.target as HTMLInputElement).value);
      }}
      onBlur={props.onBlur}
    />
  );
};

export const FieldsSelect = (props: {
  onSelect: (name: string) => void;
  items: { name: string }[];
  selectedItem?: { name: string };
}) => {
  return (
    <Suggest
      items={props.items}
      inputProps={{
        placeholder: "Select Condition",
        autoFocus: false
      }}
      itemsEqual={function (a, b) {
        return a.name === b.name;
      }}
      inputValueRenderer={function (item) {
        return item.name;
      }}
      itemPredicate={(query, item, index) => {
        return item.name.indexOf(query) >= 0;
      }}
      selectedItem={props.selectedItem}
      
      itemRenderer={function (
        item,
        { modifiers, handleClick }: IItemRendererProps
      ) {
        return (
          <MenuItem
            {...{
              active: modifiers.active,
              disabled: modifiers.disabled,
              key: item.name,
              // label: film.year.toString(),
              onClick: handleClick,
              // onFocus: handleFocus,
              // ref,
              text: item.name,
            }}
            text={item.name}
          ></MenuItem>
        );
      }}
      onItemSelect={function (item, evnet) {
        evnet.stopPropagation()
        props.onSelect(item.name);
      }}
    />
  );
};

export const OperatorsSelect = (props: {
  disabled: boolean;
  onSelect: (label: string) => void;
  items?: { label: string }[];
  activeItem?: { label: string };
}) => {
  // console.log(props.activeItem, " =active");
  return (
    <Select
      disabled={props.disabled}
      items={props.items || []}
      itemsEqual={function (a, b) {
        return a.label === b.label;
      }}
      itemPredicate={(query, item) => {
        return item.label.includes(query);
      }}
      activeItem={props.activeItem}
      inputProps={{}}
      itemRenderer={function (
        item,
        { modifiers, handleClick }: IItemRendererProps
      ) {
        return (
          <MenuItem
            {...{
              active: modifiers.active,
              disabled: modifiers.disabled,
              key: item.label,
              // label: film.year.toString(),
              onClick: handleClick,
              // onFocus: handleFocus,
              // ref,
              text: item.label,
            }}
            text={item.label}
          ></MenuItem>
        );
      }}
      onItemSelect={function (item, event) {
        event.stopPropagation();
        props.onSelect(item.label);
      }}
    >
      <Button
        text={props.activeItem?.label || "Operation"}
        placeholder=""
        disabled={props.disabled}
        rightIcon="double-caret-vertical"
      />
    </Select>
  );
};

export function FieldView(
  props: React.PropsWithChildren<{
    filterModel: { mounted: boolean };
    className: string;
  }>
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!props.filterModel.mounted) {
      // trigger focus in
      const input = ref.current?.querySelector(
        ".bp3-input"
      ) as HTMLInputElement;
      // input.focus();
      props.filterModel.mounted = true;
    }
  }, []);
  return (
    <div ref={ref} className={props.className}>
      {props.children}
    </div>
  );
}

export function RemoveCondition(props: { onClose: () => void }) {
  const ref = useRef<Button & { buttonRef: HTMLButtonElement }>(null);
  return (
    <Tooltip content={"Delete condition"}>
      <Button
        icon="delete"
        minimal
        small
        ref={ref}
        onMouseEnter={() => {
          highlightParent();
        }}
        onMouseLeave={() => {
          unhighlightParent();
        }}
        onClick={props.onClose}
      />
    </Tooltip>
  );

  function highlightParent() {
    if (!ref.current) {
      return;
    }
    const parent = ref.current.buttonRef.closest(".search-filter");
    parent?.classList.toggle("search-highlight");
    console.log(parent);
  }

  function unhighlightParent() {
    if (!ref.current) {
      return;
    }
    const parent = ref.current.buttonRef.closest(".search-filter");
    parent?.classList.toggle("search-highlight");
  }
}

export function RemoveConditionGroup(props: { onClose: () => void }) {
  const ref = useRef<Button & { buttonRef: HTMLButtonElement }>(null);

  return (
    <Tooltip content={"Delete condition group"}>
      <Button
        onMouseEnter={() => {
          highlightParent();
        }}
        onMouseLeave={() => {
          unhighlightParent();
        }}
        ref={ref}
        icon="delete"
        minimal
        small
        onClick={props.onClose}
      />
    </Tooltip>
  );

  function highlightParent() {
    if (!ref.current) {
      return;
    }
    const parent = ref.current.buttonRef.closest(".inner-group");
    parent?.classList.toggle("search-highlight");
    console.log(parent);
  }

  function unhighlightParent() {
    if (!ref.current) {
      return;
    }
    const parent = ref.current.buttonRef.closest(".inner-group");
    parent?.classList.toggle("search-highlight");
  }
}

export function MultiSelectField<
  T extends { label: string; uid: string }
>(props: {
  items?: T[];
  value: T[];
  onChange: (value: T[]) => void;
  onBlur: () => void;
}) {
  return (
    <MultiSelect
      tagRenderer={function (item: T) {
        return item.label;
      }}
      items={props.items || []}
      selectedItems={props.value}
      itemRenderer={function (item: T, { modifiers, handleClick }) {
        return (
          <MenuItem
            {...{
              // active: modifiers.active,
              disabled: modifiers.disabled,
              icon: props.value.find((v) => v.uid === item.uid)
                ? "small-tick"
                : "blank",
              key: item.label,
              // label: film.year.toString(),
              onClick: handleClick,
              // onFocus: handleFocus,
              // ref,
              text: item.label,
            }}
            text={item.label}
          ></MenuItem>
        );
      }}
      tagInputProps={{
        onRemove: (_: unknown, index: number) => {
          props.onChange([props.value[index]]);
        },
      }}
      onItemSelect={function (item: T, event) {
        // TODO
        event.stopPropagation();
        props.onChange([item]);
      }}
    />
  );
}

export function DateRange(props: {
  value?: [Date, Date];
  onChange: (range: [Date, Date]) => void;
}) {
  return (
    <DateRangeInput
      className="date-range"
      formatDate={(date) => {
        return dayjs(date).format("YYYY-MM-DD");
      }}
      allowSingleDayRange
      parseDate={(str) => {
        return dayjs(str).toDate();
      }}
      onChange={(range) => {
        props.onChange(
          range.map((item) => dayjs(item).toDate()) as [Date, Date]
        );
      }}
      value={props.value}
    />
  );
}

export function RecentDates(props: {
  value: {
    option: number;
    startTime: number;
    endTime: number;
  };
  onChange: (v: { option: number; time: number }) => void;
}) {
  const [option, setOption] = useState(props.value.option);
  const options = [
    { label: "specific date", value: 0 },
    {
      label: "today",
      value: 1,
      fn: () => [dayjs().format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD")],
    },
    {
      label: "tomorrow",
      value: 2,
      fn: () => [
        dayjs().add(1, "day").format("YYYY-MM-DD"),
        dayjs().add(1, "day").format("YYYY-MM-DD"),
      ],
    },
    {
      label: "yesterday",
      value: 3,
      fn: () => [
        dayjs().subtract(1, "d").format("YYYY-MM-DD"),
        dayjs().subtract(1, "d").format("YYYY-MM-DD"),
      ],
    },
    {
      label: "this week",
      value: 4,
      fn: () => [dayjs().subtract(1, "d").format("YYYY-MM-DD")],
    },
    { label: "last week", value: 5 },
    { label: "next week", value: 6 },
    { label: "this month", value: 7 },
    { label: "last month", value: 8 },
    { label: "next month", value: 9 },
    { label: "recent", value: 10 },
    { label: "upcoming", value: 11 },
  ];
  return (
    <div className="flex">
      <HTMLSelect
        options={options}
        value={props.value.option}
        onChange={(event) => {
          console.log(event.currentTarget.value, " = time");
        }}
      ></HTMLSelect>
      <DateInput />
    </div>
  );
}

