import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { SearchInline, SearchInlineModel, useSearchInlineModel } from "./core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Classes,
  Drawer,
  Popover,
  Toast,
  Toaster,
} from "@blueprintjs/core";
import { DIALOG_CLOSE_BUTTON } from "@blueprintjs/core/lib/esm/common/classes";
import { store } from "../store";
import { isGraphLoaded } from "../loaded";
import { getAllBlocks, getAllData, getAllPages } from "../roam";
import { delay } from "../delay";
import { Block } from "./core/type";
import { Virtuoso } from "react-virtuoso";

export function renderNode(node: HTMLElement) {
  const block = node.closest("[id^='block-input']");
  const id = node.closest("[id^='block-input']")?.id;
  console.log(node, " - renderNode - ", id);

  if (!id) {
    return;
  }
  const parent = block.closest(".roam-block-container");
  const el = document.createElement("div");
  parent.querySelectorAll(".inline-search-el").forEach((e) => {
    e.remove();
  });
  el.className = `inline-search-el`;
  parent.appendChild(el);
  ReactDOM.render(<App id={id} onUnmount={() => el.remove()} />, el);
}

function App(props: { id: string; onUnmount: () => void }) {
  const [open, setOpen] = useState(false);
  const searchModel = useSearchInlineModel((json: {}) => {
    window.roamAlphaAPI.updateBlock({
      block: {
        uid: props.id.substr(-9),
        // @ts-ignore
        props: {
          "inline-search": json,
        },
      },
    });
    setTimeout(() => {
      const blockProps = window.roamAlphaAPI.pull(`[:block/props]`, [
        ":block/uid",
        props.id.substr(-9),
      ]);
      console.log(blockProps, " ==== ");
    }, 200);
  });

  useEffect(() => {
    async function load() {
      await delay(10);

      if (!store.ui.isLoading() && !isGraphLoaded()) {
        const t = Toaster.create({});
        const toastId = t.show({
          message: "Search+ is loading graph data...",
          timeout: 0,
          intent: "primary",
        });
        await delay(10);
        await store.actions.loadingGraph();
        t.dismiss(toastId);
      }
      const blockProps = window.roamAlphaAPI.pull(`[:block/props]`, [
        ":block/uid",
        props.id.substr(-9),
      ]);
      if (blockProps && blockProps[":block/props"]) {
        // @ts-ignore
        const json = blockProps[":block/props"][":inline-search"];

        json && searchModel.hydrate(JSON.parse(json));
      }
      // console.log(getAllData(), " = all data ");
    }
    load();
    return props.onUnmount;
  }, [props.onUnmount]);
  searchModel.getData = () => {
    return getAllData();
  };
  return (
    <div style={{}}>
      {/* <Popover
        isOpen={open}
        canEscapeKeyClose={false}
        // onClose={() => setOpen(false)}
        content={
          <>
            <div
              className={Classes.DIALOG_HEADER}
              style={{ justifyContent: "flex-end" }}
            >
              <div className={DIALOG_CLOSE_BUTTON}>
                <Button icon="cross" minimal onClick={() => setOpen(false)} />
              </div>
            </div>
            <div className={Classes.DIALOG_BODY}>
              <SearchInline />
            </div>
          </>
        }
        popoverClassName="search-popover"
        backdropProps={{
            onClick() {
                console.log(" CLICK --")
            }
        }}
        autoFocus={false}
        position="bottom"
      > */}
      <Button
        loading={store.ui.isLoading()}
        onPointerDown={(e) => {
          console.log("CLICCKCKCK");
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
      >
        Filter
      </Button>
      {/* </Popover> */}
      {true ? (
        <div
          className="search-inline-div"
          style={{
            display: open ? "none" : "block",
            marginTop: 5,
          }}
        >
          <SearchInline model={searchModel} />
        </div>
      ) : null}
      <div>
        <SearchResult model={searchModel} />
      </div>
    </div>

    // </Popover>
  );
}

const SearchResult = observer(({ model }: { model: SearchInlineModel }) => {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    setIndex(0);
  }, [model.searchResult]);

  if (model.searchResult.length === 0) {
    return <div>No Results</div>;
  }

  return (
    <section className="inline-search-result-container">
      <div></div>
      <div className="inline-search-result">
        <Virtuoso
          className="inline-search-result-nav"
          totalCount={model.searchResult.length}
          data={model.searchResult}
          style={{
            minHeight: 500,
          }}
          itemContent={(_index, data) => {
            return (
              <RenderStr
                active={index === _index}
                data={data}
                onClick={() => setIndex(_index)}
              />
            );
          }}
        ></Virtuoso>
        <div className="inline-search-result-render">
          <RenderView
            key={model.searchResult[index][":block/uid"]}
            data={model.searchResult[index]}
          />
        </div>
      </div>
    </section>
  );
});

