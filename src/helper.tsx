import { CacheBlockType, getCacheByUid } from "./roam";
import dayjs from "dayjs";
import { ResultItem } from "./store";

export const CONSTNATS = {
  el: "advanced-search-el",
  history: "as-history",
  leftSidebarMenu: "roam-sidebar-content",
  sidebarEl: "as-sidebar-el",
};
let uninstalls: Function[] = [];

export const extension_helper = {
  on_uninstall: (cb: Function) => {
    uninstalls.push(cb);
  },
  uninstall() {
    uninstalls.forEach((fn) => {
      fn();
    });
    uninstalls = [];
  },
};

export const debounce = <T, R>(cb: (...t: T[]) => R, ms = 500) => {
  let timeout: any;
  return (...t: T[]) => {
    return new Promise<R>((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        resolve(cb.apply(null, t));
        timeout = null;
      }, ms);
    });
  };
};

export function getSame<T>(arr1: T[], arr2: T[]) {
  return [...new Set(arr1)].filter((item) => arr2.includes(item));
}

export function getDiff<T>(arr1: T[], arr2: T[]) {
  return arr1.concat(arr2).filter((v, index, arr) => {
    return arr.indexOf(v) === arr.lastIndexOf(v);
  });
}

export const pull = (uidOrTitle: string) => {
  return getCacheByUid(uidOrTitle);
  // return (
  //   window.roamAlphaAPI.data.pull("[*]", [":block/uid", uidOrTitle]) ||
  //   window.roamAlphaAPI.data.pull("[*]", [":node/title", uidOrTitle])
  // );
};

export const pull_many = (uids: string[]) => {
  return uids
    .map((uid) => {
      const r = getCacheByUid(uid);
      return r;
    })
    .filter((item) => item);
  // return window.roamAlphaAPI.data.pull_many(
  //   "[*]",
  //   uids.map((uid) => {
  //     return [":block/uid", uid];
  //   })
  // );
};

export function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * 判断字符串是否包含中文字符
 */
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * 判断 keyword 是否是一个完整的单词
 * - 对于中文：每个字符通常就是一个词，所以判断是否是一个字符
 * - 对于拉丁语系：判断是否只包含字母（可能包含连字符等）
 */
export function isCompleteWord(keyword: string): boolean {
  if (!keyword) return false;

  // 如果包含中文字符，判断是否只有一个字符（中文通常一个字就是一个词）
  if (containsChinese(keyword)) {
    return keyword.length === 1;
  }

  // 对于拉丁语系，判断是否只包含字母、数字、连字符、下划线等单词字符
  // 如果 keyword 只包含这些字符，则认为可能是完整单词
  return /^[\w-]+$/.test(keyword);
}

export function toResultItem(item: ResultItem | CacheBlockType): ResultItem {
  if ("page" in item) {
    return {
      id: item.block[":block/uid"],
      text: item.block[":block/string"],
      editTime: item.block[":edit/time"] || item.block[":create/time"],
      createTime: item.block[":create/time"],
      createUser: item.block[":create/user"]?.[":db/id"],
      isPage: false,
      paths: [] as string[],
      isSelected: false,
      children: [],
    };
  }

  return item;
}

/**
 * 解析查询字符串，将被引号包裹的部分（包括引号）作为整体，引号外的部分按空格分割
 * 例如: "\" a b \" a b " -> ["\" a b \"", "a", "b"]
 */
