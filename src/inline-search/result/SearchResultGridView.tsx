import React, {
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { ResultFilterModel } from "../core/ResultFilterModel";
import { observer } from "mobx-react-lite";
import { Callout } from "@blueprintjs/core";
import { Block } from "../core/type";
import {
  GridItemProps,
  VirtuosoGrid,
  VirtuosoHandle,
} from "react-virtuoso";
import { PageIcon } from "../core/PageIcon";
import { BlockIcon } from "../core/BlockIcon";
import { FuseResult } from "fuse.js";

export const SearchResultGridView = observer(
  ({ model }: { model: ResultFilterModel }) => {
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
    console.log(data, " ==== data ==== ", data.length);
    const [visibleRange, setVisibleRange] = useState(["-", "-"]);

    if (data.length === 0) {
      return (
        <Callout intent="primary">
          No items match your query/filter criteria.
        </Callout>
      );
    }
    return (
      <div className={`inline-search-result `}>
        <VirtuosoGrid
          className="inline-search-grid-container"
          totalCount={data.length}
          data={data}
          style={{ height: 550, width: 500 }}
          overscan={200}
          itemClassName="inline-search-grid-item"
          listClassName="inline-search-grid-list"
          // components={{
          //   Item: ItemContainer,
          //   List: ListContainer,
          //   // ScrollSeekPlaceholder: ({ height, width, index }) => {
          //   //   return <div style={{ height, width }}>--</div>;
          //   // },
          // }}
          itemContent={(index, data) => {
            if (data.item[":block/page"]) {
              return (
                <ItemWrapper data-index={index}>
                  <BlockIcon></BlockIcon>
                  {data.item[":block/string"]}
                </ItemWrapper>
              );
            }
            return (
              <ItemWrapper data-index={index}>
                <PageIcon></PageIcon>
                {data.item[":node/title"]}
              </ItemWrapper>
            );
          }}
          // scrollSeekConfiguration={{
          //   enter: (velocity) => Math.abs(velocity) > 200,
          //   exit: (velocity) => {
          //     const shouldExit = Math.abs(velocity) < 10;
          //     if (shouldExit) {
          //       setVisibleRange(["-", "-"]);
          //     }
          //     return shouldExit;
          //   },
          //   change: (_velocity, { startIndex, endIndex }) =>
          //     setVisibleRange([startIndex + '', endIndex + '']),
          // }}
        />
      </div>
    );
  }
);

const ListContainer = React.forwardRef<HTMLDivElement, PropsWithChildren<{}>>(
  ({ children }, ref) => {
    console.log(children, " --- ");
    return (
      <div ref={ref} className="inline-search-grid-list">
        {children}
      </div>
    );
  }
);

function ItemContainer(props: PropsWithChildren<GridItemProps>) {
  return <div className="inline-search-grid-item" {...props}></div>;
}

function ItemWrapper(props: PropsWithChildren<GridItemProps>) {
  return (
    <div className="inline-search-grid-item-wrapper">{props.children}</div>
  );
}
