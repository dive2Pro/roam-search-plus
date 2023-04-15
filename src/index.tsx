import "./styles.css";
import App from "./components/App";
import { CONSTNATS, extension_helper, simulateClick } from "./helper";
import ReactDOM from "react-dom";
import { store, initStore } from "./store";
import { initExtention } from "./extentionApi";
import { Button, Tooltip } from "@blueprintjs/core";
import { initSettings } from "./config";
import { initInlineSearch } from "./inline-search/starter";

// The shortcut to open the search + dialog still retains the selection status, which may cause accidental deletion of  blocks.
const blurRoamSelection = () => {
  simulateClick(document.body)
}
const initListener = (extensionAPI: RoamExtensionAPI) => {
  extensionAPI.ui.commandPalette.addCommand({
    label: 'Open Search+',
    "default-hotkey": ["ctrl-shift-p"],
    callback() {
      // blur from selection;
      blurRoamSelection();
      store.actions.toggleDialog();
    }
  })
  const handler = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      if (store.ui.isOpen() && !window.roamAlphaAPI.platform.isMobile && !store.ui.tab.isTabNameInputing()) {
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
const PREFIX = "@ROAM-search+" + window.roamAlphaAPI.graph.name + '-'

function compatialOffline(extensionAPI: RoamExtensionAPI): RoamExtensionAPI {
  if (window.roamAlphaAPI.graph.type === 'offline') {
    const r = {
      settings: {
        async set(k: string, v: string) {
          localStorage.setItem(`${PREFIX}${k}`, v);
        },
        get(k: string) {
          return localStorage.getItem(`${PREFIX}${k}`)
        },
        getAll() {
          let result: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(PREFIX)) {
              result[key.substring(PREFIX.length)] = localStorage.getItem(key);
            }
          }
          return result;
        },
        panel: extensionAPI.settings.panel
      },
      ui: {
        commandPalette: {
          addCommand: () => {}
        }
      }
    }
    extension_helper.on_uninstall(() => {
      Object.keys(r.settings.getAll()).forEach(key => {
        localStorage.removeItem(`${PREFIX}${key}`)
      })
    })

    return r;
  }

  return extensionAPI;
}

export default {
  onload: ({ extensionAPI }: { extensionAPI: RoamExtensionAPI }) => {
    extensionAPI = compatialOffline(extensionAPI);
    initSettings(extensionAPI);
    initListener(extensionAPI);
    initExtention(extensionAPI);
    initStore(extensionAPI);
    initInlineSearch(extensionAPI);
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
