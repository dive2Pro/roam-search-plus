import {
  Switch,
  Popover,
  Position,
  Classes,
  Button,
  Icon,
  Intent,
  MenuItem,
  MenuItemProps,
} from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { Select } from "@blueprintjs/select";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
import { MOMENT_FORMATS } from "../moment";
import { store } from "../store";

function SelectMenuItem(props: { selected: boolean } & MenuItemProps) {
  return (
    <MenuItem
      {...props}
      {...(props.selected
        ? {
            icon: "small-tick",
          }
        : {})}
    />
  );
}

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
      className="sidebar"
    >
      <div>
        <Switch
          label="Only page"
          onChange={(e) => {
            store.actions.conditions.toggleOnlyPage();
          }}
          checked={store.ui.conditions.isOnlyPage()}
          alignIndicator="right"
        />
        <Switch
          label="Include code blocks"
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
        {store.ui.pages.getSelected().length === 0 ? null : (
          <div>
            <div className="sidebar-title bp3-button-text">Search in pages</div>
            {store.ui.pages.getSelected().map((item) => {
              return (
                <Button
                  key={item.id}
                  minimal
                  icon="calendar"
                  fill
                  alignText="left"
                  rightIcon={
                    <Icon
                      onClick={() => {
                        store.actions.changeSelectedPages(item);
                      }}
                      icon="small-cross"
                    />
                  }
                >
                  {item.text}
                </Button>
              );
            })}

            <SelectPages text="Add page" />
          </div>
        )}
        {store.ui.date.lastEdit() ? (
          <div>
            <div className="sidebar-title bp3-button-text">Latest Edit</div>
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
                fill
                alignText="left"
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
        <div className="sidebar-title bp3-button-text">Quick Search</div>
        <Button minimal icon="person">
          Created By Me
        </Button>
        <Button minimal icon="calendar" onClick={store.actions.quick.today}>
          Modifyied Today
        </Button>
        <Button minimal icon="calendar" onClick={store.actions.quick.lastWeek}>
          Modifyied Last week
        </Button>
        {store.ui.pages.hasCurrentPage() ? (
          <Button
            minimal
            icon="search-text"
            onClick={store.actions.quick.currentPage}
          >
            Search in current page
          </Button>
        ) : null}

        <div className="sidebar-title bp3-button-text">Custom Search</div>
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
            <Button minimal fill alignText="left" icon="calendar">
              Modifyied date
            </Button>
          </Popover>
        )}
        {store.ui.pages.getSelected().length > 0 ? null : (
          <SelectPages text="Search in page" />
        )}
      </div>
    </section>
  );
});

const SelectPages = observer((props: { text: string }) => {
  return (
    <Select
      items={store.ui.pages.get()}
      itemPredicate={(query, item, index) => {
        return item.text.indexOf(query) > -1;
      }}
      onItemSelect={(item) => {
        store.actions.changeSelectedPages(item);
      }}
      itemRenderer={(item, itemProps) => {
        return (
          <SelectMenuItem
            selected={store.ui.pages.isSelected(item.id)}
            {...itemProps}
            onClick={itemProps.handleClick}
            shouldDismissPopover={false}
            text={item.text}
          />
        );
      }}
    >
      <Button
        icon="search-template"
        alignText="left"
        fill
        minimal
        text={props.text}
      />
    </Select>
  );
});
