import "./styles.css";
import App from "./components/App";
import { CONSTNATS, extension_helper } from "./helper";
import ReactDOM from "react-dom";
import { store, initStore } from "./store";
import { initExtention } from "./extentionApi";

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

export default {
  onload: ({ extensionAPI }: { extensionAPI: RoamExtensionAPI }) => {
    initListener();
    initExtention(extensionAPI);
    initStore(extensionAPI);
    const el = document.createElement("div");
    document.body.appendChild(el);
    el.className = CONSTNATS.el;
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
