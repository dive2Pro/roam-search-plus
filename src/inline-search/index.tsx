import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { SearchInline } from "./core";
import { Button, Classes, Popover } from "@blueprintjs/core";

export function renderNode(node: HTMLElement) {
  const block = node.closest("[id^='block-input']");
  const id = node.closest("[id^='block-input']")?.id;
  console.log(node, " - renderNode - ", id);

  if (!id) {
    return;
  }
  const parent = block.closest(".roam-block-container");
  const el = document.createElement("div");
  parent.querySelectorAll(".inline-search-el").forEach((e) => {
    e.remove();
  });
  el.className = `inline-search-el`;
  parent.appendChild(el);
  ReactDOM.render(<App id={id} onUnmount={() => el.remove()} />, el);
}

function App(props: { id: string; onUnmount: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    return props.onUnmount;
  }, [props.onUnmount]);
  return (
    // <Popover
    //   //   isOpen={open}
    //   canEscapeKeyClose={false}
    //   content={
    //     <div className={Classes.DIALOG_BODY}>
    //       <SearchInline />
    //     </div>
    //   }
    //   popoverClassName="search-popover"
    //   backdropProps={{}}
    //   modifiers={{
    //     flip: {
    //       enabled: true,
    //     },
    //     arrow: {
    //       enabled: true,
    //     },
    //   }}
    //   autoFocus={false}
    // >
    <div style={{}}>
      <Button
        onPointerDown={(e) => {
          console.log("CLICCKCKCK");
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
      >
        Filter2
      </Button>
      {open ? <SearchInline /> : null}
    </div>

    // </Popover>
  );
}
