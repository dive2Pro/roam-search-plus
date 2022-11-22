import React, { useRef, useEffect } from "react";

export function HighlightText(props: {
  highlight: string;
  text: string;
  level?: number;
}) {
  if (!props.text) {
    return null;
  }
  const index = props.text.indexOf(props.highlight);
  const ref = useRef<HTMLSpanElement>();
  const affixRef = useRef<HTMLSpanElement>();
  const highlighRef = useRef<HTMLSpanElement>();
  const [width1, setWidth1] = useState<number>();
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    var rect = ref.current.parentElement.getBoundingClientRect();
    var rect2 = affixRef.current.getBoundingClientRect();
    var rect3 = highlighRef.current.getBoundingClientRect();
    var fontSizePx = window
      .getComputedStyle(ref.current, null)
      .getPropertyValue("font-size");
    var fontSize = parseFloat(fontSizePx);
    if (!props.level) {
      // console.log(rect, rect2, rect3);
      const width1 = rect.width / 2 - rect3.width;
      if (rect2.width <= width1) {
        return;
      }
      setWidth1(width1);
    }
    const midIndex = Math.floor(rect.width / 2 / fontSize);
  }, []);

  if (index === -1) {
    return <span>{props.text}</span>;
  }

  return (
    <span ref={ref} className="ellipsis">
      <span
        className={width1 ? "ellipsis-to-left" : ""}
        style={width1 ? { width: width1 } : {}}
        ref={affixRef}
      >
        {props.text.slice(0, Math.max(0, index - 10))}
      </span>

      <span ref={highlighRef}>
        <span>{props.text.slice(Math.max(0, index - 10), index)}</span>
        <span className="rm-highlight">{props.highlight}</span>
      </span>
      <HighlightText
        level={(props.level || 0) + 1}
        highlight={props.highlight}
        text={props.text.slice(index + props.highlight.length)}
      />
    </span>
  );
}