function PageIcon() {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      className="inline-block"
      width={24}
      height={24}
    >
      <path
        d="M19.2 1.20001H4.8C3.80589 1.20001 3 2.0059 3 3.00001V21C3 21.9941 3.80589 22.8 4.8 22.8H19.2C20.1941 22.8 21 21.9941 21 21V3.00001C21 2.0059 20.1941 1.20001 19.2 1.20001Z"
        fill="#FCFCFF"
        stroke="#CACAD9"
      ></path>
      <path
        d="M16.3499 4.79999H5.8499C5.60137 4.79999 5.3999 5.00146 5.3999 5.24999C5.3999 5.49852 5.60137 5.69999 5.8499 5.69999H16.3499C16.5984 5.69999 16.7999 5.49852 16.7999 5.24999C16.7999 5.00146 16.5984 4.79999 16.3499 4.79999Z"
        fill="#CACAD9"
      ></path>
      <path
        d="M9.1499 6.90002H5.8499C5.60137 6.90002 5.3999 7.1015 5.3999 7.35002C5.3999 7.59855 5.60137 7.80002 5.8499 7.80002H9.1499C9.39843 7.80002 9.5999 7.59855 9.5999 7.35002C9.5999 7.1015 9.39843 6.90002 9.1499 6.90002Z"
        fill="#CACAD9"
      ></path>
      <path
        d="M13.3499 9H5.8499C5.60137 9 5.3999 9.20147 5.3999 9.45C5.3999 9.69853 5.60137 9.9 5.8499 9.9H13.3499C13.5984 9.9 13.7999 9.69853 13.7999 9.45C13.7999 9.20147 13.5984 9 13.3499 9Z"
        fill="#CACAD9"
      ></path>
      <path
        d="M10.3499 11.1H5.8499C5.60137 11.1 5.3999 11.3015 5.3999 11.55C5.3999 11.7986 5.60137 12 5.8499 12H10.3499C10.5984 12 10.7999 11.7986 10.7999 11.55C10.7999 11.3015 10.5984 11.1 10.3499 11.1Z"
        fill="#CACAD9"
      ></path>
      <path
        d="M15.1499 13.2H5.8499C5.60137 13.2 5.3999 13.4015 5.3999 13.65C5.3999 13.8985 5.60137 14.1 5.8499 14.1H15.1499C15.3984 14.1 15.5999 13.8985 15.5999 13.65C15.5999 13.4015 15.3984 13.2 15.1499 13.2Z"
        fill="#CACAD9"
      ></path>
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 16 16"
      className="inline-block text-gray-30"
      width={20}
      height={20}
    >
      <rect x="3" y="3.75" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="6.25" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="8.75" width="10" height="1" rx="0.5"></rect>
      <rect x="3" y="11.25" width="6" height="1" rx="0.5"></rect>
    </svg>
  );
}

function RenderStr({
  data,
  onClick,
  active,
}: {
  active: boolean;
  data: Block;
  onClick: () => void;
}) {
  return (
    <Button
      minimal
      fill
      alignText="left"
      intent={active ? "primary" : "none"}
      active={active}
      icon={data[":block/parents"] ? <BlockIcon /> : <PageIcon />}
      onClick={() => {
        onClick();
      }}
    >
      {data[":block/string"] || data[":node/title"]}
    </Button>
  );
}

function RenderView({ data }: { data: Block }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let unmounted = false;
    setTimeout(() => {
      if (unmounted) {
        return;
      }
      window.roamAlphaAPI.ui.components.renderBlock({
        uid: data[":block/uid"],
        el: ref.current,
        // @ts-ignore
        "zoom-path?": true,
        open: false,
      });
    }, 200);
    return () => (unmounted = true);
  }, [data[":block/uid"]]);
  return <div ref={ref}></div>;
}
