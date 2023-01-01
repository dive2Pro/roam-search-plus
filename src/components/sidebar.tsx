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
  Radio,
  RadioGroup,
  Menu,
  Divider,
} from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { Select } from "@blueprintjs/select";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
import { ReactNode, useState } from "react";
import { MOMENT_FORMATS } from "../moment";
import { store } from "../store";
import { BottomPopup } from "./bottom-popup";

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
        display: store.ui.isTyped() ? "flex" : "none",
      }}
      className="sidebar"
    >
      <div>
        <Switch
          label="Case Intensive"
          onChange={(e) => {
            store.actions.conditions.toggleCaseIntensive();
          }}
          checked={store.ui.conditions.isCaseIntensive()}
          alignIndicator="right"
        />
        <div className="sidebar-title bp3-button-text">Includes</div>
        <Switch
          label="Include page"
          onChange={(e) => {
            store.actions.conditions.toggleIncludePage();
          }}
          checked={store.ui.conditions.isIncludePage()}
          alignIndicator="right"
        />

        <Switch
          label="Include blocks"
          onChange={(e) => {
            store.actions.conditions.toggleIncludeBlock();
          }}
          checked={store.ui.conditions.isIncludeBlock()}
          alignIndicator="right"
        />
        <div className="sidebar-title bp3-button-text">Contents</div>
        <Switch
          label="Show code blocks"
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
        {store.ui.conditions.pages.getSelected().length === 0 ? null : (
          <div>
            <div className="sidebar-title bp3-button-text">Search in pages</div>
            {store.ui.conditions.pages.getSelected().map((item) => {
              return (
                <Button
                  key={item.id}
                  minimal
                  icon="application"
                  fill
                  alignText="left"
                  rightIcon={
                    <Icon
                      onClick={() => {
                        store.actions.conditions.changeSelectedPages(item);
                      }}
                      icon="small-cross"
                    />
                  }
                >
                  {item.text}
                </Button>
              );
            })}

            <SelectPages>
              <Button
                icon="add"
                alignText="left"
                fill
                minimal
                text="add page"
              />
            </SelectPages>
          </div>
        )}
        {store.ui.conditions.users.getSelected().length === 0 ? null : (
          <div>
            <div className="sidebar-title bp3-button-text">
              Created By Users
            </div>
            {store.ui.conditions.users.getSelected().map((item) => {
              return (
                <Button
                  key={item.id}
                  minimal
                  icon="person"
                  fill
                  alignText="left"
                  rightIcon={
                    <Icon
                      onClick={() => {
                        store.actions.conditions.changeSelectedUsers(item);
                      }}
                      icon="small-cross"
                    />
                  }
                >
                  {item.text}
                </Button>
              );
            })}
            <SelectCreateUsers>
              <Button icon="add" alignText="left" fill minimal text="Users" />
            </SelectCreateUsers>
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
        {store.ui.conditions.users.getSelected().length > 0 ? null : (
          <Button
            minimal
            icon="person"
            fill
            alignText="left"
            onClick={() => {
              store.actions.quick.me();
            }}
          >
            Created By Me
          </Button>
        )}
        {store.ui.date.lastEdit() ? null : (
          <>
            <Button
              minimal
              icon="calendar"
              fill
              alignText="left"
              onClick={store.actions.quick.today}
            >
              Modified Today
            </Button>
            <Button
              minimal
              icon="calendar"
              fill
              alignText="left"
              onClick={store.actions.quick.lastWeek}
            >
              Modified Last week
            </Button>
          </>
        )}

        {store.ui.conditions.pages.hasCurrentPage() ? (
          <Button
            minimal
            icon="application"
            fill
            alignText="left"
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
              Modified date
            </Button>
          </Popover>
        )}
        {store.ui.conditions.pages.getSelected().length > 0 ? null : (
          <SelectPages>
            <Button
              icon="search-template"
              alignText="left"
              fill
              minimal
              text="Search in page"
            />
          </SelectPages>
        )}
        {store.ui.conditions.users.getSelected().length > 0 ? null : (
          <SelectCreateUsers>
            <Button minimal icon="person" fill alignText="left">
              Select Users
            </Button>
          </SelectCreateUsers>
        )}
      </div>
      <div style={{ flex: 1 }}></div>

      {store.ui.conditions.hasChanged() ? (
        <Button
          icon="reset"
          minimal
          fill
          text="Reset"
          onClick={store.actions.conditions.reset}
        />
      ) : null}
    </section>
  );
});

const SelectPages = observer((props: { children: ReactNode }) => {
  return (
    <Select
      items={store.ui.conditions.pages.get()}
      itemPredicate={(query, item, index) => {
        return item.text.indexOf(query) > -1;
      }}
      onItemSelect={(item) => {
        store.actions.conditions.changeSelectedPages(item);
      }}
      className="w-100p"
      itemRenderer={(item, itemProps) => {
        return (
          <SelectMenuItem
            selected={store.ui.conditions.pages.isSelected(item.id)}
            {...itemProps}
            onClick={itemProps.handleClick}
            shouldDismissPopover={false}
            text={item.text}
          />
        );
      }}
    >
      {props.children}
    </Select>
  );
});

const SelectCreateUsers = observer((props: { children: ReactNode }) => {
  return (
    <Select
      items={store.ui.conditions.users.get()}
      itemPredicate={(query, item, index) => {
        return item.text.indexOf(query) > -1;
      }}
      onItemSelect={(item) => {
        store.actions.conditions.changeSelectedUsers(item);
      }}
      className="w-100p"
      itemRenderer={(item, itemProps) => {
        return (
          <SelectMenuItem
            selected={store.ui.conditions.users.isSelected(item.id)}
            {...itemProps}
            onClick={itemProps.handleClick}
            shouldDismissPopover={false}
            text={item.text}
          />
        );
      }}
    >
      {props.children}
    </Select>
  );
});

export const MobileSidebar = observer(() => {
  return (
    <>
      <Button
        icon="filter"
        intent="primary"
        onClick={() => {
          store.actions.toggleFilter();
        }}
        minimal
        small
      >
        Filter
      </Button>
      <BottomPopup
        size="540px"
        title={"Filter"}
        isOpen={store.ui.isFilterOpen()}
        onClose={() => store.actions.toggleFilter()}
      >
        <Sidebar />
      </BottomPopup>
    </>
  );
});
