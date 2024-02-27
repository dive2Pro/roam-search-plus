import React from "react";
import { ResultFilterModel } from "../core";
import { observer } from "mobx-react-lite";
import {
  Button,
  Classes,
  ControlGroup,
  Divider,
  InputGroup,
  Popover,
} from "@blueprintjs/core";
import { PageOrBlockSelect, ViewSelect } from "../core/comps";

export const SearchResultFilter = observer(
  (props: { model: ResultFilterModel }) => {
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
        {props.model.hasFilter ? (
          <>
            <Divider />

            <Button
              onClick={() => props.model.reset()}
              intent="warning"
              outlined
              small
              icon="small-cross"
              text="clear filters"
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
        {/* <Popover content={<ResultReferencesFilter model={props.model} />}>
          <Button
            icon="filter"
            small
            onClick={() => {
              props.model.shuffle();
            }}
          >
            Filter by references
          </Button>
        </Popover> */}

        <Button
          icon="random"
          small
          onClick={() => {
            props.model.shuffle();
          }}
        />
      </ControlGroup>
    );
  }
);
const ResultKeywordsFilter = observer((props: { model: ResultFilterModel }) => {
  return (
    <InputGroup
      leftIcon="filter"
      value={props.model.query}
      small
      placeholder="Filter by content"
      onChange={(e) => {
        props.model.changeQuery(e.target.value);
      }}
    />
  );
});

const ResultReferencesFilter = observer(
  (props: { model: ResultFilterModel }) => {
    props.model;
    return null;
  }
);
