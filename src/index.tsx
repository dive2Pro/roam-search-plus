import "./styles.css";
import App from "./App";
import { extension_helper } from "./helper";
import ReactDOM from 'react-dom';

export default {
  onload: (extensionAPI: RoamExtensionAPI) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    ReactDOM.render(<App/>, el)
    extension_helper.on_uninstall(() => {
      ReactDOM.unmountComponentAtNode(el)
      document.body.removeChild(el);
    });
  },
  onunload: () => {
    extension_helper.uninstall();
  },
};
