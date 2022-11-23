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
} from "@blueprintjs/core";
import { For, enableLegendStateReact, observer } from "@legendapp/state/react";
import { store, ResultItem } from "./store";
import { ObservableObject, observe } from "@legendapp/state";
import { FC, useEffect, useRef, useState } from "react";
import { highlightText } from "./helper";
import { Virtuoso } from "react-virtuoso";

const Row = observer((props: { item: ResultItem }) => {
  const [text, setText] = useState(<>{props.item.text}</>);
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    let timeout: any;
    if (!props.item.isPage) {
    }
    const dispose = observe(() => {
      const isLoading = store.ui.isLoading();
      if (!isLoading) {
        console.log('going~~~~~')
        window.requestIdleCallback(() => {
          setPaths(store.ui.getPaths(props.item.id));
        });
      }
    });
    const dispose1 = observe(() => {
      const search = store.ui.getSearch();
      const isLoading = store.ui.isLoading();
      clearTimeout(timeout);
      if (!search || isLoading) {
        return;
      }
      // console.log("run~~~~~", search, isLoading, props.item.id);

      window.requestIdleCallback(() => {
        timeout = setTimeout(() => {
          setText(highlightText(props.item.text, search));
        }, 50);
      });
    });
    return () => {
      dispose();
      dispose1();
    };
  }, [props.item.id]);
  let content;
  if (props.item.isPage) {
    content = (
      <>
        <Button className="result-item-container" minimal icon={"application"}>
          {text}
        </Button>
        <Divider />
      </>
    );
  } else {
    content = (
      <>
        <Button className="result-item-container" minimal icon={"paragraph"}>
          <div className="flex-row result-breadcrumbs">
            {paths.map((s, index, ary) => {
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
        </Button>
        <Divider />
      </>
    );
  }
  return content;
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
    <div>
      <Virtuoso
        className="infinite-scroll"
        data={store.ui.result.list().get()}
        itemContent={(index, data) => <Item key={data.id} item={data} />}
      ></Virtuoso>
    </div>
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
