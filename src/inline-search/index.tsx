import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  InlineRoamBlockInfo,
  ResultFilterModel,
  SearchInline,
  SearchInlineModel,
  layoutChangeEvent,
  useSearchInlineModel,
} from "./core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Callout,
  ControlGroup,
  Divider,
  EditableText,
  Icon,
  InputGroup,
  Toaster,
} from "@blueprintjs/core";
import { store } from "../store";
import { isGraphLoaded } from "../loaded";
import { getAllData } from "../roam";
import { delay } from "../delay";
import { Block } from "./core/type";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { PageOrBlockSelect } from "./core/comps";
import { PageIcon } from "./core/PageIcon";
import { BlockIcon } from "./core/BlockIcon";
import { FuseResult } from "fuse.js";
import { allBlockRefsItems, allPageRefsItems } from "./core/allItems";
import { makeAutoObservable } from "mobx";

export function unmountNode(node: HTMLElement) {
  const parent = node.closest(".roam-block-container");
  parent.querySelectorAll(".inline-search-el").forEach((e) => {
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
        allBlockRefsItems.update();
        allPageRefsItems.update();
        t.dismiss(toastId);
      }

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
    <div style={{}}>
      <div className="flex">
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
      </div>
      {/* </Popover> */}
      {true ? (
        <div
          className="search-inline-div"
          style={{
            display: !open ? "none" : "block",
            marginTop: 5,
          }}
        >
          <SearchInline model={searchModel} />
        </div>
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

const SearchResult = observer(({ model }: { model: SearchInlineModel }) => {
  if (model.searchResult.length === 0) {
    return <Callout intent="warning" title="No Results"></Callout>;
  }

  return (
    <section className="inline-search-result-container">
      <SearchResultFilter model={model.filter} />
      <SearchResultList model={model.filter} />
    </section>
  );
});

const SearchResultList = observer(({ model }: { model: ResultFilterModel }) => {
  const [index, setIndex] = useState(-1);
  const [data, setData] = useState<FuseResult<Block>[]>([]);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useEffect(() => {
    return model.registerListeners((data) => {
      setData(data);
    });
  }, []);

  useEffect(() => {
    setIndex(0);
    virtuosoRef.current?.scrollToIndex?.(0);
  }, [data]);

  if (data.length === 0) {
    return (
      <Callout intent="primary">
        No items match your query/filter criteria.
      </Callout>
    );
  }

  return (
    <div className="inline-search-result">
      <Virtuoso
        className="inline-search-result-nav"
        totalCount={data.length}
        data={data}
        style={{
          minHeight: 500,
        }}
        itemContent={(_index, data) => {
          return (
            <RenderStr
              active={index === _index}
              data={data.item}
              onClick={() => setIndex(_index)}
            />
          );
        }}
      ></Virtuoso>
      <div className="inline-search-result-render">
        {data[index] ? (
          <RenderView
            key={data[index].item[":block/uid"]}
            data={data[index].item}
          />
        ) : null}
      </div>
    </div>
  );
});

const SearchResultFilter = observer((props: { model: ResultFilterModel }) => {
  return (
    <ControlGroup
      style={{
        padding: 5,
      }}
    >
      <ResultKeywordsFilter model={props.model} />
      <Divider />
      <PageOrBlockSelect
        value={props.model.type as "all"}
        onSelect={(type) => {
          props.model.changeType(type);
        }}
      />
      {props.model.hasFilter ? (
        <>
          <Divider />

          <Button
            onClick={() => props.model.reset()}
            intent="warning"
            outlined
            small
            icon="small-cross"
            text="clear filters"
          />
        </>
      ) : null}
    </ControlGroup>
  );
});

const ResultKeywordsFilter = observer((props: { model: ResultFilterModel }) => {
  return (
    <InputGroup
      leftIcon="filter"
      value={props.model.query}
      small
      placeholder="Filter by content"
      onChange={(e) => {
        props.model.changeQuery(e.target.value);
      }}
      // rightElement={<Button minimal icon="arrow-right" onClick={() => {}} />}
    />
  );
});

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
      style={{
        alignItems: "flex-start",
      }}
    >
      <div className="clamp-3">
        {data[":block/string"] || data[":node/title"] || " "}
      </div>
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
