import { Switch, Popover, Position, Classes, Button, Icon, Intent } from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { Select } from "@blueprintjs/select";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
import { MOMENT_FORMATS } from "../moment";
import { store } from "../store";


const sidebarStore = observable({
  date: {
    modifySelected: undefined as DateRange | undefined,
  },
});

const INTENTS = [
  Intent.NONE,
  Intent.PRIMARY,
  Intent.SUCCESS,
  Intent.DANGER,
  Intent.WARNING,
];


export const Sidebar = observer(() => {
  return (
    <section
      style={{
        width: 220,
        backgroundColor: "hsl(204,33%,97%)",
        padding: 10,
        display: store.ui.isTyped() ? "block" : "none",
      }}
    >
      <div>
        <Switch
          label="Only Page Title"
          onChange={(e) => {
            store.actions.conditions.toggleOnlyPage();
          }}
          checked={store.ui.conditions.isOnlyPage()}
          alignIndicator="right"
        />
        <Switch
          label="Include Code Blocks"
          onChange={(e) => {
            store.actions.conditions.toggleIncludeCodeblock();
          }}
          checked={store.ui.conditions.isIncludeCodeblock()}
          alignIndicator="right"
        />
        {/* 
        <Switch label="Only Block" alignIndicator="right" />
        <Switch label="Have Twitter" alignIndicator="left" />
              <Switch label="Have PDF" alignIndicator="left" />
              <Switch label="Have Media" alignIndicator="left" /> */}
        {/* <div>
          <div className="bp3-heading">Tags</div>
          <TagInput
            fill
            leftIcon="tag"
            values={store.ui.tags.getTags()}
            onChange={(e) => {
              store.actions.changeTags(e as string[]);
            }}
            rightElement={
              store.ui.tags.getTags().length ? (
                <Button
                  icon="small-cross"
                  minimal
                  small
                  onClick={(e) => {
                    e.preventDefault();
                    store.actions.changeTags([]);
                  }}
                />
              ) : undefined
            }
          />
        </div> */}
        <div>
          <div className="bp3-heading">Pages</div>
        </div>
        {store.ui.date.lastEdit() ? (
          <div>
            <div className="bp3-heading">Latest Edit</div>
            <Popover
              position={Position.BOTTOM}
              content={
                <DateRangePicker
                  allowSingleDayRange
                  {...MOMENT_FORMATS[0]}
                  className={Classes.ELEVATION_1}
                  defaultValue={store.ui.date.lastEditRange()}
                  onChange={(range) => store.actions.changeModifyRange(range)}
                />
              }
            >
              <Button
                minimal
                icon="calendar"
                rightIcon={
                  <Icon
                    onClick={() => {
                      store.actions.clearLastEdit();
                    }}
                    icon="small-cross"
                  />
                }
              >
                {store.ui.date.lastEdit()}
              </Button>
            </Popover>
          </div>
        ) : null}
        <div className="bp3-heading">Quick Search</div>
        <Button minimal icon="person">
          Created By Me
        </Button>
        <Button minimal icon="calendar" onClick={store.actions.quick.today}>
          Modifyied Today
        </Button>
        <Button minimal icon="calendar" onClick={store.actions.quick.lastWeek}>
          Modifyied Last week
        </Button>
        <Button minimal icon="search-text">
          Search in current page
        </Button>

        <div className="bp3-heading">Custom Search</div>
        {store.ui.date.lastEdit() ? null : (
          <Popover
            position={Position.BOTTOM}
            onClose={() => {
              const date = sidebarStore.date.modifySelected.peek();
              if (!date) {
                return;
              }
              sidebarStore.date.modifySelected.set(undefined);
              store.actions.changeModifyRange(date);
            }}
            content={
              <DateRangePicker
                allowSingleDayRange
                {...MOMENT_FORMATS[0]}
                className={Classes.ELEVATION_1}
                onChange={(range) => {
                  sidebarStore.date.modifySelected.set(range);
                }}
              />
            }
          >
            <Button minimal icon="calendar">
              Modifyied date
            </Button>
          </Popover>
        )}
        <Select
          // selectedItems={store.ui.pages.get()}
          items={["q", "w"]}
          // tagRenderer={(item) => {
          //   return `[[${item}]]`;
          // }}
          itemPredicate={(query, item, index) => {
            return item.indexOf(query) > -1;
          }}
          onItemSelect={(item) => {
            console.log(item, " =item");
            store.actions.changeSelectedPages([...store.ui.pages.get(), item]);
          }}
          itemRenderer={(item, itemProps) => {
            return (
              <SelectMenuItem
                selected={store.ui.pages.isSelected(item)}
                {...itemProps}
                onClick={itemProps.handleClick}
                shouldDismissPopover={false}
                text={item}
              />
            );
          }}
        >
          <Button icon="search-template" text="Search in page" />
        </Select>
      </div>
    </section>
  );
});
