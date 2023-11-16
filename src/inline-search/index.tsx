import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { SearchInline, useSearchInlineModel } from "./core";
import { Button, Classes, Popover } from "@blueprintjs/core";
import { DIALOG_CLOSE_BUTTON } from "@blueprintjs/core/lib/esm/common/classes";
import { store } from "../store";
import { isGraphLoaded } from "../loaded";
import { getAllBlocks, getAllData, getAllPages } from "../roam";

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
  useEffect(() => {
    async function load() {
      if (!store.ui.isLoading() && !isGraphLoaded()) {
        await store.actions.loadingGraph();
      }
      console.log(getAllData(), " = all data ");
    }
    load();
    return props.onUnmount;
  }, [props.onUnmount]);
  const searchModel = useSearchInlineModel();
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
        Filter2
      </Button>
      {/* </Popover> */}
      {open ? (
        <div className="search-inline-div" style={{ marginTop: 5 }}>
          <SearchInline model={searchModel} />
        </div>
      ) : null}
      <div></div>
    </div>

    // </Popover>
  );
}
