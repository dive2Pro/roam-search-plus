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
          <section className="flex-column" style={{ width: 600, padding: 10 }}>
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

            {store.ui.isTyped() ? <ListContainer /> : <QueryHistory />}

            <div>
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
              ) : null}
            </div>

            <div className={Classes.DIALOG_FOOTER}>
              {store.ui.result.size() > 0 ? (
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                  <Popover
                    position="right"
                    interactionKind="hover"
                    content={
                      <Menu>
                        <MenuItem
                          text="As one line"
                          onClick={() => {
                            store.actions.confirm.copyResult(true);
                            Toaster.create().show({
                              message: "references copied",
                            });
                            store.actions.toggleDialog();
                          }}
                        />
                        <MenuItem
                          text="As multiple lines"
                          onClick={() => {
                            store.actions.confirm.copyResult();
                            Toaster.create().show({
                              message: "references copied",
                            });
                            store.actions.toggleDialog()
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
              ) : null}
              <sub className="hint">shift+ open in sidebar</sub>
            </div>
          </section>
          <Sidebar />
        </div>
      </Dialog>
    </>
  );
}

export default observer(_App);
