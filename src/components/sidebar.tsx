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
  Menu,
} from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { Select, MultiSelect, MultiSelectProps } from "@blueprintjs/select";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
import { ReactNode } from "react";
import { CONSTNATS } from "../helper";
import { MOMENT_FORMATS } from "../moment";
import { store } from "../store";
import { BottomPopup } from "./bottom-popup";
import { usePortal } from "./commons/use-portal";
import { RoamPageFilter } from "./RoamPageFilter";
import { RoamTagFilterHeader } from "./RoamTagFilterHeader";

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
          label="Block reference to string"
          onChange={(e) => {
            store.actions.conditions.toggleBlockRefToString();
          }}
          checked={store.ui.conditions.isBlockRefToString()}
          alignIndicator="right"
        />
        <Switch
          label="Show code blocks"
          onChange={(e) => {
            store.actions.conditions.toggleIncludeCodeblock();
          }}
          checked={store.ui.conditions.isIncludeCodeblock()}
          alignIndicator="right"
        />

        <div className="sidebar-title bp3-button-text">Scopes</div>

        {/* 
        <Switch label="Only Block" alignIndicator="right" />
        <Switch label="Have Twitter" alignIndicator="left" />
              <Switch label="Have PDF" alignIndicator="left" />
              <Switch label="Have Media" alignIndicator="left" /> */}
        {(() => {
          const tagExclude = store.ui.conditions.filter.page.exclude();
          const tagInclude = store.ui.conditions.filter.page.include();
          const selectedItems = tagExclude.concat(tagInclude);
          const pages = store.ui.conditions.pages.get();
          const items = pages.filter(page => {
            return !tagExclude.some(sItem => sItem.id === page.id) && !tagInclude.some(sItem => sItem.id === page.id)
          });
          return <SelectPages2
            content={
              <RoamPageFilter
                header={
                  <RoamTagFilterHeader
                    includes={tagInclude}
                    excludes={tagExclude}
                    onItemAddClick={(item) => {
                      store.actions.conditions.filter.page.include.changeSelected(item);
                    }}
                    onItemRemoveClick={(item => {
                      store.actions.conditions.filter.page.exclude.changeSelected(item);
                    })}
                    onClearAdded={() => {
                      store.actions.conditions.filter.page.include.clearSelected();
                    }}
                    onClearexcludes={() => {
                      store.actions.conditions.filter.page.exclude.clearSelected();
                    }}
                  />
                }
                items={items}

                itemRenderer={(index, item) => {
                  return (
                    <Button

                      minimal fill alignText="left" text={item.text} onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.shiftKey) {
                          store.actions.conditions.filter.page.exclude.changeSelected(item);

                          return
                        }
                        store.actions.conditions.filter.page.include.changeSelected(item);

                      }}>
                    </Button>
                  );
                }}
              />
            }

          >
            <Button
              icon="document"
              alignText="left"
              minimal
              style={{
                maxWidth: '100%'
              }}
              outlined={!!selectedItems.length}
              intent={selectedItems.length ? "primary" : 'none'}
              text={
                <span className={"ellipsis-to-left block " +
                  (selectedItems.length ? 'primary' : '')
                }
                  style={{
                    direction: 'unset',
                    display: 'block',
                  }}
                >
                  Page: {selectedItems.map(item => item.text).join(",")}
                </span>
              } />
          </SelectPages2>
        })()}
        <div className="h-1" />
        {(() => {
          const tagExclude = store.ui.conditions.filter.tag.exclude();
          const tagInclude = store.ui.conditions.filter.tag.include();
          const selectedItems = tagExclude.concat(tagInclude);
          const pages = store.ui.conditions.pages.get();
          const items = pages.filter(page => {
            return !tagExclude.some(sItem => sItem.id === page.id) && !tagInclude.some(sItem => sItem.id === page.id)
          });
          return <SelectPages2
            content={
              <RoamPageFilter
                header={
                  <RoamTagFilterHeader
                    includes={tagInclude}
                    excludes={tagExclude}
                    onItemAddClick={(item) => {
                      store.actions.conditions.filter.tag.include.changeSelected(item);
                    }}
                    onItemRemoveClick={(item => {
                      store.actions.conditions.filter.tag.exclude.changeSelected(item);
                    })}
                    onClearAdded={() => {
                      store.actions.conditions.filter.tag.include.clearSelected();
                    }}
                    onClearexcludes={() => {
                      store.actions.conditions.filter.tag.exclude.clearSelected();
                    }}
                  />
                }
                items={items}
                itemRenderer={(index, item) => {
                  return (
                    <Button
                      // rightIcon={
                      //   <span>{item.backlinkCount}</span>
                      // }
                      minimal fill alignText="left" text={item.text} onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.shiftKey) {
                          store.actions.conditions.filter.tag.exclude.changeSelected(item);

                          return
                        }
                        store.actions.conditions.filter.tag.include.changeSelected(item);

                      }}>
                    </Button>
                  );
                }}
              />
            }
          >
            <Button
              icon="tag"
              alignText="left"
              minimal
              style={{
                maxWidth: '100%'
              }}
              outlined={!!selectedItems.length}
              intent={selectedItems.length ? "primary" : 'none'}
              text={
                <span className={"ellipsis-to-left block " +
                  (selectedItems.length ? 'primary' : '')
                }
                  style={{
                    direction: 'unset',
                    display: 'block',
                  }}
                >
                  Tag: {selectedItems.map(item => item.text).join(",")}
                </span>
              } />
          </SelectPages2>
        })()}

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
              usePortal={usePortal()}
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
            usePortal={usePortal()}
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

const SelectPages2 = observer(({ children, content, ...rest }: { children: ReactNode, content: JSX.Element }) => {
  return (
    <Popover
      onOpened={() => {
        store.actions.conditions.toggleSelect(true)
      }}
      onClosed={() => {
        store.actions.conditions.toggleSelect(false)
      }}
      autoFocus={false}
      content={content}>
      {children}
    </Popover >
  );
});

const SelectCreateUsers = observer((props: { children: ReactNode }) => {
  return (
    <Select
      items={store.ui.conditions.users.get()}
      itemPredicate={(query, item, index) => {
        return item.text.indexOf(query) > -1;
      }}
      popoverProps={{
        // portalClassName: `${CONSTNATS.el}-portal`,
        // className: `${CONSTNATS.el}-portal`,
        usePortal: usePortal(),
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
        size={"85%"}
        title={"Filter"}
        isOpen={store.ui.isFilterOpen()}
        onClose={() => store.actions.toggleFilter()}
      >
        <Sidebar />
      </BottomPopup>
    </>
  );
});
