import { InputGroup } from "@blueprintjs/core";
import { useState } from "react";
import { Virtuoso } from "react-virtuoso";

export function RoamPageFilter<T extends { text: string; }>(props: {
  items: T[];
  header?: JSX.Element;
  itemRenderer: (index: number, d: T) => JSX.Element;
}) {
  const [search, setSearch] = useState("");
  const pages = props.items.filter(item => {
    return item.text.toLowerCase().includes(search.toLowerCase());
  });

  return <div className="page-select">
    {props.header}
    <InputGroup
      value={search}
      placeholder="search..."
      onChange={e => setSearch(e.target.value)} />
    <Virtuoso
      style={{
        height: 300,
      }}
      totalCount={pages.length}
      data={pages}
      itemContent={(index, data) => {
        return props.itemRenderer(index, data);
      }} />
  </div>;
}
