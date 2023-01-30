import "./styles.css";
import App from "./components/App";
import { CONSTNATS, extension_helper } from "./helper";
import ReactDOM from "react-dom";
import { store, initStore } from "./store";
import { initExtention } from "./extentionApi";
import { Button, Tooltip } from "@blueprintjs/core";
import { initSettings } from "./config";

const initListener = () => {
  const handler = (e: KeyboardEvent) => {
    if (e.shiftKey && e.ctrlKey && e.code === "KeyP") {
      store.actions.toggleDialog();
    } else if (e.code === "Escape") {
      if (store.ui.isOpen() && !window.roamAlphaAPI.platform.isMobile) {
        store.actions.toggleDialog();
      }
    }
  };
  document.addEventListener("keydown", handler);
  extension_helper.on_uninstall(() => {
    document.removeEventListener("keydown", handler);
  });
};


const appendToToolbar = (name: string) => {
  //Add button (thanks Tyler Wince!)
  var nameToUse = name; //Change to whatever

  var checkForButton = document.getElementById(nameToUse + "-icon");
  if (!checkForButton) {
    checkForButton = document.createElement("span");
    checkForButton.id = nameToUse + "-button";
  
    var roamTopbar = document.getElementsByClassName("rm-topbar");
    var nextIconButton = roamTopbar[0].lastElementChild;
    var flexDiv = document.createElement("div");
    flexDiv.id = nameToUse + "-flex-space";
    flexDiv.className = "rm-topbar__spacer-sm";
    nextIconButton.insertAdjacentElement("afterend", checkForButton);
  }
  return checkForButton;
}

const initToolbarIcon = () => {
  const el = appendToToolbar('search-text');
  ReactDOM.render(
    <Button
      icon="search-text"
      small
      fill
      alignText="left"
      minimal
      onClick={store.actions.toggleDialog}
    />,
    el
  );
  extension_helper.on_uninstall(() => {
    ReactDOM.unmountComponentAtNode(el);
    el.parentElement.removeChild(el);
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
    initSettings(extensionAPI);
    initListener();
    initExtention(extensionAPI);
    initStore(extensionAPI);
    window.roamAlphaAPI.platform.isMobile
      ? initToolbarIcon()
      : initSidebarIcon();
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
