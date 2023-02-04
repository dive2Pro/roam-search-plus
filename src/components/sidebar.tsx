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
  InputGroup,
  Divider,
} from "@blueprintjs/core";
import { DateRange, DateRangePicker } from "@blueprintjs/datetime";
import { Select, MultiSelect, MultiSelectProps } from "@blueprintjs/select";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
import { ReactNode, useState } from "react";
import { CONSTNATS } from "../helper";
import { MOMENT_FORMATS } from "../moment";
import { store } from "../store";
import { BottomPopup } from "./bottom-popup";
import { usePortal } from "./commons/use-portal";
import { Virtuoso } from "react-virtuoso";

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

        <div className="sidebar-title bp3-button-text">References</div>
        <div className="sidebar-title bp3-button-text">Includes</div>

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
          <SelectPages
            items={store.ui.conditions.pages.get()}
            onItemSelect={(item) => {
              store.actions.conditions.changeSelectedPages(item);
            }}
            selectedItems={store.ui.conditions.pages.getSelected()}
            tagInputProps={{
              onRemove(value, index) {
                store.actions.conditions.changeSelectedPages(store.ui.conditions.pages.getSelected()[index]);
              }
            }}

            itemRenderer={(item, itemProps) => {
              return (
                <SelectMenuItem
                  selected={store.ui.conditions.pages.isSelected(item.id)}
                  {...itemProps}
                  onClick={itemProps.handleClick}
                  shouldDismissPopover={false}
                  text={item.text} />
              );
            }}
          >
            <Button
              icon="document"
              alignText="left"
              minimal
              outlined={!!store.ui.conditions.pages.getSelected().length}
              intent={store.ui.conditions.pages.getSelected().length ? "primary" : 'none'}
              text={
                <span className={"ellipsis-to-left block " +
                  (store.ui.conditions.pages.getSelected().length ? 'primary' : '')
                }
                  style={{
                    direction: 'unset',
                    display: 'block',
                    width: 140
                  }}
                >
                  Page: {store.ui.conditions.pages.getSelected().map(item => item.text).join(",")}
                </span>
              } />
          </SelectPages>
        </div>
        <div className="sidebar-title bp3-button-text">Exclude</div>
        {(() => {
          const selectedItems = store.ui.conditions.exclude.page.getSelected()
          return <SelectPages2
            content={
              <RoamPageFilter
                header={
                  <RoamTagFilterHeader
                    selectedItems={selectedItems}
                    onItemBtnClick={(item) => {
                      store.actions.conditions.exclude.page.changeSelected(item);
                    }}
                    onClear={() => {
                      store.actions.conditions.exclude.page.clearSelected();
                    }}
                  />
                }
                items={store.ui.conditions.pages.get()}
                onItemSelect={(item) => {
                  store.actions.conditions.exclude.page.changeSelected(item);
                }}
                selectedItems={selectedItems}
                tagInputProps={{
                  onRemove(value, index) {
                    store.actions.conditions.exclude.page.changeSelected(selectedItems[index]);
                  }
                }}
                itemRenderer={(item, itemProps) => {
                  const selected = store.ui.conditions.exclude.page.isSelected(item.id)
                  return (
                    <Button
                      {...selected ? { active: true, intent: 'primary' } : {}}
                      minimal small fill alignText="left" text={item.text} onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        store.actions.conditions.exclude.page.changeSelected(item);

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
              outlined={!!selectedItems.length}
              intent={selectedItems.length ? "danger" : 'none'}
              text={
                <span className={"ellipsis-to-left block " +
                  (selectedItems.length ? 'danger' : '')
                }
                  style={{
                    direction: 'unset',
                    display: 'block',
                    width: 140
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
                    onClearRemoves={() => {
                      store.actions.conditions.filter.tag.exclude.clearSelected();
                    }}
                  />
                }
                items={items}
                onItemSelect={(item) => {
                  store.actions.conditions.exclude.tag.changeSelected(item);
                }}

                itemRenderer={(item, itemProps) => {
                  const selected = store.ui.conditions.exclude.tag.isSelected(item.id)
                  return (
                    <Button
                      {...selected ? { active: true, intent: 'primary' } : {}}

                      minimal small fill alignText="left" text={item.text} onClick={e => {
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
              outlined={!!selectedItems.length}
              intent={selectedItems.length ? "primary" : 'none'}
              text={
                <span className={"ellipsis-to-left block " +
                  (selectedItems.length ? 'danger' : '')
                }
                  style={{
                    direction: 'unset',
                    display: 'block',
                    width: 140
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

function RoamTagFilterHeader<T extends { text: string }>(props: {
  onItemAddClick?: (item: T) => void,
  onItemRemoveClick?: (item: T) => void,
  onClearAdded?: () => void,
  onClearRemoves?: () => void,
  includes: T[],
  excludes: T[]
}) {

  return <div className="flex-row">
    <div className="flex-1">
      <div className="flex-row p-1.5">
        <strong style={{ marginRight: 8 }}>Includes{` `}</strong> Click to Add
        <div className="flex-1" />
        <Button minimal small icon="delete" onClick={() => {
          props.onClearAdded();
        }} />
      </div>
      {props.includes.length ?
        <div className="flex-row flex-wrap flex-1">
          {props.includes.map(item => {
            return <Button small text={item.text} style={{ margin: 4 }}
              onClick={() => props.onItemAddClick(item)}
            />
          })}
        </div> : null

      }

    </div>
    <Divider />
    <div className="flex-1">
      <div className="flex-row p-1.5">
        <strong style={{ marginRight: 8 }}>Removes</strong> Shift+Click to Add
        <div className="flex-1" />
        <Button minimal small icon="delete" onClick={() => {
          props.onClearRemoves();
        }} />
      </div>
      <div className="flex-row flex-wrap flex-1">
        {props.excludes.map(item => {
          return <Button small text={item.text} style={{ margin: 4 }}
            onClick={() => props.onItemRemoveClick(item)}
          />
        })}
      </div>
    </div>
    <div className="rm-line"></div>
  </div>

}

function RoamPageFilter(props: Omit<MultiSelectProps<{ id: string, text: string }>, 'tagRenderer'> & {
  header?: JSX.Element
}) {
  const [search, setSearch] = useState("");
  const pages = props.items.filter(item => {
    return item.text.toLowerCase().includes(search.toLowerCase());
  });

  return <div className="page-select">
    {props.header}
    <InputGroup
      value={search}
      placeholder="search..."
      onChange={e => setSearch(e.target.value)}
    />
    <Virtuoso
      style={{
        height: 300,
      }}
      totalCount={pages.length}
      data={pages}
      itemContent={(index, data) => {
        return props.itemRenderer(data, {} as any);
      }}
    />
  </div>
}

const SelectPages2 = observer(({ children, content, ...rest }: { children: ReactNode, content: JSX.Element }) => {
  return (
    <Popover
      onOpened={() => {
        store.actions.conditions.toggleSelect()
      }}
      onClose={() => {
        store.actions.conditions.toggleSelect()
      }}
      content={content}>
      {children}
    </Popover >
  );
});

const SelectPages = observer(({ children, ...rest }: { children: ReactNode } & Omit<MultiSelectProps<{ id: string, text: string }>, 'tagRenderer'>) => {
  return (
    <Popover
      onOpened={() => {
        store.actions.conditions.toggleSelect()
      }}
      onClose={() => {
        store.actions.conditions.toggleSelect()
      }}
      content={
        <MultiSelect
          className="w-100p page-select"
          {...rest}
          popoverProps={{
            usePortal: usePortal(),
          }}
          itemPredicate={(query, item, index) => {
            return item.text.toLowerCase().indexOf(query.toLowerCase()) > -1;
          }}
          tagRenderer={function (item: { id: string; text: string; }): ReactNode {
            return item.text
          }}
        >
        </MultiSelect>}
    >
      {children}
    </Popover>

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
