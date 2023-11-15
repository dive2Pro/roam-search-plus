import { renderNode } from ".";
import { extension_helper } from "../helper";



export function initInlineSearch(extensionAPI: RoamExtensionAPI) {
    const observer = new MutationObserver((ms) => {
        ms.forEach(m => {
            m.addedNodes.forEach(node => {
                isNode(node as HTMLElement) && process(node);
            }
            )
        })
    });
    process(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
    extension_helper.on_uninstall(() => {
        observer.disconnect();
    })
}

const isTargetFormat = (d: Element) => {
    const text = d.textContent;
    return text.startsWith("search+") || text.startsWith("[[search+]]")
}
const process = (node: Node) => {
    Array.from((node as HTMLElement)?.querySelectorAll(".bp3-button"))
        .filter(d => d.tagName === 'BUTTON' && isTargetFormat(d))
        .forEach(d => {
            renderNode(d as HTMLButtonElement);
        })
}

const isNode = (node: HTMLElement) => node.innerHTML