import React, { useEffect, useRef, useState } from "react";
import { FuseResultModel, ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import { Button, Callout, Classes } from "@blueprintjs/core";
import { Block } from "../core/type";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { PageIcon } from "../core/PageIcon";
import { BlockIcon } from "../core/BlockIcon";

export const SearchResultSideMenuView = observer(
  ({ model }: { model: ResultFilterModel }) => {
    const [index, setIndex] = useState(-1);
   const [resultModel, setData] = useState<FuseResultModel>();
    const data = resultModel?.result || [];

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
        <div
          className={`inline-search-result ${
            model.model.isLoading ? Classes.SKELETON : ""
          }`}
        >
          <Callout intent="primary">
            No items match your query/filter criteria.
          </Callout>
        </div>
      );
    }

    return (
      <div
        className={`inline-search-result ${
          model.model.isLoading ? Classes.SKELETON : ""
        }`}
      >
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
  }
);
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
      onClick={(e) => {
        if (e.shiftKey) {
          window.roamAlphaAPI.ui.rightSidebar.addWindow({
            window: {
              "block-uid": data[":block/uid"],
              type: "block",
            },
          });
          return;
        }
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
    return () => {
      unmounted = true;
    };
  }, [data[":block/uid"]]);
  return <div ref={ref}></div>;
}
