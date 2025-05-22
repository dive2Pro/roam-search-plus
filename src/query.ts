import { transaction } from "mobx";
import { pull, timer } from "./helper";
import {
  CacheBlockType, // May become obsolete if lowLevelBlocks is fully removed or its type changes
  // getAllBlocks, // No longer directly used by findBlocksContainsAllKeywords
  // isUnderTag, // No longer directly used by findBlocksContainsAllKeywords
  fetchPagesByCriteria,
  fetchBlocksByCriteria, // Added import
  QueryConfig as RoamQueryConfig,
} from "./roam";
import { ResultItem } from "./store";
import { queryResult } from "./result";
class ChunkProcessor {
  isRunning = false;
  constructor() {}

  start<T>(
    items: T[],
    processItem: (v: T) => void,
    chunkSize = 2500,
    onChunkCallback: (p: number) => void
  ) {
    return new Promise((resolve) => {
      this.isRunning = true;
      let index = 0;

      const process = () => {
        if (!this.isRunning) return;

        const chunk = items.slice(index, index + chunkSize);
        chunk.forEach(processItem);

        index += chunkSize;
        onChunkCallback(index);
        if (index < items.length) {
          setTimeout(process);
        } else {
          resolve(1);
        }
      };

      setTimeout(process);
    });
  }

  stop() {
    console.warn("find all stop!!!!");
    this.isRunning = false;
  }
}

class NotifyProgress {
  _percent = -1;
  callback = (p: number) => {};

  on(callback: (p: number) => void) {
    this.callback = callback;
  }

  reset() {
    this.notify(0);
  }

  notify(percent: number) {
    this._percent = percent;
    this.callback(this._percent);
  }

  finish() {
    this._percent = 100;
    this.callback(100);
  }

  started() {
    return this._percent !== -1;
  }

  isFinished() {
    return this._percent === 100;
  }
}

