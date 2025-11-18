import { Button, ButtonGroup, Icon, Toaster } from "@blueprintjs/core";
import { ObservableObject } from "@legendapp/state";
import { observer, For } from "@legendapp/state/react";
import { CONSTNATS } from "../helper";
import { opens } from "../roam";
import { store } from "../store";
import { useState } from "react";

type Item = ObservableObject<{ text: string; id: string }>;

const HistoryItem = observer(({ item }: { item: Item }) => {
  return (
    <Button
      minimal
      alignText="left"
      className="query-history-item"
      onClick={() => {
        store.actions.useHistory(item.text.peek());
      }}
      rightIcon={
        <Icon
          className=""
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            store.actions.history.deleteSearch(item.id.peek());
          }}
          icon="small-cross"
        />
      }
      text={item.text}
    />
  );
});

const RecentlyViewedItem = observer(
  ({ item }: { item: ObservableObject<RecentlyViewedItem> }) => {
    // console.log({ item: item.text.get()})
    return (
      <Button
        minimal
        alignText="left"
        className="query-history-item"
        large
        onClick={(e) => {
          // store.actions.useHistory(item.text.peek());
          let opened = false;
          if (e.shiftKey) {
            opened = opens.sidebar(item.id.peek());
          } else {
            opened = opens.main.page(item.id.peek());
          }
          if (opened) {
            store.actions.toggleDialog();
          } else {
            store.actions.history.deleteViewedItem(item.id.peek());
            Toaster.create({}).show({
              message: `${item.isPage ? "Page" : "Block"} was deleted`,
              intent: "warning",
            });
          }
        }}
        rightIcon={
          <Icon
            className=""
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              store.actions.history.deleteViewedItem(item.id.peek());
            }}
            icon="small-cross"
          />
        }
        fill
      >
        <div className="flex-align-center flex-row gap-4 p-2">
          <Icon icon="application" size={22} />
          {item.text.get()}
        </div>
      </Button>
    );
  }
);

export const QueryHistory = observer(() => {
  const [index, setIndex] = useState(0);
  const data = [
    {
      title: "Recently Viewed",
      list: store.ui.history.getViewed(),
    },
  ].filter((item) => item.list.peek().length > 0);
  return (
    <div className={`${CONSTNATS.history}`}>
      {store.ui.history.getSearch().length ? (
        <div className="p-6 flex-column " style={{ gap: 12 }}>
          <div>Search history</div>
          <div className="flex" style={{ gap: 12 }}>
            {store.ui.history.getSearch().map((keyword) => {
              return <HistoryItem item={keyword}></HistoryItem>;
            })}
          </div>
        </div>
      ) : null}
      <div className="p-6 flex-column flex-1" style={{ gap: 12 }}>
        <div className="gap-4">
          {data.map((item, _index) => {
            return <div>{item.title}</div>;
          })}
        </div>
        <div className="overflow-auto flex-1">
          {(data[index]?.list || []).map((item) => {
            return <RecentlyViewedItem item={item} />;
          })}
        </div>
      </div>
    </div>
  );
});
