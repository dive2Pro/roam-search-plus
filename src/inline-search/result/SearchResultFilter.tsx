import React, { useEffect, useRef, useState } from "react";
import { FuseResultModel, ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Classes,
  ControlGroup,
  Divider,
  InputGroup,
  Menu,
  MenuItem,
  Popover,
  Switch,
  Tooltip,
} from "@blueprintjs/core";
import { PageOrBlockSelect, ViewSelect } from "../core/comps";

export const SearchResultFilter = observer(
  (props: { model: ResultFilterModel }) => {
    const [resultModel, setData] = useState<FuseResultModel>();
    const data = resultModel?.result || [];
    useEffect(() => {
      return props.model.registerListeners((data) => {
        setData(data);
      });
    }, []);

    return (
      <ControlGroup
        className={` ${props.model.model.isLoading ? Classes.SKELETON : ""}`}
      >
        <ResultKeywordsFilter model={props.model} />
        <Divider />
        <PageOrBlockSelect
          value={props.model.type as "all"}
          onSelect={(type) => {
            props.model.changeType(type);
          }}
        />
        <Popover content={<ResultReferencesFilter model={props.model} />}>
          <Button
            icon="filter"
            small
            intent={props.model.refTargetInfo.hasSelected ? "danger" : "none"}
          />
        </Popover>
        <ResultSorts model={props.model} />
        {props.model.hasFilter ? (
          <>
            <Divider />

            <Button
              onClick={() => props.model.reset()}
              intent="warning"
              outlined
              small
              icon="small-cross"
              text="clear"
            />
          </>
        ) : null}

        <Divider />
        <ViewSelect
          value={props.model.viewType}
          onSelect={(type) => {
            props.model.changeViewType(type);
          }}
        />

        <Tooltip content={"shuffle notes"}>
          <Button
            icon="random"
            small
            onClick={() => {
              props.model.shuffle();
            }}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <small>
          {data.length}/{props.model.totalCount}
        </small>
      </ControlGroup>
    );
  }
);
const ResultKeywordsFilter = observer((props: { model: ResultFilterModel }) => {
  return (
    <InputGroup
      value={props.model.query}
      small
      rightElement={
        props.model.query ? (
          <Button
            icon="small-cross"
            minimal
            small
            onClick={() => {
              props.model.changeQuery("");
            }}
          />
        ) : null
      }
      placeholder="fuzzy search..."
      onChange={(e) => {
        props.model.changeQuery(e.target.value);
      }}
    />
  );
});

const ResultReferencesFilter = observer(
  (props: { model: ResultFilterModel }) => {
    const [isIncludeBlock, setIsIncludeBlock] = useState(false);
    return (
      <div className={"rm-choose-filter inline-search-choose-filter"}>
        <div className="">
          <div className="rm-choose-filter__includes">
            <div>
              <strong>Includes</strong>
              <span className="rm-choose-filter__add-filter-text">
                Click to Add
              </span>
              <div className="rm-choose-filter__helper-text">
                {props.model.refTargetInfo.contains.length === 0
                  ? `Only include block paths with these links in them`
                  : ""}
              </div>
            </div>
            <div
              style={{
                gap: 8,
                display: "flex",
                flexWrap: "wrap",
                paddingTop: 8,
              }}
            >
              {props.model.refTargetInfo.contains.map((item) => {
                return (
                  <Button className="rm-filter-button" onClick={item.onClick}>
                    {item.text}
                    <sub className="rm-sub-text">{item.count}</sub>
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="rm-line" style={{ margin: "8px 0px" }} />
          <div className="rm-choose-filter__removes">
            <div>
              <strong>Removes</strong>
              <span className="rm-choose-filter__add-filter-text">
                Shift-Click to Add
              </span>
              <div className="rm-choose-filter__helper-text">
                Hide blocks with these links in them
              </div>
            </div>
            <div
              style={{
                gap: 8,
                display: "flex",
                flexWrap: "wrap",
                paddingTop: 8,
              }}
            >
              {props.model.refTargetInfo.excludes.map((item) => {
                return (
                  <Button className="rm-filter-button" onClick={item.onClick}>
                    {item.text}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rm-line" />
        <ControlGroup className="flex-h-box gap-8">
          <div style={{ flex: 1 }}>
            <InputGroup
              value={props.model.refTargetInfo.commonFilter.value}
              onChange={(e) =>
                props.model.refTargetInfo.commonFilter.onChange(e.target.value)
              }
            />
          </div>
          <Popover
            captureDismiss
            content={
              <Menu>
                <MenuItem
                  text={
                    <Switch
                      checked={isIncludeBlock}
                      inline
                      label="Include block refs"
                      onChange={() => setIsIncludeBlock((prev) => !prev)}
                    />
                  }
                ></MenuItem>
              </Menu>
            }
          >
            <Button icon="settings" />
          </Popover>
        </ControlGroup>
        <LoadMoreCommons
          isIncludeBlock={isIncludeBlock}
          list={props.model.refTargetInfo.commonList}
        />
      </div>
    );
  }
);

type CommonItem = {
  onClick: (e: React.MouseEvent) => void;
  count: number;
  text: string;
  isBlock: boolean;
};
const LoadMoreCommons = observer(
  (props: { list: CommonItem[]; isIncludeBlock: boolean }) => {
    const ref = useRef<HTMLDivElement>();
    const SIZE = 100;
    const [data, setData] = useState(props.list.slice(0, SIZE));

    useEffect(() => {
      let index = 1;
      setData(props.list.slice(0, SIZE * index));
      function fetchMoreData() {
        return new Promise<CommonItem[]>((resolve) => {
          return resolve(props.list.slice(0, ++index * SIZE));
        });
      }

      // 假设你的数据列表容器有一个特定的ID
      const listContainer = ref.current;

      const observer = new IntersectionObserver(
        (entries) => {
          // 如果列表容器与视口的交叉状态为true，即用户滚动到了列表底部
          if (entries[0].isIntersecting) {
            if (index * SIZE > props.list.length) {
              return;
            }
            // 停止观察器，避免重复触发
            observer.unobserve(listContainer);
            // 加载更多数据
            fetchMoreData().then((newData) => {
              // 将新数据追加到原有数据数组中
              setData(newData);
              // 重新开始观察列表容器
              observer.observe(listContainer);
            });
          }
        },
        {
          // 配置选项，设置阈值来确定何时触发观察器的回调函数
          threshold: 0,
        }
      );

      // 开始观察列表容器
      observer.observe(listContainer);
      return () => {
        observer.disconnect();
      };
    }, [props.list]);

    return (
      <div
        ref={ref}
        style={{
          overflow: "auto",
          maxHeight: 280,
          marginTop: 12,
        }}
      >
        <div
          style={{
            gap: 8,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {data
            .filter((v) => (v.isBlock ? props.isIncludeBlock : true))
            .map((item) => {
              return (
                <Button className="rm-filter-button" onClick={item.onClick}>
                  {item.text}
                  <sub className="rm-sub-text">{item.count}</sub>
                </Button>
              );
            })}
        </div>
      </div>
    );
  }
);

const ResultSorts = observer((props: { model: ResultFilterModel }) => {
  return (
    <Popover
      content={
        <Menu >
          {props.model.sortResultModel.options.map((option) => {
            return <MenuItem  {...option} />;
          })}
        </Menu>
      }
    >
      <Button
        icon="sort"
        small
        intent={props.model.sortResultModel.hasSelect ? "primary" : "none"}
      />
    </Popover>
  );
});
