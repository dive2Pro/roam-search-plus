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
const ReactLoadMore: FC<{}> = (props) => {
  return <div className="infinite-scroll">{props.children}</div>;
};

const Row = observer((props: { item: ResultItem }) => {
  const [text, setText] = useState(<>{props.item.text}</>);
  useEffect(() => {
    return observe(() => {
      const search = store.ui.getSearch();
      setTimeout(() => {
        setText(highlightText(props.item.text, search));
      }, 10);
    });
  }, []);
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
            {props.item.paths.map((s, index, ary) => {
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

const TargetCheckboxAbleRow = observer((props: { item: ResultItem }) => {
  console.log(props.item, " = item");
  return (
    <Checkbox
      checked={store.ui.isSelectedTarget(props.item)}
      // TODO
      // onChange={() => store.actions.changeSelectedTarget(props.item)}
    >
      <Row {...props} />
    </Checkbox>
  );
});

export const QueryResult = observer(() => {
  const isMultipleSelection = store.ui.isMultipleSelection();
  let Item = Row;
  if (isMultipleSelection) {
    Item = CheckboxAbleRow;
  } else {
    Item = Row;
  }

  // useEffect(() => {
  //   const el = document.querySelector(".bp3-dialog");
  //   const handler = (e: Event) => {
  //     console.log(e.code);
  //   };
  //   el?.addEventListener("keydown", handler);
  //   return () => {
  //     el?.removeEventListener("keydown", handler);
  //   };
  // }, []);

  return (
    <div>
      <Virtuoso
        // Footer={() => {
        //   return <span>..</span>;
        // }}
        // onBottom={() => {}}
        // fetching={false}
        // hasMore={true}
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
