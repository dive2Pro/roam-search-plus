import ReactDOM from "react-dom";
import {
  Button,
  InputGroup,
  Dialog,
  Classes,
  Divider,
  Menu,
  Popover,
  Position,
  MenuItem,
  Icon,
  ButtonGroup,
  Toaster,
  ControlGroup,
  Checkbox,
  ProgressBar,
} from "@blueprintjs/core";

import { store } from "../store";
import { enableLegendStateReact, observer } from "@legendapp/state/react";
import { ListContainer } from "./query-result";
import { Sidebar } from "./sidebar";
import { QueryHistory } from "./history-result";
import {
  FC,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { CONSTNATS } from "../helper";
import { BottomPopup } from "./bottom-popup";
import { usePortal } from "./commons/use-portal";
import { popoverKind } from "./commons/popover-kind";
import { notifier } from "../query";
enableLegendStateReact();

const LoadingGraph: FC<PropsWithChildren> = observer((props) => {
  return (
    <div
      className={"graph-loading w-100p flex-column"}
      style={{ display: "flex", height: "100%" }}
    >
      {store.ui.isLoadingGraph() ? (
        <div className={`loading-view`}>
          <Button icon="lightbulb" minimal>
            Graph loading
          </Button>
        </div>
      ) : null}
      {props.children}
    </div>
  );
});

const copyToast = () => {
  Toaster.create().show({
    intent: "success",
    icon: "small-tick",
    message: "References copied",
  });
};
const MainView = observer(() => {
  const ref = useRef<HTMLInputElement>();
  const [isFilterOpen, setFilterOpen] = useState(true);
  useEffect(() => {
    return store.actions.onVisibleChange((b) => {
      if (b && ref.current) {
        ref.current.focus();
      }
    });
  }, []);
  return (
    <section className="flex-column main-view">
      <div
        className="flex-column bp3-card"
        style={{
          padding: "10px 20px",
          gap: 12,
        }}
      >
        <ControlGroup fill>
          <InputGroup
            placeholder="search..."
            inputRef={ref}
            fill
            large
            leftElement={
              store.ui.isLoading() ? (
                <Icon icon="refresh" size={14} className="loading" />
              ) : (
                <Icon icon="search" size={14} />
              )
            }
            className="search-input"
            value={store.ui.getSearch()}
            onChange={(e) => store.actions.changeSearch(e.target.value)}
            onKeyDown={(e) => {
              console.log(e.key, " == key");
              if (e.metaKey || e.shiftKey || e.ctrlKey) {
                return;
              }

              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
              }

              if (e.key === "ArrowDown") {
                document.dispatchEvent(
                  new CustomEvent("result-scroll", {
                    detail: {
                      direction: "down",
                    },
                  })
                );
              } else if (e.key === "ArrowUp") {
                document.dispatchEvent(
                  new CustomEvent("result-scroll", {
                    detail: {
                      direction: "up",
                    },
                  })
                );
              }
            }}
            onKeyPress={(e) => {
              // console.log(e.key, " == key");

              if (e.key === "Enter") {
                // store.actions.searchAgain();
                if (e.shiftKey) {
                  document.dispatchEvent(
                    new CustomEvent("result-scroll", {
                      detail: {
                        direction: "result-enter-shift",
                      },
                    })
                  );
                  return;
                }
                document.dispatchEvent(
                  new CustomEvent("result-scroll", {
                    detail: {
                      direction: "result-enter",
                    },
                  })
                );
              }
            }}
            rightElement={
              store.ui.isTyped() ? (
                <>
                  <Button
                    icon="refresh"
                    minimal
                    onClick={() => {
                      store.actions.searchAgain();
                    }}
                  ></Button>
                  <Button
                    onClick={() => {
                      store.actions.clearSearch();
                    }}
                    minimal
                    icon="cross"
                    className="bp3-text-muted"
                  ></Button>
                </>
              ) : undefined
            }
          />
        </ControlGroup>
        {store.ui.isTyped() ? (
          <ButtonGroup className="flex input-options">
            <Popover
              position={Position.BOTTOM}
              modifiers={{
                arrow: {
                  enabled: false,
                },
              }}
              targetProps={{
                style: {
                  flex: 0,
                },
              }}
              autoFocus={false}
              usePortal={usePortal()}
              content={
                <Menu>
                  {store.ui.sort.selection().map((item, index) => {
                    return (
                      <MenuItem
                        onClick={() => store.actions.changeSort(index)}
                        text={item.text}
                      />
                    );
                  })}
                </Menu>
              }
            >
              <div>
                <label>Sort By: </label>
                <Button
                  rightIcon={<Icon icon="chevron-down" size={12} />}
                  minimal
                  text={store.ui.sort.selectedText()}
                ></Button>
              </div>
            </Popover>
            <Divider />
            <Checkbox
              className="flex-align-self-center"
              style={{ marginBottom: 0 }}
              checked={store.ui.isMultipleSelection()}
              onChange={(e) => store.actions.toggleMultiple()}
              label="Select Mode"
            ></Checkbox>
            {store.ui.result.size() > 0 && store.ui.isTyped() ? (
              store.ui.isMultipleSelection() ? (
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                  {store.ui.isShowSelectedTarget() ? (
                    <Button
                      intent="none"
                      icon="cross"
                      onClick={store.actions.changeShowSelectedTarget}
                    />
                  ) : (
                    <Button
                      intent="success"
                      onClick={store.actions.changeShowSelectedTarget}
                      disabled={store.ui.selectedCount() === 0}
                    >
                      {store.ui.selectedCount()}
                    </Button>
                  )}

                  <Popover
                    interactionKind={popoverKind()}
                    position="right"
                    autoFocus={false}
                    usePortal={usePortal()}
                    content={
                      <Menu>
                        <MenuItem
                          icon="duplicate"
                          text="As one line"
                          onClick={() => {
                            store.actions.confirmMultiple(true);
                            copyToast();
                          }}
                        ></MenuItem>
                        <MenuItem
                          icon="multi-select"
                          text="As multiple lines"
                          onClick={() => {
                            store.actions.confirmMultiple();
                            copyToast();
                          }}
                        ></MenuItem>
                        <MenuItem
                          icon="arrow-right"
                          text="Open in sidebar"
                          onClick={() => {
                            store.actions.openInsidebarInMultiple();
                          }}
                        ></MenuItem>
                      </Menu>
                    }
                  >
                    <Button
                      disabled={store.ui.selectedCount() === 0}
                      intent="primary"
                    >
                      Confirm
                    </Button>
                  </Popover>
                </div>
              ) : (
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                  <Popover
                    position="right"
                    interactionKind={popoverKind()}
                    usePortal={false}
                    autoFocus={false}
                    content={
                      <Menu>
                        <MenuItem
                          icon="duplicate"
                          text="As one line"
                          onClick={() => {
                            store.actions.confirm.copyResult(true);
                            copyToast();
                            store.actions.toggleDialog();
                          }}
                        />
                        <MenuItem
                          icon="multi-select"
                          text="As multiple lines"
                          onClick={() => {
                            store.actions.confirm.copyResult();
                            copyToast();
                            store.actions.toggleDialog();
                          }}
                        />
                      </Menu>
                    }
                  >
                    <Button rightIcon="chevron-right" intent="primary">
                      Copy results
                    </Button>
                  </Popover>
                </div>
              )
            ) : null}
            <div style={{ flex: 1 }} />

            <Button
              icon="filter"
              intent={isFilterOpen ? "primary" : "none"}
              active={isFilterOpen}
              minimal
              onClick={() => setFilterOpen(!isFilterOpen)}
              style={{
                zIndex: 0,
              }}
            >
              Filters
            </Button>
          </ButtonGroup>
        ) : null}
      </div>
      <PercentLine />
      <div style={{ display: "flex", flexDirection: "row", flex: 1 }}>
        <div className="flex-column flex-1">
          {store.ui.isTyped() ? (
            <>
              <ListContainer />
              <div className="hint flex p-2 gap-2">
                {store.ui.result.listSize() > 0 ? (
                  <small>
                    <strong>+{store.ui.result.listSize()}</strong> results
                  </small>
                ) : null}
                <span>shift+click to open in sidebar</span>
              </div>
            </>
          ) : (
            <QueryHistory />
          )}
        </div>
        {isFilterOpen ? (
          <>
            <Divider />
            <Sidebar />
          </>
        ) : null}
      </div>
    </section>
  );
});

