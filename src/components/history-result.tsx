import { Button, Icon, Toaster } from "@blueprintjs/core";
import { ObservableObject } from "@legendapp/state";
import { observer, For } from "@legendapp/state/react";
import { CONSTNATS } from "../helper";
import { opens } from "../roam";
import { store } from "../store";

type Item = ObservableObject<{ text: string; id: string }>;

const HistoryItem = observer(({ item }: { item: Item }) => {
  return (
    <Button
      minimal
      alignText="left"
      className="query-history-item"
      icon="search"
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
      fill
      text={item.text}
    />
  );
});

const RecentlyViewedItem = observer(
  ({ item }: { item: ObservableObject<RecentlyViewedItem> }) => {
    return (
      <Button
        minimal
        alignText="left"
        className="query-history-item"
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
        text={item.text.get()}
      />
    );
  }
);

export const QueryHistory = observer(() => {
  return (
    <div className={CONSTNATS.history}>
      {store.ui.history.getViewed().get().length > 0 ? (
        <section>
          <div className="header">
            <div>Recently Viewed</div>
            <Button
              text="Clear"
              minimal
              small
              onClick={store.actions.history.clearViewed}
            />
          </div>
          <For each={store.ui.history.getViewed()} item={RecentlyViewedItem} />
        </section>
      ) : null}

      {store.ui.history.getSearch().get().length > 0 ? (
        <section>
          <div className="header">
            <div>Latest search</div>
            <Button
              text="Clear"
              minimal
              small
              onClick={store.actions.history.clearSearch}
            />
          </div>
          <div>
            <For each={store.ui.history.getSearch()} item={HistoryItem}></For>
          </div>
        </section>
      ) : null}
    </div>
  );
});
