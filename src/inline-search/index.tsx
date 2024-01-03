import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  InlineRoamBlockInfo,
  SearchInline,
  SearchInlineModel,
  useSearchInlineModel,
} from "./core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Callout,
  Classes,
  Dialog,
  EditableText,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  TextArea,
  Toaster,
} from "@blueprintjs/core";
import { store } from "../store";
import { isGraphLoaded } from "../loaded";
import { getAllData } from "../roam";
import { delay } from "../delay";
import { allBlockRefsItems, allPageRefsItems } from "./core/allItems";
import { SearchResultSideMenuView } from "./result/SearchResultSideMenuView";
import { SearchResultFilter } from "./result/SearchResultFilter";
import { SearchResultGridView } from "./result/SearchResultGrid.View";

export function unmountNode(node: HTMLElement) {
  const parent = node.closest(".roam-block-container");
  if (!parent) {
    return;
  }
  parent.querySelectorAll(":scope > .inline-search-el").forEach((e) => {
    e.remove();
  });
}
export function renderNode(node: HTMLElement) {
  const block = node.closest("[id^='block-input']");
  const id = node.closest("[id^='block-input']")?.id;
  if (!block) {
    return;
  }
  console.log(block, " - renderNode - ", id);
  const parent = block.closest(".roam-block-container");
  if (!parent) {
    return;
  }

  parent.querySelectorAll(".inline-search-el").forEach((e) => {
    e.remove();
  });
  if (!document.querySelector(`#${block.id}`) || !id) {
    return;
  }
  const el = document.createElement("div");
  el.className = `inline-search-el`;
  parent.appendChild(el);

  const isUnder = !!node.closest(".inline-search-result");
  ReactDOM.render(
    <PreventAutoRenderFromSearchResult
      id={id}
      shouldRender={!isUnder}
      onUnmount={() => el.remove()}
    />,
    el
  );
}

function PreventAutoRenderFromSearchResult(props: {
  id: string;
  onUnmount: () => void;
  shouldRender: boolean;
}) {
  const [shouldRender, setShouldRender] = useState(() => {
    return props.shouldRender;
  });

  if (!shouldRender) {
    return (
      <div>
        <Callout intent="danger" title="Pause the inline search">
          <Button icon="unlock" onClick={() => setShouldRender(true)}>
            Click to continue
          </Button>
        </Callout>
      </div>
    );
  }

  return <App {...props} />;
}
const App = observer((props: { id: string; onUnmount: () => void }) => {
  const [open, setOpen] = useState(true);
  let searchModel: SearchInlineModel;
  const inlineRoamBlock = useState(() => {
    return new InlineRoamBlockInfo(props.id.substr(-9), () => searchModel);
  })[0];

  searchModel = useSearchInlineModel(inlineRoamBlock);

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

      allBlockRefsItems.update();
      allPageRefsItems.update();

      inlineRoamBlock.hydrate();
      // console.log(getAllData(), " = all data ");
    }
    load();
    return props.onUnmount;
  }, [props.onUnmount]);
  searchModel.getData = () => {
    return getAllData();
  };
  return (
    <div className="inline-search-container">
      <div className="flex inline-search-head">
        <div className="flex" style={{ marginRight: 20 }}>
          <EditableText
            value={inlineRoamBlock.title}
            onChange={(v) => inlineRoamBlock.changeTitle(v)}
            onConfirm={(v) => {
              inlineRoamBlock.saveTitle(v);
            }}
          />
        </div>

        <Button
          loading={store.ui.isLoading()}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(!open);
          }}
          small
          intent={open ? "primary" : "none"}
          minimal
        >
          Filter
        </Button>

        <Button
          minimal
          loading={store.ui.isLoading()}
          onClick={() => {
            store.actions.renewGraph().then(() => {
              searchModel.search();
              allBlockRefsItems.update();
              allPageRefsItems.update();
              // layoutChangeEvent.dispatch()
            });
          }}
          small
          icon="refresh"
        ></Button>
        <SearchSettings model={searchModel} onDelete={props.onUnmount} />
      </div>
      {/* </Popover> */}
      {open ? (
        <ScrollBaseOnMargin>
          <div
            className="inline-search-div"
            style={{
              display: !open ? "none" : "block",
              marginTop: 5,
            }}
          >
            <SearchInline model={searchModel} />
          </div>
        </ScrollBaseOnMargin>
      ) : null}
      <div
        style={{
          padding: 5,
        }}
      >
        <SearchResult model={searchModel} />
      </div>
    </div>

    // </Popover>
  );
});

const SearchSettings = observer(
  (props: { model: SearchInlineModel; onDelete: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState("");
    return (
      <>
        <Popover
          autoFocus={false}
          content={
            <Menu>
              <MenuItem
                onClick={() => {
                  const str = JSON.stringify(
                    props.model.blockInfo.getBlockProps()
                  );
                  navigator.clipboard.writeText(str);
                }}
                text="Copy settings"
                icon="clipboard"
              />
              <MenuItem
                onClick={() => {
                  setIsOpen(true);
                }}
                text="Import settings"
                icon="import"
              />
              <MenuDivider />
              <MenuItem
                text="Edit block"
                icon="edit"
                onClick={() => {
                  props.onDelete();
                }}
              />
            </Menu>
          }
        >
          <Button icon="more" minimal small />
        </Popover>
        <Dialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          canEscapeKeyClose
          title="Importting settings"
        >
          <div className={Classes.DIALOG_BODY}>
            <TextArea
              fill
              onInput={(event) => {
                setValue((event.target as HTMLTextAreaElement).value);
              }}
              autoFocus
            />
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  props.model.blockInfo.hydrateByData(JSON.parse(value));
                  setIsOpen(false);
                }}
                intent="primary"
              >
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }
);

const SearchResult = observer(({ model }: { model: SearchInlineModel }) => {
  if (model.searchResult.length === 0) {
    return <Callout intent="warning" title="No Results"></Callout>;
  }

  return (
    <section className={`inline-search-result-container`}>
      <SearchResultFilter model={model.filter} />
      {model.filter.viewType === "grid" ? (
        <SearchResultGridView model={model.filter} />
      ) : (
        <SearchResultSideMenuView model={model.filter} />
      )}
      <Button
        loading
        minimal
        style={{
          pointerEvents: "none",
          opacity: model.isLoading ? 1 : 0,
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </section>
  );
});

function ScrollBaseOnMargin(props: PropsWithChildren<{}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ left: 0, right: 0 });
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const left = ref.current.clientLeft;
    console.log(rect, left, " === ");
    // TODO: 和 roam-article 或者 sidebar-window 找到最近的那一个。
    // 将其的宽度，和获取到的数据进行比较，得到要 margin 的宽度
  }, []);
  return (
    <div
      style={{
        overflow: "auto hidden",
      }}
      ref={ref}
      {...props}
    ></div>
  );
}