function PercentLine() {
  const forceUpdate = useState(0)[1];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    notifier.on((p) => forceUpdate(p));
  }, []);

  useEffect(() => {
    if (notifier._percent === 100) {
      setTimeout(() => {
        setVisible(false);
      }, 200);
    } else if (notifier._percent !== 100) {
      setVisible(true)
    }
  }, [notifier._percent]);
  if(!visible) {
    return null
  }
  return <div>{<ProgressBar value={notifier._percent / 100} />}</div>;
}

const RoamMainView: FC<PropsWithChildren> = observer((props) => {
  useEffect(() => {
    const App = observer(() => {
      useEffect(() => {
        const mob = new MutationObserver((mutations) => {
          const target = mutations[0].target as HTMLElement;
          if (target.style.boxShadow != "") {
            el.style.zIndex = "-1";
          } else {
            el.style.zIndex = "10";
          }
        });
        mob.observe(document.querySelector(".roam-sidebar-container"), {
          attributes: true,
        });
        const list = store.ui.result.list();
        store.actions.result.setList([]);
        setTimeout(() => {
          store.actions.result.setList(list);
        }, 500);
        return () => {
          mob.disconnect();
        };
      }, []);

      if (store.ui.isOpen()) {
        el.classList.add("visible");
      } else {
        el.classList.remove("visible");
      }
      return <div className={`${CONSTNATS.el} `}>{props.children}</div>;
    });
    const roamMain = document.querySelector(".roam-body-main");
    const el = document.createElement("div") as HTMLElement;
    el.className = `${CONSTNATS.el}-max`;
    roamMain.appendChild(el);
    ReactDOM.render(<App />, el);
    return () => {
      ReactDOM.unmountComponentAtNode(el);
      roamMain.removeChild(el);
    };
  }, []);
  return null;
});

