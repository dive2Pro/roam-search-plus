import {
  Icon,
  Checkbox,
  Classes,
  Card,
  Button,
  ButtonGroup,
  Divider,
  Menu,
  MenuItem,
  Popover,
  Position,
  Toaster,
} from "@blueprintjs/core";
import { For, observer } from "@legendapp/state/react";
import {
  store,
  ResultItem,
  findLowestParentFromResult,
  SelectResultItem,
} from "../store";
import { ObservableObject, observe } from "@legendapp/state";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { date, highlightText } from "../helper";
import { Virtuoso } from "react-virtuoso";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { UnderMobile } from "./commons/under-mobile";
import { MobileSidebar } from "./sidebar";
import { isAutoCloseWhenShiftClick } from "../config";
import { usePortal } from "./commons/use-portal";
import { isPageByUid } from "../roam";
dayjs.extend(relativeTime);

const Row = observer((props: { item: ResultItem }) => {
  const [text, setText] = useState(<>{props.item.text}</>);
  const [children, setChildren] = useState(props.item.children);
  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    let timeout: any;
    const textDispose = observe(() => {
      const search = store.ui.getSearch();
      const isLoading = store.ui.isLoading();
      clearTimeout(timeout);
      if (isLoading) {
        return;
      }
      if (!search) {
        setText(props.item.text as JSX.Element);
        return;
      }
      window.requestIdleCallback(() => {
        timeout = setTimeout(() => {
          setText(highlightText(props.item.text as string, search));
          setChildren(
            children.map((child) => {
              return {
                ...child,
                text: highlightText(child.text as string, search),
              };
            })
          );
        }, 50);
      });
    });

    const pathDispose = observe(() => {
      const isLoading = store.ui.isLoading();
      if (isLoading) {
        return;
      }

      setPath(store.ui.getPathsFromUid(props.item.id));
    });

    return () => {
      textDispose();
      pathDispose();
    };
  }, [props.item.id]);

  const handlerClick = (e: React.MouseEvent, item: ResultItem) => {
    e.preventDefault();
    e.stopPropagation();
    let opened = false;
    if (e.shiftKey) {
      opened = store.actions.confirm.openInSidebar(item);
      if (opened) {
        if (isAutoCloseWhenShiftClick() && !store.ui.mode.isMaximize()) {
          store.actions.closeDialog();
        }
      }
    } else {
      opened = store.actions.confirm.openInMain(item);
      if (opened) store.actions.closeDialog();
    }
    opened && store.actions.history.saveSearch(store.ui.getSearch());
    !opened &&
      Toaster.create({}).show({
        message: `${item.isPage ? "Page" : "Block"} was deleted`,
        intent: "warning",
      });
  };

  let content;
  const mappedChildren = children.map((child) => {
    return (
      <Card
        interactive
        onClick={(e) => handlerClick(e, child)}
        className="result-item-child"
      >
        <div className="flex-row" data-uid={child.id}>
          <Icon icon="symbol-circle" size={10} />
          <div className="result-item-content" style={{ marginLeft: 10 }}>
            {child.text}
          </div>
        </div>
      </Card>
    );
  });
  if (props.item.isPage) {
    content = (
      <div>
        <div className="result-item-content">{text}</div>
        {mappedChildren}
      </div>
    );
  } else {
    content = (
      <>
        <div className="flex-row result-breadcrumbs">
          {path.map((s, index, ary) => {
            return (
              <span>
                {s}
                {index < ary.length - 1 ? (
                  <Icon
                    size={12}
                    style={{ margin: "0 4px" }}
                    icon="chevron-right"
                  />
                ) : null}
              </span>
            );
          })}
        </div>
        <div className="result-item-content">{text}</div>
        {mappedChildren}
      </>
    );
  }
  return (
    <section
      className="result-item-container"
      onClick={(e) => handlerClick(e, props.item)}
      data-uid={props.item.id}
    >
      <Icon
        icon={isPageByUid(props.item.id) ? "application" : "paragraph"}
      ></Icon>
      <div style={{ width: "100%", marginLeft: 10 }}>
        {content}
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <span className="date date-fromnow">
            {date.fromNow(props.item.editTime)}
          </span>
          <span className="date date-common">
            {date.format(props.item.editTime)}
          </span>
        </div>
      </div>
    </section>
  );
});

const CheckboxAbleRow = observer((props: { item: ResultItem }) => {
  return (
    <Checkbox
      checked={store.ui.isSelectedTarget(props.item)}
      onChange={() => store.actions.changeSelectedTarget(props.item)}
      className="flex-row-center check-item"
    >
      <Row {...props} />
    </Checkbox>
  );
});

const TargetCheckboxAbleRow = observer(
  (props: { item: ObservableObject<SelectResultItem> }) => {
    // console.log(props.item, " = item");
    return (
      <Checkbox
        checked={store.ui.isSelectedTargetInResult(props.item.peek())}
        onChange={() =>
          store.actions.changeSelectedTargetInResult(props.item.peek())
        }
        className="flex-row-center check-item"
      >
        <Row item={props.item.get()} />
      </Checkbox>
    );
  }
);

export const QueryResult = observer(() => {
  const isMultipleSelection = store.ui.isMultipleSelection();
  let Item = Row;
  if (isMultipleSelection) {
    Item = CheckboxAbleRow;
  } else {
    Item = Row;
  }

  const getList = () => {
    const list = store.ui.result.list();
    return list;
  };
  const list = getList();

  useLayoutEffect(() => {
    const el = [...document.querySelectorAll("[data-test-id]")].find(
      (el) => el.getAttribute("data-test-id") === "virtuoso-item-list"
    ) as HTMLElement;
    setTimeout(() => {
      const vHeight = el.getBoundingClientRect().height;

      // list.length > 20 ? MAX : list.length > 10 ? Math.min(MIN + 200, MAX) : MIN;
      // const height = MAX;
      console.log(" lahyout effect", vHeight);
      store.actions.setHeight(vHeight);
    });
  }, [list]);
  return (
    <Virtuoso
      className="infinite-scroll"
      style={store.ui.result.getListStyle()}
      totalCount={list.length}
      data={list}
      itemContent={(index, data) => {
        // console.log('index = ', index)
        if (data.needCreate) {
          return <PageCreator data={data} />;
        }

        data = findLowestParentFromResult(data);
        return (
          <Item key={data.text.toString() + "-" + data.editTime} item={data} />
        );
      }}
    ></Virtuoso>
  );
});

const PageCreator = observer((props: { data: ResultItem }) => {
  return (
    <section
      className="result-item-container"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        store.actions.createPage(props.data.text as string);
        store.actions.closeDialog();
      }}
    >
      <Icon icon={"application"}></Icon>
      <div style={{ width: "100%", marginLeft: 10 }}>
        <Button small style={{ marginRight: 10 }}>
          Create Page
        </Button>
        {props.data.text}
      </div>
    </section>
  );
});
const SelectedResult = observer(() => {
  return (
    <div className="selected-result">
      <For each={store.ui.selectedTarget()} item={TargetCheckboxAbleRow} />
    </div>
  );
});

export const ListContainer = observer(() => {
  return (
    <div className="result-container">
      {store.ui.isLoading() && store.ui.result.size() === 0 ? (
        <div className="flex-row-center h-200">Searching...</div>
      ) : store.ui.hasResult() ? (
        <>
          <QueryResult />
        </>
      ) : (
        <div className="flex-row-center h-200">No results</div>
      )}
      {store.ui.isShowSelectedTarget() ? <SelectedResult /> : null}
    </div>
  );
});
