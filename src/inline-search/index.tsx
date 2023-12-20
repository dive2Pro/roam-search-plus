import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { SearchInline } from "./core";
import { ResultFilterModel } from "./core/ResultFilterModel";
import { SearchInlineFilterModel } from "./core/SearchInlineFilterModel";
import { observer } from "mobx-react-lite";
import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  Dialog,
  Divider,
  EditableText,
  InputGroup,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  Tab,
  Tabs,
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
import { makeAutoObservable } from "mobx";
import { PullBlock } from "roamjs-components/types";
import { ITabModel, TabInfo } from "./core/type";

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

const MoreIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b7280"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    </svg>
  );
};
const App = observer((props: { id: string; onUnmount: () => void }) => {
  const searchModel = useState(() => {
    return new SearchInlineModel(props.id.substr(-9));
  })[0];
  const [open, setOpen] = useState(true);

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

      searchModel.init();
      // console.log(getAllData(), " = all data ");
    }
    load();
    return props.onUnmount;
  }, [props.onUnmount]);
  console.log(searchModel.activeTab, " ---- ");
  return (
    <div>
      <div
        className="flex"
        style={{
          alignItems: "center",
        }}
      >
        <div
          className="flex-1 flex"
          style={{
            alignItems: "center",
          }}
        >
          <ButtonGroup>
            {searchModel.tabs.map((tab) => {
              const activing = tab === searchModel.activeTab;
              return (
                <Button
                  intent={activing ? "primary" : "none"}
                  id={tab.data.id}
                  text={tab.data.label}
                  rightIcon={
                    activing ? (
                      <Popover
                        content={
                          <div
                            style={{
                              padding: 5,
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <div style={{ marginBottom: 5 }}>
                              <InputGroup
                                value={tab.data.label}
                                onChange={(v) =>
                                  tab.changeLabel(v.target.value)
                                }
                                onBlur={() => {
                                  tab.saveLabel();
                                }}
                              />
                            </div>

                            <Button
                              minimal
                              alignText="left"
                              small
                              text="Delete View"
                              icon="delete"
                            />
                          </div>
                        }
                      >
                        <Button minimal small icon={<MoreIcon />} />
                      </Popover>
                    ) : null
                  }
                  minimal
                />
              );
            })}
          </ButtonGroup>
          <Popover
            content={
              <Menu>
                <MenuItem
                  text="Side menu view"
                  onClick={() => {
                    searchModel.addTab({
                      id: "side-menu-" + Date.now(),
                      query: "",
                      type: "all",
                      json: "",
                      label: "Side menu view",
                      viewType: "side-menu",
                    });
                  }}
                />
              </Menu>
            }
          >
            <Button icon="plus" minimal small></Button>
          </Popover>
          <Divider />
        </div>
        <Button
          minimal
          onClick={() => {
            store.actions.renewGraph().then(() => {
              searchModel.activeTab?.search();
              allBlockRefsItems.update();
              allPageRefsItems.update();
            });
          }}
          small
          icon="refresh"
        ></Button>
        <Button
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
        <SearchSettings model={searchModel} onDelete={props.onUnmount} />
      </div>
      {searchModel.activeTab ? (
        <SearchInlineTabView open={open} model={searchModel.activeTab} />
      ) : null}
    </div>
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

const SearchResult = observer(({ model }: { model: ITabModel }) => {
  const resultFilterModel = useMemo(
    () => new ResultFilterModel(model),
    [model]
  );

  if (model.searchResult.length === 0) {
    return <Callout intent="warning" title="No Results"></Callout>;
  }

  return (
    <section className={`inline-search-result-container`}>
      <SearchResultFilter model={resultFilterModel} />
      <SearchResultSideMenuView model={resultFilterModel} />
      <Button
        loading
        minimal
        style={{
          pointerEvents: "none",
          opacity: 0,
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

type ViewType = typeof SearchResultSideMenuView;

class SideMenuTab implements ITabModel {
  data: TabInfo = {
    id: Date.now() + "-SideMenu",
    query: "",
    type: "",
    json: "",
    label: "Side menu",
    viewType: "side-menu",
  };

  id = Date.now() + "-SideMenu";

  viewType = SearchResultSideMenuView;

  constructor(
    public model: SearchInlineModel,
    public searchFilterModel: SearchInlineFilterModel
  ) {
    makeAutoObservable(this, {
      model: false,
    });
    // this.resultFilterModel = new ResultFilterModel(this);
  }
  get searchResult() {
    return this.searchFilterModel.searchResult;
  }
  hydrate(tabInfo: TabInfo) {
    this.data = tabInfo;
  }

  get label() {
    return this.data.label;
  }

  get query() {
    return this.data.query;
  }
  get type() {
    return this.data.type;
  }

  saveLabel = () => {
    //
    this.model.saveTab(this.data);
  };
  changeLabel = (label: string) => {
    this.data.label = label;
  };
  saveFilterJson(json: {}): void {
    this.data.json = JSON.stringify(json);
    this.model.saveTab(this.data);
  }
  saveResultFilterQuery(query: string): void {
    this.data.query = query;
    this.model.saveTab(this.data);
  }
  saveResultFilterType(type: string): void {
    this.data.type = type;
    this.model.saveTab(this.data);
  }

  search() {
    this.searchFilterModel.search();
  }
}

export class InlineRoamBlockInfo {
  title = "Inline search of ";

  constructor(private model: SearchInlineModel) {
    makeAutoObservable(this);
  }

  hydrateByData(blockProps: { ":block/props"?: Record<string, any> }) {}

  hydrate() {
    const blockProps = window.roamAlphaAPI.pull(`[:block/props]`, [
      ":block/uid",
      this.model.id,
    ]);
    if (!blockProps || !blockProps[":block/props"]) {
      // this.hydrateByData(blockProps);
      return;
    }
    // @ts-ignore
    const inlineSearchObj = blockProps[":block/props"][":inline-search"] || {};
    Object.keys(inlineSearchObj).map((k) => {
      const tabObj = inlineSearchObj[k] as TabInfo;
      const obj = Object.keys(tabObj).reduce((p, c) => {
        p[c.substring(1)] = tabObj[c as keyof typeof tabObj];
        return p;
      }, {} as Record<string, unknown>);
      return this.model.addTab(obj as TabInfo);
    });
  }
  getBlockProps() {
    return (
      window.roamAlphaAPI.pull(`[:block/props]`, [
        ":block/uid",
        this.model.id,
      ]) || {}
    );
  }

  private getInfo() {
    const blockProps = this.getBlockProps()[":block/props"] || {};
    return Object.keys(blockProps).reduce((p, c) => {
      p[c.substring(1)] = blockProps[c as keyof typeof blockProps];
      return p;
    }, {} as Record<string, unknown>);
  }

  getInlineSearchInfo() {
    const blockProps = window.roamAlphaAPI.pull(`[:block/props]`, [
      ":block/uid",
      this.model.id,
    ]);
    if (!blockProps || !blockProps[":block/props"]) {
      // this.hydrateByData(blockProps);
      return;
    }
    // @ts-ignore
    return blockProps[":block/props"][":inline-search"];
  }

  saveTab(data: TabInfo) {
    const blockInfo = this.getInfo();
    blockInfo["inline-search"] = blockInfo[":inline-search"] || {};
    // @ts-ignore
    blockInfo["inline-search"][data.id] = data;
    window.roamAlphaAPI.updateBlock({
      block: {
        uid: this.model.id,
        // @ts-ignore
        props: {
          ...blockInfo,
        },
      },
    });
  }
}

class SearchInlineModel {
  constructor(public id: string) {
    makeAutoObservable(this);
  }
  tabs: ITabModel[] = [];
  activeTab: ITabModel = null;

  blockInfo = new InlineRoamBlockInfo(this);

  init() {
    this.blockInfo.hydrate();
  }

  addTab(tabObj: TabInfo) {
    let tab: ITabModel;
    switch (tabObj.viewType) {
      case "side-menu": {
        tab = new SideMenuTab(this, new SearchInlineFilterModel(() => tab));
        tab.hydrate(tabObj);
        break;
      }
    }

    this.makeActiveTab(tab);
    this.tabs.push(tab);
    return tab;
  }

  makeActiveTab(tab: ITabModel) {
    this.activeTab = tab;
    tab.search();
  }

  saveTab(data: TabInfo) {
    this.blockInfo.saveTab(data);
  }
}

function SearchInlineTabView({
  model,
  open,
}: {
  open: boolean;
  model: ITabModel;
}) {
  return (
    <div className="inline-search-container">
      {open ? (
        <div
          className="inline-search-div"
          style={{
            display: !open ? "none" : "block",
            marginTop: 5,
          }}
        >
          <SearchInline model={model.searchFilterModel} />
        </div>
      ) : null}
      <div
        style={{
          padding: 5,
        }}
      >
        <SearchResult model={model} />
      </div>
    </div>
  );
}