const useConfirmInputProps = (onSuccess: (title: string) => void) => {
  const [state, setState] = useState({
    open: false,
    title: "",
  });
  const close = () => {
    setState((prev) => ({ ...prev, open: false, title: "" }));
    store.actions.tab.toggleTabNameDialog();
  };
  return {
    state,
    setState,
    close,
    onConfirm() {
      if (state.title) {
        onSuccess(state.title);
        close();
      }
    },
    open() {
      setState((prev) => ({ ...prev, open: true }));
      store.actions.tab.toggleTabNameDialog();
    },
  };
};

const ConfirmInputDialog = (props: ReturnType<typeof useConfirmInputProps>) => {
  return (
    <Dialog
      title="Tab Name"
      isOpen={props.state.open}
      onClose={() => props.close()}
    >
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          value={props.state.title}
          onChange={(e) =>
            props.setState((prev) => ({ ...prev, title: e.target.value }))
          }
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              props.onConfirm();
            }
          }}
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text="Confirm"
            intent="primary"
            onClick={() => {
              props.onConfirm();
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

const AppContent = observer(() => {
  const confirmInputProps = useConfirmInputProps((title) => {
    store.actions.tab.addTab(title);
  });

  return (
    <LoadingGraph>
      <div className="titlebar-container bp3-dialog-header">
        <div className="bp3-heading">
          <ButtonGroup minimal className="tabs-container">
            {store.ui.tab.getTabs().map((tab, index) => {
              const v = tab;
              return (
                <>
                  {index > 0 ? <Divider /> : null}
                  <div className="s-tab flex-row-center">
                    <Button
                      key={v.id}
                      intent={store.ui.tab.isActive(v.id) ? "primary" : "none"}
                      onClick={() => {
                        store.actions.tab.focus(tab.id);
                      }}
                    >
                      {v.title}
                    </Button>
                    {store.ui.tab.canDel(tab.id) ? (
                      <Button
                        minimal
                        small
                        className="flex-align-start del"
                        onClick={() => store.actions.tab.deleteTab(tab.id)}
                      >
                        <Icon icon="small-cross" size={12} />
                      </Button>
                    ) : null}
                  </div>
                </>
              );
            })}
            <Button
              icon={"plus"}
              onClick={() => {
                confirmInputProps.open();
              }}
            />
          </ButtonGroup>
          <ConfirmInputDialog {...confirmInputProps} />
        </div>
        <div className="window-controls-container">
          <ButtonGroup minimal>
            <Button
              icon="minus"
              color="#FFBD44"
              intent="warning"
              onClick={() => {
                store.actions.toggleDialog();
              }}
            />
            <Button
              icon={store.ui.mode.isMaximize() ? "minimize" : "maximize"}
              intent="success"
              onClick={() => {
                store.actions.toggleMaximize();
              }}
            />
          </ButtonGroup>
        </div>
      </div>
      <div style={{ display: "flex" }} className="search-content">
        <MainView />
      </div>
    </LoadingGraph>
  );
});
const App = observer(() => {
  if (store.ui.mode.isMaximize()) {
    return (
      <RoamMainView>
        <AppContent />
      </RoamMainView>
    );
  }
  return (
    <div
      className={`${CONSTNATS.el} ${
        store.ui.isOpen() ? "visible" : "invisible"
      }`}
    >
      <div
        onClickCapture={store.actions.close}
        className={`${CONSTNATS.el}-onevent`}
      />
      <dialog
        open={store.ui.isOpen()}
        className="bp3-dialog"
        style={{
          paddingBottom: 0,
          alignItems: "flex-start",
          width: `calc(100% - 200px)`,
          height: `calc(100vh - 100px)`,
        }}
      >
        <AppContent />
      </dialog>
    </div>
  );
});

const MobileApp = observer(() => {
  const ref = useRef<HTMLInputElement>();
  useEffect(() => {
    return store.actions.onVisibleChange((b) => {
      if (b && ref.current) {
        ref.current.focus();
      }
    });
  }, []);
  return (
    <BottomPopup
      className={`${CONSTNATS.el}`}
      isOpen={store.ui.isOpen()}
      onClose={() => store.actions.toggleDialog()}
      canOutsideClickClose={!store.ui.isFilterOpen()}
      canEscapeKeyClose={
        !store.ui.isFilterOpen() && !store.ui.tab.isTabNameInputing()
      }
    >
      <div className={Classes.DRAWER_BODY}>
        <LoadingGraph>
          <div className="search-content">
            <MainView />
          </div>
        </LoadingGraph>
      </div>
    </BottomPopup>
  );
});

export default observer(() => {
  if (window.roamAlphaAPI.platform.isMobile) {
    return <MobileApp />;
  }

  return <App />;
});
