import { Button, Divider } from "@blueprintjs/core";

export function RoamTagFilterHeader<T extends { text: string; }>(props: {
  onItemAddClick?: (item: T) => void;
  onItemRemoveClick?: (item: T) => void;
  onClearAdded?: () => void;
  onClearexcludes?: () => void;
  includes: T[];
  excludes: T[];
}) {

  return <div className="flex-row">
    <div className="flex-1">
      <div className="flex-row p-1.5">
        <strong style={{ marginRight: 8 }}>Includes{` `}</strong> Click to Add
        <div className="flex-1" />
        {props.includes.length ?
          <Button minimal autoFocus={false} small icon="delete" onClick={() => {
            props.onClearAdded();
          }} />
          : null}

      </div>
      {props.includes.length ?
        <div className="flex-row flex-wrap flex-1">
          {props.includes.map(item => {
            return <Button text={item.text} style={{ margin: 4 }}
              onClick={() => props.onItemAddClick(item)} />;
          })}
        </div> : null}

    </div>
    <Divider />
    <div className="flex-1">
      <div className="flex-row p-1.5">
        <strong style={{ marginRight: 8 }}>Excludes</strong> Shift+Click to Add
        <div className="flex-1" />
        {props.excludes.length ?
          <Button minimal small icon="delete" onClick={() => {
            props.onClearexcludes();
          }} />
          : null}
      </div>
      <div className="flex-row flex-wrap flex-1">
        {props.excludes.map(item => {
          return <Button small text={item.text} style={{ margin: 4 }}
            onClick={() => props.onItemRemoveClick(item)} />;
        })}
      </div>
    </div>
    <div className="rm-line"></div>
  </div>;

}
