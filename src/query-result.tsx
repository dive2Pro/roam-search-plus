import {
  MenuItem,
  Menu,
  Boundary,
  Breadcrumbs,
  CollapsibleList,
  OverflowList,
  Button,
  Icon,
  Divider,
  Checkbox,
  Classes,
} from "@blueprintjs/core";
import { For, enableLegendStateReact, observer } from "@legendapp/state/react";
import { store, ResultItem } from "./store";
import { ObservableObject, observe } from "@legendapp/state";
import React, { FC, useEffect, useRef, useState } from "react";
import { highlightText } from "./helper";
import { Virtuoso } from "react-virtuoso";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const Row = observer((props: { item: ResultItem }) => {
  const [text, setText] = useState(<>{props.item.text}</>);
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
      console.log("run~~~~~", search, isLoading);

      window.requestIdleCallback(() => {
        timeout = setTimeout(() => {
          setText(highlightText(props.item.text, search));
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

  const handlerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      // store.actions.closeDialog();
      store.actions.confirm.openInSidebar([props.item]);
    } else if (e.altKey) {
      store.actions.confirm.saveAsReference([props.item]);
    } else {
      store.actions.confirm.openInMain(props.item);
    }
    store.actions.closeDialog();
  };

  let content;
  if (props.item.isPage) {
    content = text;
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
        {text}
      </>
    );
  }
  return (
    <>
      <Button
        className="result-item-container"
        fill
        onClick={handlerClick}
        minimal
        icon={"paragraph"}
      >
        {content}
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <span className="date date-fromnow">
            {dayjs(props.item.editTime).fromNow()}
          </span>
          <span className="date date-common">
            {dayjs(props.item.editTime).format("HH:mm MMM DD, YYYY")}
          </span>
        </div>
      </Button>
      <Divider />
    </>
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
  return (
    <Virtuoso
      className="infinite-scroll"
      style={store.ui.size.resultList()}
      data={store.ui.result.list().get()}
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
