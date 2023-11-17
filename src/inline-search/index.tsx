import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { SearchInline, SearchInlineModel, useSearchInlineModel } from "./core";
import { observer } from "mobx-react-lite";
import { Button, Classes, Popover, Toast, Toaster } from "@blueprintjs/core";
import { DIALOG_CLOSE_BUTTON } from "@blueprintjs/core/lib/esm/common/classes";
import { store } from "../store";
import { isGraphLoaded } from "../loaded";
import { getAllBlocks, getAllData, getAllPages } from "../roam";
import { delay } from "../delay";

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
      await delay(10);

      if (!store.ui.isLoading() && !isGraphLoaded()) {
        const t = Toaster.create({});
        const id = t.show({
          message: "Search+ is loading graph data...",
          timeout: 0,
          intent: "primary",
        });
        await delay(10);
        await store.actions.loadingGraph();
        t.dismiss(id);
      }
      // console.log(getAllData(), " = all data ");
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
      <div>
        <SearchResult model={searchModel} />
      </div>
    </div>

    // </Popover>
  );
}

const SearchResult = observer(({ model }: { model: SearchInlineModel }) => {
  return <div>{model.searchResult.length}</div>;
});
