import { makeAutoObservable, runInAction } from "mobx";
import type { Block, ITabModel } from "./type";
import { delay } from "../../delay";
import { getAllData } from "../../roam";
import { FilterGroup } from ".";

export class SearchInlineFilterModel {
  group = new FilterGroup(this);
  _updateTime = Date.now();
  result: Block[] = [];

  isLoading = false;

  constructor(public tabModelGetter: () => ITabModel) {
    makeAutoObservable(this, {
      result: false,
      searchResult: false,
    });
  }

  get tabModel() {
    return this.tabModelGetter();
  }

  groupCurrentConditions() {
    const newGroup = new FilterGroup(this);
    newGroup.addFilterCondition();
    newGroup.addFilterConditionGroup(this.group);
    this.group.changeParent(newGroup);
    this.group = newGroup;
  }

  /**
   * 重置为获取 Cache 中的数据
   */
  getData: () => Block[] = () => {
    return getAllData();
  };

  /**
   * 被 SearchFilter 重置触发更新
   */
  get searchResult() {
    this._updateTime; // 用于触发更新
    return this.result;
  }

  private searchKeyIndex = 0;
  search = async () => {
    // set to field
    this.isLoading = true;
    await delay(10);
    const index = ++this.searchKeyIndex;
    const result = this.group.filterData(this.getData());
    if (index !== this.searchKeyIndex) {
      return;
    }
    runInAction(() => {
      this._updateTime = Date.now();
      this.result = [...result.map((item) => ({ ...item }))];
      console.log(this.result, " = result ");
      this.save();
      this.isLoading = false;
    });
  };

  hydrate(json: any) {
    console.log(`hydrate: `, json);
    this.group.hydrate(json);
  }

  private save() {
    this.tabModel.saveFilterJson(this.group.toJSON());
  }
}
