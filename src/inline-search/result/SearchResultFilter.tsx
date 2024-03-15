import React, { useEffect, useState } from "react";
import { FuseResultModel, ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Classes,
  ControlGroup,
  Divider,
  InputGroup,
  Popover,
  Tooltip,
} from "@blueprintjs/core";
import { PageOrBlockSelect, ViewSelect } from "../core/comps";
import { DIALOG_BODY } from "@blueprintjs/core/lib/esm/common/classes";

export const SearchResultFilter = observer(
  (props: { model: ResultFilterModel }) => {
     const [resultModel, setData] = useState<FuseResultModel>();
     const data = resultModel?.result || [];
     useEffect(() => {
       return props.model.registerListeners((data) => {
         setData(data);
       });
     }, []);

    return (
      <ControlGroup
        className={` ${props.model.model.isLoading ? Classes.SKELETON : ""}`}
      >
        <ResultKeywordsFilter model={props.model} />
        <Divider />
        <PageOrBlockSelect
          value={props.model.type as "all"}
          onSelect={(type) => {
            props.model.changeType(type);
          }}
        />
        <Popover content={<ResultReferencesFilter model={props.model} />}>
          <Button icon="filter" small />
        </Popover>
        {props.model.hasFilter ? (
          <>
            <Divider />

            <Button
              onClick={() => props.model.reset()}
              intent="warning"
              outlined
              small
              icon="small-cross"
              text="clear"
            />
          </>
        ) : null}

        <Divider />
        <ViewSelect
          value={props.model.viewType}
          onSelect={(type) => {
            props.model.changeViewType(type);
          }}
        />

        <Tooltip content={"shuffle notes"}>
          <Button
            icon="random"
            small
            onClick={() => {
              props.model.shuffle();
            }}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <small>
          {data.length}/{props.model.totalCount}
        </small>
      </ControlGroup>
    );
  }
);
const ResultKeywordsFilter = observer((props: { model: ResultFilterModel }) => {
  return (
    <InputGroup
      value={props.model.query}
      small
      rightElement={
        props.model.query ? (
          <Button
            icon="small-cross"
            minimal
            small
            onClick={() => {
              props.model.changeQuery("");
            }}
          />
        ) : null
      }
      placeholder="fuzzy search..."
      onChange={(e) => {
        props.model.changeQuery(e.target.value);
      }}
    />
  );
});

const ResultReferencesFilter = observer(
  (props: { model: ResultFilterModel }) => {
    return (
      <div className={DIALOG_BODY}>
        <div>Includes</div>
        {props.model.refTargetInfo.contains.map((item) => {
          return <Button small onClick={item.onClick}>{item.text}</Button>;
        })}

        <div>Removes</div>

        {props.model.refTargetInfo.excludes.map((item) => {
          return <Button small onClick={item.onClick}>{item.text}</Button>;
        })}

        <br />
        <Divider />
        <div>
          {props.model.refTargetInfo.commons.map((item) => {
            return <Button small onClick={item.onClick}>{item.text}</Button>;
          })}
        </div>
      </div>
    );
  }
);
