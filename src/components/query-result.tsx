import {
  Icon,
  Checkbox,
  Classes,
  Card,
  Button,
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
import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { date, highlightText } from "../helper";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { isAutoCloseWhenShiftClick } from "../config";
import { isPageByUid } from "../roam";
import { useEvent } from "../utils/useEvent";
dayjs.extend(relativeTime);

const handleClick = (item: ResultItem) => {
  if (item.needCreate) {
    store.actions.createPage(item.text as string);
    store.actions.closeDialog();
    return;
  }
  let opened = store.actions.confirm.openInMain(item);
  if (opened) store.actions.closeDialog();

  opened && store.actions.history.saveSearch(store.ui.getSearch());
  !opened &&
    Toaster.create({}).show({
      message: `${item.isPage ? "Page" : "Block"} was deleted`,
      intent: "warning",
    });
};

const handleShiftClick = (item: ResultItem) => {
  if (item.needCreate) {
    store.actions.createPage(item.text as string, true);
    store.actions.closeDialog();
    return;
  }
  const opened = store.actions.confirm.openInSidebar(item);
  if (opened) {
    if (isAutoCloseWhenShiftClick() && !store.ui.mode.isMaximize()) {
      store.actions.closeDialog();
    }
  }
  opened && store.actions.history.saveSearch(store.ui.getSearch());
  !opened &&
    Toaster.create({}).show({
      message: `${item.isPage ? "Page" : "Block"} was deleted`,
      intent: "warning",
    });
};

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
    if (e.shiftKey) {
      handleShiftClick(item);
      return;
    }
    handleClick(item);
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
  const ref = useRef<VirtuosoHandle>(null);
  const [index, setIndex] = useState(0);
  const getList = () => {
    const list = store.ui.result.list();
    return list;
  };
  const list = getList();

  let Item = Row;
  if (isMultipleSelection) {
    Item = CheckboxAbleRow;
  } else {
    Item = Row;
  }
  const handleResultScroll = useEvent((e: CustomEvent) => {
    let nextIndex = 0;
    if (e.detail.direction === "up") {
      nextIndex = Math.max(0, index - 1);
      ref.current?.scrollIntoView({
        index: nextIndex,
        align: "start",
      });
    } else if (e.detail.direction === "down") {
      nextIndex = Math.min(index + 1, list.length - 1);
      ref.current?.scrollIntoView({
        index: nextIndex,
        align: "end",
      });
    } else if (e.detail.direction === "up-top") {
      nextIndex = 0;
      ref.current?.scrollIntoView({
        index: nextIndex,
        align: "start",
      });
    } else if (e.detail.direction === "result-enter") {
      handleClick(list[index]);
    } else if (e.detail.direction === "result-enter-shift") {
      handleShiftClick(list[index]);
    }

    setIndex(nextIndex);
  });
  // 注册监听
  useEffect(() => {
    document.addEventListener("result-scroll", handleResultScroll);

    return () => {
      document.removeEventListener("result-scroll", handleResultScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const el = [...document.querySelectorAll("[data-test-id]")].find(
      (el) => el.getAttribute("data-test-id") === "virtuoso-item-list"
    ) as HTMLElement;
    setTimeout(() => {
      const vHeight = el.getBoundingClientRect().height;
      store.actions.setHeight(vHeight);
    });
  }, []);

  return (
    <div
      className={`relative ${store.ui.isLoading() ? "bp3-skeleton" : ""}
    `}
    >
      {index >= 5 ? <BackToTop /> : null}
      <Suspense fallback={null}>
        <Virtuoso
          className="infinite-scroll"
          style={store.ui.result.getListStyle()}
          totalCount={list.length}
          data={list}
          ref={ref}
          context={{ currentItemIndex: index }}
          itemContent={(_index, data) => {
            if (data.needCreate) {
              return (
                <div
                  className={`${
                    _index === index ? "result-item-container-active" : ""
                  } `}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.shiftKey) {
                      handleShiftClick(data);
                      return;
                    }
                    handleClick(data);
                  }}
                >
                  <PageCreator data={data} />
                </div>
              );
            }
            data = findLowestParentFromResult(data);
            return (
              <div
                className={`${
                  _index === index ? "result-item-container-active" : ""
                } 
              
              `}
                // className={"result-item-container-active"}
                onMouseEnter={() => {
                  setIndex(_index);
                }}
              >
                <Item
                  key={data.text.toString() + "-" + data.editTime}
                  item={data}
                />
              </div>
            );
          }}
        ></Virtuoso>
      </Suspense>
    </div>
  );
});

const PageCreator = observer((props: { data: ResultItem }) => {
  return (
    <section className="result-item-container">
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
    <div className="selected-result p-4">
      <For each={store.ui.selectedTarget()} item={TargetCheckboxAbleRow} />
    </div>
  );
});

const BackToTop = observer(() => {
  return (
    <Button
      className="back-to-top absolute"
      style={{
        right: 20,
        bottom: 20,
        zIndex: 10,
        borderRadius: "50%",
      }}
      large
      icon="arrow-up"
      onClick={() => {
        // store.actions.backToTop();
        document.dispatchEvent(
          new CustomEvent("result-scroll", {
            detail: {
              direction: "up-top",
            },
          })
        );
      }}
    ></Button>
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
