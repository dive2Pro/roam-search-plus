import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { FuseResultModel, ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import { Callout, Card, Classes, Drawer } from "@blueprintjs/core";
import { VirtuosoGrid, VirtuosoHandle } from "react-virtuoso";
import { PageIcon } from "../core/PageIcon";
import { BlockIcon } from "../core/BlockIcon";
import "./result.css";
import dayjs from "dayjs";

const ListContainer = forwardRef<HTMLDivElement, any>((props, ref) => {
  return <div className="grid-list" {...props} ref={ref} />;
});

export const SearchResultGridView = observer(
  ({ model }: { model: ResultFilterModel }) => {
    const [index, setIndex] = useState(-1);
    const [resultModel, setData] = useState<FuseResultModel>();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const data = resultModel?.result || [];
    useEffect(() => {
      return model.registerListeners((data) => {
        setData(data);
      });
    }, []);

    useEffect(() => {
      setIndex(0);
      virtuosoRef.current?.scrollToIndex?.(0);
    }, [data]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [uid, setUid] = useState("");
    if (data.length === 0) {
      return (
        <Callout intent="primary">
          No items match your query/filter criteria.
        </Callout>
      );
    }

    return (
      <div
        className={`inline-search-result ${
          model.model.isLoading ? Classes.SKELETON : ""
        }`}
      >
        <Drawer
          icon="info-sign"
          className="inline-search-drawer"
          onClose={() => {
            setDrawerOpen(false);
            setUid("");
          }}
          isOpen={drawerOpen}
        >
          <div className={Classes.DRAWER_BODY}>
            <div className={Classes.DIALOG_BODY}>
              <UidRender uid={uid} />
            </div>
          </div>
        </Drawer>
        <VirtuosoGrid
          style={{ height: 500, width: "100%" }}
          totalCount={data.length}
          overscan={200}
          data={data}
          components={{
            List: ListContainer,
            // ScrollSeekPlaceholder: ({ height, width, index }) => (
            //   <Card interactive className="grid-item" elevation={1}></Card>
            // ),
          }}
          itemContent={(index) => {
            const item = data[index];
            if (item.item[":block/parents"]) {
              return (
                <Card
                  interactive
                  className="grid-item"
                  elevation={1}
                  key={item.item[":block/uid"]}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      e.preventDefault();
                      window.getSelection().removeAllRanges();

                      window.roamAlphaAPI.ui.rightSidebar.addWindow({
                        window: {
                          "block-uid": item.item[":block/uid"],
                          type: "block",
                        },
                      });
                      return;
                    }
                    setDrawerOpen(true);
                    setUid(item.item[":block/uid"]);
                  }}
                >
                  <div>
                    <div className="flex">
                      <BlockIcon />
                      <small className="footer">
                        {dayjs(item.item[":edit/time"]).format(
                          "YYYY-MM-DD hh:mm"
                        )}
                      </small>
                    </div>
                  </div>
                  <div className="content" >
                    {/* <UidRender uid={item.item[":block/uid"]} /> */}
                    <BlockRender>{`- `+ item.item[":block/string"]}</BlockRender>
                  </div>
                </Card>
              );
            }
            return (
              <Card
                interactive
                className="grid-item"
                elevation={1}
                key={item.item[":block/uid"]}
                onClick={(e) => {
                  if (e.shiftKey) {
                    e.preventDefault();
                    window.roamAlphaAPI.ui.rightSidebar.addWindow({
                      window: {
                        "block-uid": item.item[":block/uid"],
                        type: "block",
                      },
                    });
                    window.getSelection().removeAllRanges();
                    return;
                  }
                  setDrawerOpen(true);
                  setUid(item.item[":block/uid"]);
                }}
              >
                <h5
                  className="flex"
                  style={{
                  }}
                >
                  <div style={{ minWidth: 24 }}>
                    <PageIcon size={20} />
                  </div>
                  {`  `}
                  {item.item[":node/title"]}
                </h5>
                <small className="footer">
                  {dayjs(item.item[":edit/time"]).format("YYYY-MM-DD hh:mm")}
                </small>
                <div className="content">
                  <PageContent uid={item.item[":block/uid"]} />
                </div>
              </Card>
            );
          }}
          // scrollSeekConfiguration={{
          //   enter: (velocity) => Math.abs(velocity) > 200,
          //   exit: (velocity) => Math.abs(velocity) < 30,
          //   change: (_, range) => console.log({ range }),
          // }}
        />
      </div>
    );
  }
);

function PageContent({ uid }: { uid: string }) {
  const ref = useRef();
  useEffect(() => {
    let mounted = true;
    setTimeout(() => {
      if (!mounted) {
        return;
      }
      window.roamAlphaAPI.ui.components.renderBlock({
        uid,
        // @ts-ignore
        "zoom-path?": false,
        "hide-mentions?": true,
        el: ref.current,
      });
    }, 200);
    return () => {
      mounted = false;
    };
  }, []);
  return <div ref={ref}></div>;
}

function UidRender({ uid }: { uid: string }) {
  const ref = useRef();
  useEffect(() => {
    if (!uid) {
      return;
    }
    let mounted = true;
    setTimeout(() => {
      window.roamAlphaAPI.ui.components.renderBlock({
        uid,
        // @ts-ignore
        "zoom-path?": true,
        el: ref.current,
      });
    }, 200);
    return () => {
      mounted = false;
    };
  }, [uid]);
  return <div ref={ref}></div>;
}




function BlockRender(props: { children: string }) {
  const [children, setChildren] = useState(<>{props.children}</>);
  useEffect(() => {
    const LoadedMarkdown = require("marked-react") as unknown as () => Promise<any>;
    console.log(LoadedMarkdown, ' --- ')
    LoadedMarkdown().then((V) => {
      setChildren(<V>{props.children}</V>);
    });
  }, []);
  return <div>{children}</div>;
}
