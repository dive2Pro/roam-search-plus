import {
  ControlGroup,
  HTMLSelect,
  Icon,
  InputGroup,
  Menu,
  Tooltip,
} from "@blueprintjs/core";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import Fuse from "fuse.js";
import type { FuseResult } from "fuse.js";

import { Button, MenuItem, Popover } from "@blueprintjs/core";
import {
  IItemRendererProps,
  MultiSelect,
  Select,
  Suggest,
} from "@blueprintjs/select";
import { DateInput, DateRange, DateRangeInput } from "@blueprintjs/datetime";
import { Virtuoso } from "react-virtuoso";
import { PageIcon } from "./PageIcon";
import { BlockIcon } from "./BlockIcon";

export const Empty = () => <></>;

const RegexExamMenu = (props: {
  index: number;
  menus: { label: string; onClick: () => void }[];
}) => (
  <Popover
    content={
      <Menu>
        {props.menus.map((menu) => {
          return <MenuItem text={menu.label} onClick={() => menu.onClick()} />;
        })}
      </Menu>
    }
    placement="bottom-end"
  >
    <Button minimal={true} rightIcon="caret-down">
      {props.index > -1 ? props.menus[props.index].label : "Custom"}
    </Button>
  </Popover>
);

export function RegexInput(props: {
  onBlur: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const menus = [
    {
      label: "Has block refs",
      ...(() => {
        const value = "(\\(\\(.+\\)\\))";
        return {
          value,
          onClick: () => {
            props.onChange(value);
            props.onBlur();
          },
        };
      })(),
    },
    {
      label: "No code",
      ...(() => {
        const value = "^(?!```).+";
        return {
          value,
          onClick: () => {
            props.onChange(value);
            props.onBlur();
          },
        };
      })(),
    },
    {
      label: "No image",
      ...(() => {
        const value = `^(?!\\!\\[\\]\\().+`;
        return {
          value,
          onClick: () => {
            props.onChange(value);
            props.onBlur();
          },
        };
      })(),
    },
  ];

  const index = menus.findIndex((item) => item.value === props.value);

  return (
    <InputGroup
      value={props.value}
      onChange={(e) => {
        props.onChange((e.target as HTMLInputElement).value);
      }}
      onBlur={props.onBlur}
      rightElement={<RegexExamMenu menus={menus} index={index} />}
    />
  );
}
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
      onKeyPress={(event) => {
        if(event.key === 'Enter') {
          props.onBlur();
        }
      }}
    />
  );
};

export const PageOrBlockSelect = (props: {
  onSelect: (type: "page" | "block" | "all") => void;
  value: "page" | "block" | "all";
}) => {
  return (
    <ControlGroup>
      <Popover
        content={
          <Menu>
            {[
              {
                label: "All",
                value: "all",
              },
              {
                label: "Page",
                value: "page",
                labelElement: <PageIcon />,
              },
              {
                label: "Block",
                value: "block",
                labelElement: <BlockIcon />,
              },
            ].map((item) => {
              return (
                <MenuItem
                  labelElement={item.labelElement}
                  text={item.label}
                  onClick={() => props.onSelect(item.value as "all")}
                />
              );
            })}
          </Menu>
        }
      >
        <Button icon="filter" small text={props.value.toUpperCase()} />
      </Popover>
    </ControlGroup>
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
        autoFocus: false,
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
            text={capitalizeFirstLetter(item.name)}
          ></MenuItem>
        );
      }}
      onItemSelect={function (item, evnet) {
        evnet.stopPropagation();
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
  // const [height, setHeight] = useState(300);

  const fuse = useMemo(() => {
    const fuseOptions = {
      // isCaseSensitive: false,
      // includeScore: true,
      // shouldSort: true,
      includeMatches: true,
      // findAllMatches: true,
      // minMatchCharLength: 1,
      // location: 0,
      // threshold: 0.4,
      // distance: 80,
      // useExtendedSearch: false,
      // ignoreLocation: false,
      // ignoreFieldNorm: false,
      // fieldNormWeight: 1,
      keys: ["label"],
    };

    const fuse = new Fuse(props.items, fuseOptions);

    return fuse;
  }, [props.items]);

  const [filtered, setFiltered] = useState<FuseResult<T>[]>(() =>
    fuse.search(" ")
  );
  console.log(filtered, " --");
  return (
    <MultiSelect
      tagRenderer={function (item: FuseResult<T>) {
        return item.item.label;
      }}
      items={filtered || []}
      selectedItems={props.value.map((item) => ({
        item,
      }))}
      resetOnSelect
      itemListRenderer={(itemListProps) => {
        const noResults = <MenuItem disabled={true} text="No results." />;
        if (itemListProps.items.length <= 0) {
          return <Menu>{noResults}</Menu>;
        }

        return (
          <Menu>
            <Virtuoso
              style={{
                width: 300,
                height: 300,
              }}
              totalCount={itemListProps.filteredItems.length}
              data={itemListProps.filteredItems}
              itemContent={(index, data) => {
                return itemListProps.renderItem(data, index);
              }}
            />
          </Menu>
        );
      }}
      itemRenderer={function (item: FuseResult<T>, { modifiers, handleClick }) {
        return (
          <MenuItem
            {...{
              disabled: modifiers.disabled,
              icon: props.value.find((v) => v?.uid === item?.item.uid)
                ? "small-tick"
                : "blank",
              key: item.item.label,
              onClick: handleClick,
              text: item.item.label,
            }}
            text={item.item.label}
          ></MenuItem>
        );
      }}
      popoverProps={{
        position: "top",
        modifiers: {
          flip: {
            enabled: true,
          },
        },
        placement: "bottom",
      }}
      // itemPredicate={(query, item) => {
      //   return item.label.indexOf(query) >= 0;
      // }}
      tagInputProps={{
        onRemove: (_: unknown, index: number) => {
          props.onChange([props.value[index]]);
        },
        inputProps: {
          onInput: (event) => {
            const v = event.currentTarget.value;
            // console.log(event.currentTarget.value, " --- ", fuse.search(v));
            setFiltered(fuse.search(v));
          },
        },
      }}
      className="inline-multi-select"
      onItemSelect={function (item: FuseResult<T>, event) {
        // TODO
        event.stopPropagation();
        props.onChange([item.item]);
        props.onBlur();
      }}
    />
  );
}

export function SelectDay(props: {
  value?: number;
  onChange: (time: number) => void;
  onBlur: () => void;
}) {
  return (
    <DateInput
      formatDate={(date) => {
        return dayjs(date).format("YYYY-MM-DD");
      }}
      shortcuts
      parseDate={(str) => {
        return dayjs(str).toDate();
      }}
      onChange={(time) => {
        props.onChange(dayjs(time).startOf("day").valueOf());
        setTimeout(() => {
          props.onBlur();
        }, 200);
      }}
      value={props.value ? new Date(props.value) : undefined}
    />
  );
}

export function DateRange(props: {
  value?: [number, number];
  onChange: (range: [number, number]) => void;
  onBlur: () => void;
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
          [
            dayjs(range[0]).startOf("day").valueOf(),
            dayjs(range[1]).endOf("day").valueOf(),
          ]
          // range.map((item) => dayjs(item).toDate()) as [Date, Date]
        );
        props.onBlur();
      }}
      value={
        props.value
          ? (props.value.map((v) => new Date(v)) as DateRange)
          : undefined
      }
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

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
