import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { FuseResultModel, ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Callout,
  Card,
  Classes,
  Dialog,
  Drawer,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  Toaster,
} from "@blueprintjs/core";
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
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uid, setUid] = useState("");
    const [deletedUidsSet, setDeletedUidsSet] = useState<Set<string>>(
      new Set()
    );
    const source = useMemo(() => {
      return deletedUidsSet.size
        ? data.filter((item) => !deletedUidsSet.has(item.item[":block/uid"]))
        : data;
    }, [deletedUidsSet, data.length]);
    console.log({...source.map( item => ({...item.item}))}, data.length, deletedUidsSet , ' ____@');
    if (source.length === 0) {
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
        <Dialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setUid("");
          }}
          style={{
            width: "68%",
            minHeight: 500,
          }}
        >
          <div className={Classes.DIALOG_BODY}>
            <UidRender uid={uid} />
          </div>
        </Dialog>
        <VirtuosoGrid
          style={{ height: 650, width: "100%" }}
          totalCount={source.length}
          overscan={200}
          data={source}
          components={{
            List: ListContainer,
            // ScrollSeekPlaceholder: ({ height, width, index }) => (
            //   <Card interactive className="grid-item" elevation={1}></Card>
            // ),
          }}
          itemContent={(_index, item) => {
            // const item = data[index];
            const onSidebar = () => {
              window.roamAlphaAPI.ui.rightSidebar.addWindow({
                window: {
                  "block-uid": item.item[":block/uid"],
                  type: "block",
                },
              });
              window.getSelection().removeAllRanges();
            };

            const onDialog = () => {
              setDialogOpen(true);
              setUid(item.item[":block/uid"]);
            };

            const onSidePeek = () => {
              setDrawerOpen(true);
              setUid(item.item[":block/uid"]);
            };

            const onDelete = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              // 1. 从 data 中暂时移除
              setDeletedUidsSet((prev) => {
                const set = new Set(prev)
                set.add(item.item[":block/uid"]);
                return set;
              });
              // 2. 当 Toast dismiss 的时候再从实际数据中删除
              const timeout = 5000;
              let timer = setTimeout(() => {
                model.deleteById(item.item[":block/uid"]);
                setDeletedUidsSet((prev) => {
                  const set = new Set(prev);
                  set.delete(item.item[":block/uid"]);
                  return set;
                });
              }, timeout);
              Toaster.create({
                position: "bottom-right",
              }).show({
                timeout: timeout,
                // intent: 'warning',
                message: "Target deleted",
                action: {
                  text: "Undo",
                  onClick: () => {
                    // 3. 如果 undo 了，从 data 中恢复
                    clearInterval(timer);
                    setDeletedUidsSet((prev) => {
                      const set = new Set(prev);
                      set.delete(item.item[":block/uid"]);
                      return set;
                    });
                  },
                },
              });
            };

            if (item.item[":block/parents"]) {
              return (
                <Card
                  interactive
                  className="grid-item"
                  elevation={1}
                  key={item.item[":block/uid"]}
                  onClick={(e) => {
                    e.preventDefault();

                    if (e.shiftKey) {
                      onSidebar();
                      return;
                    }
                    if (e.altKey) {
                      onSidePeek();
                      return;
                    }
                    onDialog();
                  }}
                >
                  <RightTopMenu
                    onSidebar={onSidebar}
                    onSidePeek={onSidePeek}
                    onCopy={() => {
                      navigator.clipboard.writeText(
                        `((${item.item[":block/uid"]}))`
                      );
                    }}
                    onDelete={onDelete}
                  />
                  <div className="content">
                    {/* <UidRender uid={item.item[":block/uid"]} /> */}
                    <PageContent uid={item.item[":block/uid"]} />
                  </div>
                  <div className="footer">
                    <BlockIcon />
                    <small className="">
                      {dayjs(item.item[":edit/time"]).format(
                        "YYYY-MM-DD hh:mm"
                      )}
                    </small>
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
                  e.preventDefault();

                  if (e.shiftKey) {
                    onSidebar();
                    return;
                  }
                  if (e.altKey) {
                    onSidePeek();
                    return;
                  }
                  onDialog();
                }}
              >
                <RightTopMenu
                  onSidebar={onSidebar}
                  onSidePeek={onSidePeek}
                  onCopy={() => {
                    navigator.clipboard.writeText(
                      `[[${item.item[":node/title"]}]]`
                    );
                  }}
                  onDelete={onDelete}
                />

                <div className="content">
                  <PageContent uid={item.item[":block/uid"]} />
                </div>
                <div className="footer">
                  <div className="flex">
                    <PageIcon size={20} />
                    <div className="bold">{item.item[":node/title"]}</div>
                  </div>
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
  }, [uid]);
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
    const LoadedMarkdown =
      require("marked-react") as unknown as () => Promise<any>;
    LoadedMarkdown().then((V) => {
      console.log(LoadedMarkdown, " --- ", V);
      setChildren(<V>{props.children}</V>);
    });
  }, []);
  return <div>{children}</div>;
}

function RightTopMenu(props: {
  onSidePeek: () => void;
  onCopy: () => void;
  onSidebar: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="right-top-menu">
      <Popover
        isOpen={open}
        onClose={() => {
          setOpen(false);
        }}
        autoFocus={false}
        content={
          <Menu >
            <MenuItem
              text="Open in sidebar"
              icon="panel-stats"
              label="shift+Click"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false)
                props.onSidebar();
              }}
            />
            <MenuItem
              text="Open in side peek"
              icon="list-detail-view"
              label="⌥+Click"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                props.onSidePeek();
              }}
            />
            <MenuItem
              text="Copy link"
              icon="link"
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy();
                setOpen(false);
              }}
            />
            <MenuDivider />
            <MenuItem
              text="Delete"
              intent="danger"
              icon="trash"
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete(e);
                setOpen(false);
              }}
            />
          </Menu>
        }
      >
        <Button
          autoFocus={false}
          small
          icon="more"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        />
      </Popover>
    </div>
  );
}
