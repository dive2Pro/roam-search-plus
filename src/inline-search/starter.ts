import { renderNode, unmountNode } from ".";
import { extension_helper } from "../helper";

export function initInlineSearch(extensionAPI: RoamExtensionAPI) {
  const observer = new MutationObserver((ms) => {
    ms.forEach((m) => {
      m.addedNodes.forEach((node) => {
        isNode(node as HTMLElement) && process(node as HTMLElement);
      });
    });
  });
  process(document.body);
  observer.observe(document.body, { childList: true, subtree: true });
  extension_helper.on_uninstall(() => {
    observer.disconnect();
  });
}

const isTargetFormat = (d: Element) => {
  const text = d.textContent;
  return text.startsWith("search+") || text.startsWith("[[search+]]");
};
const process = (node: HTMLElement) => {
  const nodes = Array.from(node?.querySelectorAll(".bp3-button"));
  nodes
    .filter((d) => d.tagName === "BUTTON" && isTargetFormat(d))
    .forEach((d) => {
      renderNode(d as HTMLButtonElement);
    });

// // console.log(nodes.map((d) => d));
  [node]
    .filter(
      (d) =>
        d.tagName === "DIV" &&
        d.classList &&
        d.classList.contains("rm-autocomplete__wrapper")
    )
    .forEach((d) => {
      unmountNode(d as HTMLTextAreaElement);
    });
};

const isNode = (node: HTMLElement) => node.innerHTML;
