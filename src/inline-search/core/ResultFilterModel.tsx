import { makeAutoObservable, reaction } from "mobx";
import type { Block, ITabModel } from "./type";
import Fuse, { FuseResult } from "fuse.js";
import { fuseOptions } from ".";


export class ResultFilterModel {
  constructor(public model: ITabModel) {
    makeAutoObservable(this, { result: false });
  }

  get type() {
    return this.model.data.type || 'all';
  };
  get query() {
    return this.model.data.query || '';
  };

  fuse: Fuse<Block> = new Fuse([], fuseOptions);

  changeType = (v: string) => {
    this.model.saveResultFilterType(v);
  };

  changeQuery = (v: string) => {
    this.model.saveResultFilterQuery(v);
  };

  filter = (bs: Block[]) => {
    switch (this.type) {
      case "all":
        return bs;
      case "page":
        return bs.filter((b) => !b[":block/parents"]);
      case "block":
        return bs.filter((b) => b[":block/parents"]);
    }
    return bs;
  };

  get result() {
    return this.filter(this.model.searchResult);
  }

  registerListeners(cb: (data: FuseResult<Block>[]) => void) {
    const dispose = reaction(
      () => [this.query.trim(), this.result] as const,
      ([query, result]) => {
        console.log(query, " = query");
        if (!query.trim()) {
          cb(
            this.result.map((item) => ({
              item,
              refIndex: 0,
              matches: [],
            }))
          );
          return;
        }
        this.fuse.setCollection(result);
        cb(this.fuse.search(query));
      },
      {
        name: "fuse",
        delay: 500,
        fireImmediately: true,
      }
    );
    return dispose;
  }

  get hasFilter() {
    return this.type !== "all" || this.query !== "";
  }

  reset() {
    this.model.saveResultFilterType("all");
    this.model.saveResultFilterQuery("");
  }

}
