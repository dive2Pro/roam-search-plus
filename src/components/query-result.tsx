import { Icon, Checkbox, Classes, Card } from "@blueprintjs/core";
import { For, observer } from "@legendapp/state/react";
import { store, ResultItem } from "../store";
import { ObservableObject, observe } from "@legendapp/state";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { highlightText } from "../helper";
import { Virtuoso } from "react-virtuoso";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
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
      if (!search || isLoading) {
        return;
      }
      // console.log("run~~~~~", search, isLoading);

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
      const search = store.ui.getSearch();
      const isLoading = store.ui.isLoading();
      if (isLoading || !search) {
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
    if (e.shiftKey) {
      // store.actions.closeDialog();
      store.actions.confirm.openInSidebar([item]);
    } else if (e.altKey) {
      store.actions.confirm.saveAsReference([item]);
    } else {
      store.actions.confirm.openInMain(item);
    }
    store.actions.closeDialog();
  };

  let content;
  if (props.item.isPage) {
    content = (
      <div>
        <div className="result-item-content">{text}</div>
        {children.map((child) => {
          return (
            <Card
              interactive
              onClick={(e) => handlerClick(e, child)}
              className="result-item-child"
            >
              <div className="flex-row">
                <Icon icon="symbol-circle" size={10} />
                <div className="result-item-content" style={{ marginLeft: 10 }}>
                  {child.text}
                </div>
              </div>
            </Card>
          );
        })}
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
      </>
    );
  }
  return (
    <section
      className="result-item-container"
      onClick={(e) => handlerClick(e, props.item)}
    >
      <Icon icon={props.item.isPage ? "application" : "paragraph"}></Icon>
      <div style={{ width: "100%", marginLeft: 10 }}>
        {content}
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <span className="date date-fromnow">
            {dayjs(props.item.editTime).fromNow()}
          </span>
          <span className="date date-common">
            {dayjs(props.item.editTime).format("HH:mm MMM DD, YYYY")}
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
      // onChange={() => store.actions.changeSelectedTarget(props.item)}
    >
      <Row {...props} />
    </Checkbox>
  );
});

const TargetCheckboxAbleRow = observer(
  (props: { item: ObservableObject<ResultItem> }) => {
    console.log(props.item, " = item");
    return (
      <Checkbox
        checked={store.ui.isSelectedTarget(props.item.get())}
        onChange={() => store.actions.changeSelectedTarget(props.item)}
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
  const list = store.ui.result.list();
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
      itemContent={(index, data) => <Item key={data.id} item={data} />}
    ></Virtuoso>
  );
});

const SelectedResult = observer(() => {
  return (
    <div className="selected-result">
      <For each={store.ui.copySelectedTarget()} item={TargetCheckboxAbleRow} />
    </div>
  );
});

export const ListContainer = observer(() => {
  return (
    <div className="result-container">
      <QueryResult />
      {store.ui.isShowSelectedTarget() ? <SelectedResult /> : null}
    </div>
  );
});
