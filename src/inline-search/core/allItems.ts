import { makeAutoObservable } from "mobx";
import { getAllBlockRefs, getAllPages } from "../../roam";

class AllPagesItems {
  _items = this.getData();
  _updateTime = Date.now()
  constructor() {
    makeAutoObservable(this, {
      _items: false,
    });
  }

  get items() {
    return this._items
  }

  set items(v) {
    this._items = v;
    this._updateTime = Date.now();
  }

  update() {
    this.items = this.getData();
  }
  private getData() {
    console.log(getAllPages(), ' = all pages')
    return getAllPages()
      .filter((page) => !page.isBlock)
      .map((page) => {
        const r = {
          uid: page.block[":block/uid"],
          label: page.block[":node/title"],
          id: page.block[":db/id"],
          editTime: page.block[":edit/time"],
          createTime: page.block[":create/time"],
        };

        // console.log(r, ' =r')
        return r;
      })
      .sort((a, b) => {
        return b.editTime - a.editTime;
      });
  }
}

class AllBlocksItems {
  _items = this.getData();
  _updateTime = Date.now();
  constructor() {
    makeAutoObservable(this, { _items: false});
  }
  update() {
    this.items = this.getData();
  }

  get items() {
    return this._items;
  }

  set items(v) {
    this._items = v;
    this._updateTime = Date.now();
  }
  
  private getData() {
    return getAllBlockRefs()
      .filter((block) => block?.[":block/uid"])
      .map((block) => {
        const r = {
          uid: block[":block/uid"],
          label: block[":block/string"],
          id: block[":db/id"],
          editTime: block[":edit/time"],
          createTime: block[":create/time"],
        };
        return r;
      })
      .sort((a, b) => {
        return b.editTime - a.editTime;
      });
  }
}
export const allPageRefsItems = new AllPagesItems();
export const allBlockRefsItems = new AllBlocksItems();