export const notifier = new NotifyProgress();
export const Query = (
  config: RoamQueryConfig, // Changed to RoamQueryConfig for consistency
  // getAllBlocksFn parameter is no longer needed by findBlocksContainsAllKeywords
  // getAllPagesFn parameter is no longer needed by findAllRelatedPageUids
) => {
  console.time("SSSS");
  notifier.reset();
  // 使用示例
  // const processor = new ChunkProcessor(); // No longer needed for findBlocksContainsAllKeywords

  const keywords = config.search;
  // const hasKeywords = keywords.some((key) => !!key); // No longer needed here, Datalog handles keyword presence
  const includes = (p: string, n: string, caseIntensive: boolean) => {
    if (!p) {
      return false;
    }
    if (caseIntensive) {
      return p.includes(n);
    } else {
      return p.toLowerCase().includes(n.toLowerCase());
    }
  };

  // 要把那些
  const findBlocksContainsAllKeywords = async (
    searchKeywords: string[], // Renamed for clarity
    queryConfig: RoamQueryConfig
  ): Promise<[ResultItem[]]> => { // Return type changed
    const endTimer = timer("findBlocksContainsAllKeywords (Datalog)");
    // notifier.notify(26); // Example: blocks search starts after pages (25%)
    // ChunkProcessor and manual iteration removed

    const fetchedBlocks = fetchBlocksByCriteria(searchKeywords, queryConfig);

    // notifier.notify(50); // Example: after fetching blocks, before mapping

    const resultItems: ResultItem[] = fetchedBlocks.map((block) => ({
      id: block.uid,
      text: block.string,
      editTime: block.editTime || block.createTime,
      createTime: block.createTime,
      isPage: false,
      createUser: block.createUser?.[":db/id"],
      paths: [] as string[],
      isSelected: false,
      children: [] as any[],
      pageUid: block.pageUid // Populate pageUid
    }));

    endTimer();
    // notifier.notify(60); // Example: completion of block processing stage
    return [resultItems]; // Return as a tuple with one element
  };
  // const timemeasure = (name: string, cb: () => void) => { // Removed
  //   console.time(name);
  //   cb();
  //   console.timeEnd(name);
  // };

  async function findAllRelatedBlocks(
    directResults: ResultItem[], // Combined results (pages and top-level blocks)
    searchKeywords: string[], // Renamed from 'keywords' to avoid conflict with outer scope
    queryConfig: RoamQueryConfig
  ): Promise<ResultItem[]> {
    const endTimer = timer("findAllRelatedBlocks (Datalog)");
    notifier.notify(65); // Start of this phase

    if (searchKeywords.length === 0) {
      // No keywords, no context to find
      notifier.finish();
      return [];
    }

    const pageUidsToSearchIn = [
      ...new Set(
        directResults.map((item) => (item.isPage ? item.id : item.pageUid)).filter(Boolean) as string[]
      ),
    ];

    if (pageUidsToSearchIn.length === 0) {
      // No pages to search within
      notifier.finish();
      return [];
    }

    const directResultUids = directResults.map((item) => item.id);

    let keywordConditions = searchKeywords
      .map((keyword) => {
        const processedKeyword = keyword.replace(/"/g, '\\"'); // Escape double quotes
        if (queryConfig.caseIntensive) {
          return `(clojure.string/includes? ?string "${processedKeyword}")`;
        } else {
          return `(clojure.string/includes? (clojure.string/lower-case ?string) "${processedKeyword.toLowerCase()}")`;
        }
      })
      .join(" ");

    // Build Datalog query to find context blocks
    let DatalogQuery = `[
      :find [(pull ?b [:block/uid :block/string {:block/page [:block/uid]} :edit/time :create/time :create/user]) ...]
      :in $ [?page_uid ...] [?direct_result_uid ...]
      :where
        [?b :block/string ?string]
        [?b :block/page ?p]
        [?p :block/uid ?page_uid]
        (or ${keywordConditions})
        (not [(contains? (set ?direct_result_uid) [?b :block/uid])])
    ]`;
    
    // console.log("Context Datalog Query:", DatalogQuery, pageUidsToSearchIn, directResultUids);

    const contextBlocksRaw = window.roamAlphaAPI.data.fast.q(
      DatalogQuery,
      pageUidsToSearchIn,
      directResultUids
    ) as unknown as { 
        ":block/uid": string;
        ":block/string": string;
        ":block/page": { ":block/uid": string }; // Page UID is now directly available
        ":edit/time"?: number;
        ":create/time": number;
        ":create/user"?: { ":db/id": number };
      }[];
    
    notifier.notify(85);

    const contextResultItems: ResultItem[] = contextBlocksRaw.map((block) => ({
      id: block[":block/uid"],
      text: block[":block/string"],
      editTime: block[":edit/time"] || block[":create/time"],
      createTime: block[":create/time"],
      isPage: false,
      createUser: block[":create/user"]?.[":db/id"],
      paths: [] as string[],
      isSelected: false,
      children: [] as any[],
      pageUid: block[":block/page"]?.[":block/uid"], // Directly access page UID
    }));

    // The old code grouped by page and then created ResultItems for pages that contained context.
    // This new approach directly finds context blocks. If we need to represent the "Page with context" structure,
    // we'd need to group contextResultItems by pageUid and then create page-level ResultItems containing these blocks as children.
    // For now, let's assume flat context blocks are fine.
    // If grouping is needed:
    // const groupedByPage = new Map<string, ResultItem[]>();
    // contextResultItems.forEach(item => {
    //   if (!item.pageUid) return;
    //   if (!groupedByPage.has(item.pageUid)) groupedByPage.set(item.pageUid, []);
    //   groupedByPage.get(item.pageUid)!.push(item);
    // });
    // const finalContextItems: ResultItem[] = [];
    // groupedByPage.forEach((blocks, pageUid) => {
    //   const pageDetails = window.roamAlphaAPI.pull("[:node/title :create/time :edit/time :create/user]", [":block/uid", pageUid]);
    //   finalContextItems.push({
    //     id: pageUid,
    //     text: pageDetails?.[":node/title"] || "Page Title Missing",
    //     isPage: true,
    //     createTime: pageDetails?.[":create/time"],
    //     editTime: pageDetails?.[":edit/time"] || pageDetails?.[":create/time"],
    //     createUser: pageDetails?.[":create/user"]?.[":db/id"],
    //     children: blocks,
    //     paths: [],
    //     isSelected: false,
    //   });
    // });
    // queryResult.pushToResult(finalContextItems);
    // notifier.finish();
    // endTimer();
    // return finalContextItems;
    
    queryResult.pushToResult(contextResultItems); // Pushing flat context blocks for now
    notifier.finish();
    endTimer();
    return contextResultItems;
  }

  async function findAllRelatedPageUids(
    searchKeywords: string[], // Renamed to avoid conflict with outer scope 'keywords'
    queryConfig: RoamQueryConfig
  ): Promise<[ResultItem[]]> { // Return type changed
    const endTimer = timer("findAllRelatedPageUids (Datalog)");
    notifier.notify(5); // Initial notification for this stage

    // Call the new Datalog-based fetch function
    const fetchedPages = fetchPagesByCriteria(searchKeywords, queryConfig);

    notifier.notify(15); // Notify after fetching, before mapping (adjust percentage as needed)

    const resultItems: ResultItem[] = fetchedPages.map((page) => ({
      id: page.uid,
      text: page.title,
      editTime: page.editTime || page.createTime, // Ensure fallback if editTime is null
      createTime: page.createTime,
      isPage: true,
      paths: [] as string[],
      isSelected: false,
      children: [] as any[], // Children will be populated by later stages if necessary
      createUser: page.createUser?.[":db/id"], // Safely access :db/id
    }));

    // Sort by exact match to the top, if applicable
    const exactMatchSearchString = queryConfig.search.join("");
    resultItems.sort((a, b) => {
      if (a.text === exactMatchSearchString) return -1;
      if (b.text === exactMatchSearchString) return 1;
      // Add other sorting criteria if needed, e.g., by editTime
      // return b.editTime - a.editTime; // Example: sort by most recent editTime
      return 0;
    });

    endTimer();
    notifier.notify(25); // Completion of this stage (e.g. pages found up to 25% of total work)
    return [resultItems]; // Return as a tuple containing a single array
  }

  // const ary = search.map(k => getBlocksContainsStr(k)).sort((a, b) => a.length - b.length);
  const promise = Promise.all([
    findAllRelatedPageUids(keywords, config).then((result) => {
      queryResult.setResult(result[0]); // These are pages that are direct hits
      return result; // [ResultItem[]]
    }),
    findBlocksContainsAllKeywords(keywords, config).then((res) => {
      queryResult.pushToResult(res[0]); // These are blocks that are direct hits
      notifier.notify(60); 
      return res; // This is now [ResultItem[]]
    }),
  ]).then(([[pagesResult], [topLevelBlocksResult]]) => {
    const directHits = [...pagesResult, ...topLevelBlocksResult];
    // Now call findAllRelatedBlocks with all direct hits (pages and blocks)
    // and the original keywords and config to find further context.
    return findAllRelatedBlocks(directHits, keywords, config).then(
      (contextItems) => { // contextItems are the blocks found on the same pages as directHits
        // The final result set is pagesResult (direct page hits), 
        // topLevelBlocksResult (direct block hits), and contextItems.
        // queryResult already has pagesResult and topLevelBlocksResult.
        // findAllRelatedBlocks has pushed contextItems to queryResult.
        // So, the collection in queryResult is complete.
        // The return value of Query.promise should reflect all three sets.
        return [pagesResult, topLevelBlocksResult, contextItems] as const;
      }
    );
  });

  return {
    promise: promise.then((result) => {
      console.timeEnd("SSSS");
      return result;
    }),
    stop: () => {
      processor.stop();
    },
  };
};
