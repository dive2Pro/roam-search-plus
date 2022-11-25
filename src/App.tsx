import {
  Button,
  InputGroup,
  Dialog,
  Classes,
  Divider,
  Overlay,
  Switch,
  Checkbox,
  Menu,
  Popover,
  Position,
  MenuItem,
  Icon,
  Tooltip,
  ControlGroup,
  TagInput,
  Label,
  Intent,
  MenuItemProps,
  ButtonGroup,
} from "@blueprintjs/core";

import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { ItemRenderer, MultiSelect, Select } from "@blueprintjs/select";
import { store } from "./store";
import { For, enableLegendStateReact, observer } from "@legendapp/state/react";
import { MOMENT_FORMATS } from "./moment";
import { observable, ObservableObject } from "@legendapp/state";
import { ListContainer, QueryResult } from "./query-result";
enableLegendStateReact();

function SelectMenuItem(props: { selected: boolean } & MenuItemProps) {
  return (
    <MenuItem
      {...props}
      {...(props.selected
        ? {
            icon: "blank",
          }
        : {
            icon: "blank",
          })}
    />
  );
}

type Item = ObservableObject<{ text: string; id: number }>;
const HistoryItem = observer(({ item }: { item: Item }) => {
  return (
    <Button
      minimal
      alignText="left"
      className="query-history-item"
      onClick={() => {
        store.actions.useHistory(item.text.peek());
      }}
      rightIcon={
        <Icon
          className=""
          onClick={(e) => {
            e.preventDefault();
            store.actions.deleteHistory(item.id.peek());
          }}
          icon="small-cross"
        />
      }
      fill
      text={item.text}
    />
  );
});

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
const Sidebar = observer(() => {
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

const QueryHistory = observer(() => {
  return (
    <div>
      <div>
        <div>
          <h4 className="bp3-heading">Latest search</h4>
        </div>
        <div>
          <For each={store.ui.getHistory().search} item={HistoryItem}></For>
        </div>
      </div>
    </div>
  );
});

function _App() {
  return (
    <>
      <Dialog
        usePortal={false}
        isOpen={store.ui.isOpen()}
        style={{
          paddingBottom: 0,
          width: "unset",
          alignItems: "flex-start",
        }}
        onClose={() => store.actions.closeDialog()}
        portalClassName="top-dialog"
      >
        <div style={{ display: "flex" }}>
          <section style={{ width: 600, padding: 10 }}>
            <div>
              <InputGroup
                placeholder="search..."
                leftIcon={
                  store.ui.isLoading() ? (
                    <Icon icon="refresh" size={14} className="loading" />
                  ) : (
                    "search"
                  )
                }
                autoFocus
                fill
                rightElement={
                  store.ui.isTyped() ? (
                    <Button
                      onClick={() => {
                        store.actions.clearSearch();
                      }}
                      icon="small-cross"
                      minimal
                      small
                    />
                  ) : undefined
                }
                value={store.ui.getSearch()}
                onChange={(e) => store.actions.changeSearch(e.target.value)}
              />
            </div>
            <div>
              <ButtonGroup className="sub-bg">
                {/* <Checkbox
                  checked={store.ui.isMultipleSelection()}
                  onChange={(e) => store.actions.toggleMultiple()}
                  label="Multiple Select"
                ></Checkbox>
                <Divider /> */}
                <Popover
                  position={Position.BOTTOM}
                  modifiers={{
                    arrow: {
                      enabled: false,
                    },
                  }}
                  content={
                    <Menu>
                      {store.ui.sort.selection().map((item, index) => {
                        return (
                          <MenuItem
                            onClick={() => store.actions.changeSort(index)}
                            text={item.text}
                          />
                        );
                      })}
                    </Menu>
                  }
                >
                  <div>
                    Sort By:{" "}
                    <Button
                      rightIcon={<Icon icon="chevron-down" size={12} />}
                      minimal
                      text={store.ui.sort.selectedText()}
                    ></Button>
                  </div>
                </Popover>
              </ButtonGroup>
            </div>

            <Divider />

            {store.ui.isTyped() ? <ListContainer /> : <QueryHistory />}

            <div className={Classes.DIALOG_FOOTER}>
              {store.ui.isMultipleSelection() ? (
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                  {store.ui.isShowSelectedTarget() ? (
                    <Button
                      intent="none"
                      icon="cross"
                      onClick={store.actions.changeShowSelectedTarget}
                    />
                  ) : (
                    <Button
                      intent="success"
                      onClick={store.actions.changeShowSelectedTarget}
                      disabled={store.ui.selectedCount() === 0}
                    >
                      {store.ui.selectedCount()}
                    </Button>
                  )}

                  <Popover
                    interactionKind="hover"
                    position="right"
                    content={
                      <Menu>
                        <MenuItem
                          icon="duplicate"
                          text="Copy as one line"
                        ></MenuItem>
                        <MenuItem
                          icon="multi-select"
                          text="Copy as multiple line"
                        ></MenuItem>
                      </Menu>
                    }
                  >
                    <Button
                      disabled={store.ui.selectedCount() === 0}
                      intent="primary"
                      onClick={() => {
                        console.log("-----");
                        store.actions.confirmMultiple();
                      }}
                    >
                      Confirm
                    </Button>
                  </Popover>
                </div>
              ) : (
                <sub>Ctrl + as reference</sub>
              )}
            </div>
          </section>
          <Sidebar />
        </div>
      </Dialog>
      <Button onClick={() => store.actions.openDialog()}>Search</Button>
    </>
  );
}

export default observer(_App);