export function parseQueryWords(query: string): string[] {
  const words: string[] = [];
  let i = 0;
  let currentWord = "";
  let inQuotes = false;

  while (i < query.length) {
    const char = query[i];
    const nextChar = i + 1 < query.length ? query[i + 1] : null;

    // 检查是否是转义的引号 \"
    if (char === "\\" && nextChar === '"') {
      currentWord += '\\"';
      i += 2;
      continue;
    }

    // 检查是否是引号开始或结束
    if (char === '"') {
      if (inQuotes) {
        // 引号结束，将整个引号块（包括引号）作为一个词
        currentWord += "";
        if (currentWord.trim().length > 0) {
          words.push(currentWord);
        }
        currentWord = "";
        inQuotes = false;
      } else {
        // 引号开始
        // 如果当前有未完成的词，先保存它
        if (currentWord.trim().length > 0) {
          words.push(currentWord.trim());
          currentWord = "";
        }
        currentWord = "";
        inQuotes = true;
      }
      i++;
      continue;
    }

    // 在引号内，直接添加到当前词
    if (inQuotes) {
      currentWord += char;
      i++;
      continue;
    }

    // 在引号外，按空格分割
    if (char === " " || char === "\t" || char === "\n") {
      if (currentWord.trim().length > 0) {
        words.push(currentWord.trim());
        currentWord = "";
      }
      i++;
      continue;
    }

    // 普通字符
    currentWord += char;
    i++;
  }

  // 处理最后一个词
  if (currentWord.trim().length > 0) {
    words.push(currentWord.trim());
  }

  return words.filter((word) => word.length > 0);
}

export function highlightText(
  text: string,
  words: string[],
  options?: {
    matchWholeWord?: boolean;
    caseIntensive?: boolean;
  }
) {
  if (text.indexOf("![](data:image") > -1) {
    return <>{text}</>;
  }
  // console.log({ text, words, options });
  const matchWholeWord = options?.matchWholeWord || false;
  const caseIntensive = options?.caseIntensive || false;

  let lastIndex = 0;

  if (words.length === 0) {
    return <>{text}</>;
  }

  // 构建正则表达式模式
  const patterns: string[] = [];

  for (const word of words) {
    const escapedWord = escapeRegExpChars(word);

    if (matchWholeWord) {
      const isKeywordCompleteWord = isCompleteWord(word);

      if (isKeywordCompleteWord) {
        if (containsChinese(word)) {
          // 中文：直接匹配字符
          patterns.push(escapedWord);
        } else {
          // 拉丁语系：使用单词边界
          patterns.push(`\\b${escapedWord}\\b`);
        }
      } else {
        // 如果不是完整单词，使用普通匹配
        patterns.push(escapedWord);
      }
    } else {
      // 普通匹配
      patterns.push(escapedWord);
    }
  }

  const flags = caseIntensive ? "g" : "gi";
  const regexp = new RegExp(patterns.join("|"), flags);
  const tokens: React.ReactNode[] = [];

  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(
      <span className="result-highlight" key={lastIndex}>
        {match[0]}
      </span>
    );
  }

  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return <>{tokens}</>;
}

export const date = {
  fromNow(time: number) {
    // TODO: 有一些页面没有 edit time 和 create time. 使用第一个 child 的时间
    if (!dayjs(time).isValid()) {
      return "";
    }
    return dayjs(time).fromNow();
  },
  format(time: number, str = "HH:mm MMM DD, YYYY") {
    if (!dayjs(time).isValid()) {
      return "";
    }
    return dayjs(time).format("HH:mm MMM DD, YYYY");
  },
};

export const clone = <T,>(obj: T) => {
  return JSON.parse(JSON.stringify(obj)) as T;
};

export function simulateClick(a: Element) {
  "mouseover mousedown mouseup click".split(" ").forEach((type) => {
    a.dispatchEvent(
      new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1,
      })
    );
  });
}

export function timer(name: string) {
  console.time(name);
  return () => {
    console.timeEnd(name);
  };
}

// export function cacheBlockToUiResult(block: CacheBlockType) {
//   return {
//     id: block.block[":block/uid"],
//     text: block.block[":block/string"],
//     editTime: block.block[":edit/time"] || block.block[":create/time"],
//     createTime: block.block[":create/time"],
//     isPage: false,
//     // paths: block.parents.map(
//     //   (item) => item[":block/string"] || item[":node/title"]
//     // ),
//     paths: [],
//     isSelected: false,
//     children: [],
//     createUser: block.block[":create/user"]?.[":db/id"],
//   };
// }
