import "./styles.css";
import App from "./components/App";
import { CONSTNATS, extension_helper } from "./helper";
import ReactDOM from "react-dom";
import { store, initStore } from "./store";
import { initExtention } from "./extentionApi";
import { Button, Tooltip } from "@blueprintjs/core";

const initListener = () => {
  const handler = (e: KeyboardEvent) => {
    // console.log(e.code, ' = code')
    if (e.shiftKey && e.ctrlKey && e.code === "KeyP") {
      store.actions.toggleDialog();
    }
  };
  document.addEventListener("keydown", handler);
  extension_helper.on_uninstall(() => {
    document.removeEventListener("keydown", handler);
  });
};

const initSidebarIcon = () => {
  const menu = document.querySelector("." + CONSTNATS.leftSidebarMenu);
  const target = document.querySelectorAll(".log-button")[3];
  const el = document.createElement("div");
  ReactDOM.render(
    <Tooltip
      content={"Ctrl+shift+p"}
      hoverOpenDelay={500}
      className="w-100p"
      position="bottom"
    >
      <Button
        text="Search+"
        icon="search"
        small
        fill
        alignText="left"
        minimal
        className="log-button no-outline"
        onClick={store.actions.toggleDialog}
      />
    </Tooltip>,

    el
  );
  menu.insertBefore(el, target);

  extension_helper.on_uninstall(() => {
    ReactDOM.unmountComponentAtNode(el);
    menu.removeChild(el);
  });
};

export default {
  onload: ({ extensionAPI }: { extensionAPI: RoamExtensionAPI }) => {
    initListener();
    initExtention(extensionAPI);
    initStore(extensionAPI);
    initSidebarIcon();
    const el = document.createElement("div");
    document.body.appendChild(el);
    ReactDOM.render(<App />, el);

    extension_helper.on_uninstall(() => {
      ReactDOM.unmountComponentAtNode(el);
      document.body.removeChild(el);
    });
  },
  onunload: () => {
    extension_helper.uninstall();
  },
};
