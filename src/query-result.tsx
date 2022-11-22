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
  Checkbox
} from "@blueprintjs/core";
import { QueryList } from "@blueprintjs/select";
import { For, enableLegendStateReact, observer } from "@legendapp/state/react";
import { store, ResultItem } from "./store";
import ReactLoadMore from "react-more-load";
import { ObservableObject } from "@legendapp/state";
import { useEffect, useRef } from "react";

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function highlightText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }
  const regexp = new RegExp(words.join("|"), "gi");
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(
      <strong className="result-highlight" key={lastIndex}>
        {match[0]}
      </strong>
    );
  }

  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}

const Row = observer((props: { item: ObservableObject<ResultItem> }) => {
  const text = highlightText(props.item.text.get(), store.ui.getSearch());
  let content;
  if (props.item.isPage.get()) {
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

const CheckboxAbleRow = observer(
  (props: { item: ObservableObject<ResultItem> }) => {
    return (
      <Checkbox
        checked={store.ui.isSelectedTarget(props.item)}
        onChange={() => store.actions.changeSelectedTarget(props.item)}
      >
        <Row {...props} />
      </Checkbox>
    );
  }
);

const TargetCheckboxAbleRow = observer(
  (props: { item: ObservableObject<ResultItem> }) => {
    console.log(props.item, " = item");
    return (
      <Checkbox
        checked={store.ui.isSelectedTarget(props.item)}
        onChange={() => store.actions.changeSelectedTarget(props.item)}
      >
        <Row {...props} />
      </Checkbox>
    );
  }
);

export const QueryResult = observer(() => {
  const isMultipleSelection = store.ui.isMultipleSelection();
  let item;
  if (isMultipleSelection) {
    item = CheckboxAbleRow;
  } else {
    item = Row;
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
      <ReactLoadMore
        Footer={() => {
          return <span>..</span>;
        }}
        onBottom={() => {}}
        fetching={false}
        hasMore={true}
      >
        <For
          each={store.ui.result.list()}
          item={item}
          itemProps={{
            isMultipleSelection
          }}
        />
      </ReactLoadMore>
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
