import { batch, observable, observe } from "@legendapp/state";
import { ResultItem } from "./store";


const query = observable({
  result: [] as ResultItem[],
  list: [] as ResultItem[],
});


let _result: ResultItem[] = [];
const setResult = (result: ResultItem[]) => {
  _result = result;
  query.result.set([]);
};

const pushToResult = (result: ResultItem[]) => {
  _result = _result.concat(result)
  query.result.set([])
}


const getResult = () => {
  query.result.get();
  return _result;
};


export const queryResult = {
    setResult,
    pushToResult,
    getResult
}


