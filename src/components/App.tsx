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
} from "@blueprintjs/core";

import { store } from "../store";
import { enableLegendStateReact, observer } from "@legendapp/state/react";
import { ListContainer } from "./query-result";
import { Sidebar } from "./sidebar";
import { QueryHistory } from "./history-result";
enableLegendStateReact();

function _App() {
  return (
    <>
      <Dialog
        usePortal={false}
        isOpen={store.ui.isOpen()}
        style={{
          paddingBottom: 0,
          width: "unset",
          alignItems: "flex-start",
        }}
        onClose={() => store.actions.closeDialog()}
        portalClassName="top-dialog"
      >
        <div style={{ display: "flex" }}>
          <section style={{ width: 600, padding: 10 }}>
            <div>
              <InputGroup
                placeholder="search..."
                leftIcon={
                  store.ui.isLoading() ? (
                    <Icon icon="refresh" size={14} className="loading" />
                  ) : (
                    "search"
                  )
                }
                autoFocus
                fill
                rightElement={
                  store.ui.isTyped() ? (
                    <Button
                      onClick={() => {
                        store.actions.clearSearch();
                      }}
                      icon="small-cross"
                      minimal
                      small
                    />
                  ) : undefined
                }
                value={store.ui.getSearch()}
                onChange={(e) => store.actions.changeSearch(e.target.value)}
                onKeyPress={(e) => {
                  console.log(e.key, " == key");
                  if (e.key === "Enter") {
                    store.actions.searchAgain();
                  }
                }}
              />
            </div>
            {store.ui.result.size() > 0 ? (
              <>
                <div>
                  <ButtonGroup className="sub-bg">
                    {/* <Checkbox
                  checked={store.ui.isMultipleSelection()}
                  onChange={(e) => store.actions.toggleMultiple()}
                  label="Multiple Select"
                ></Checkbox>
                <Divider /> */}
                    <Popover
                      position={Position.BOTTOM}
                      modifiers={{
                        arrow: {
                          enabled: false,
                        },
                      }}
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
                        Sort By:{" "}
                        <Button
                          rightIcon={<Icon icon="chevron-down" size={12} />}
                          minimal
                          text={store.ui.sort.selectedText()}
                        ></Button>
                      </div>
                    </Popover>
                  </ButtonGroup>
                </div>

                <Divider />
              </>
            ) : null}

            {store.ui.isTyped() ? <ListContainer /> : <QueryHistory />}

            <div className={Classes.DIALOG_FOOTER}>
              {store.ui.isMultipleSelection() ? (
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
                    interactionKind="hover"
                    position="right"
                    content={
                      <Menu>
                        <MenuItem
                          icon="duplicate"
                          text="Copy as one line"
                        ></MenuItem>
                        <MenuItem
                          icon="multi-select"
                          text="Copy as multiple line"
                        ></MenuItem>
                      </Menu>
                    }
                  >
                    <Button
                      disabled={store.ui.selectedCount() === 0}
                      intent="primary"
                      onClick={() => {
                        console.log("-----");
                        store.actions.confirmMultiple();
                      }}
                    >
                      Confirm
                    </Button>
                  </Popover>
                </div>
              ) : (
                <sub>Ctrl + as reference</sub>
              )}
            </div>
          </section>
          <Sidebar />
        </div>
      </Dialog>
    </>
  );
}

export default observer(_App);
