import { getCacheByUid } from "./roam";
import dayjs from "dayjs";
import { ReactNode } from "react";

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

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function checkChinese(str: string) {
  var reg = new RegExp(
    "([\u4E00-\u9FFF]|[\u3002\uff1b\uff0c\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300b\uff01\u3010\u3011\uffe5])+",
    "g"
  );
  return reg.test(str);
}

export const includes = (config: {
  source: string;
  target: string;
  exactly: boolean;
  caseIntensive: boolean;
}) => {
  const _includes = (source: string, target: string) => {
    if (!source) {
      return false;
    }
    if (config.exactly) {
      if (checkChinese(target)) {
        if (config.caseIntensive) {
          return source.includes(target);
        } else {
          return source.toLowerCase().includes(target.toLowerCase());
        }
      } else {
        if (config.caseIntensive) {
          const reg = new RegExp("\\b" + target + "\\b", "g");
          return reg.test(source); //  source.includes(target);
        } else {
          const reg = new RegExp("\\b" + target.toLowerCase() + "\\b", "gi");
          return reg.test(source.toLowerCase());
          // return source.toLowerCase().includes(target.toLowerCase());
        }
      }
    }

    if (config.caseIntensive) {
      return source.includes(target);
    } else {
      return source.toLowerCase().includes(target.toLowerCase());
    }
  };
  return _includes(config.source, config.target);
};

export function highlightText(
  text: string,
  query: string,
  isCaseIntensive: boolean = true,
  isExactly: boolean = false,
  tokens: ReactNode[] = []
) {
  if (text.indexOf("![](data:image") > -1) {
    return text;
  }
  let lastIndex = 0;
  let words = query
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return <>{text}</>;
  }
  const chunks: [number, number][] = [];
  if (isExactly) {
    words = words.filter((word) => {
      if (checkChinese(word)) {
        return true;
      } else {
        let regexp: RegExp;
        if (isCaseIntensive) {
          regexp = new RegExp("\\b" + word + "\\b", "gi");
        } else {
          regexp = new RegExp("\\b" + word.toLowerCase() + "\\b", "g");
        }
        const match = regexp.exec(text);
        if (match) {
          const length = match[0].length;
          const before = text.slice(lastIndex, regexp.lastIndex - length);
          chunks.push([regexp.lastIndex - length, regexp.lastIndex]);
          if (before.length > 0) {
            // tokens.push(before);
          }
          console.log(word, match);
          lastIndex = regexp.lastIndex;
          // tokens.push(
          //   <span className="result-highlight" key={lastIndex}>
          //     {match[0]}
          //   </span>
          // );
        }
        return false;
      }
    });
  }
  console.log(words, " -", tokens);

  const regexp = new RegExp(
    words.join("|"),
    "g" + (isCaseIntensive ? "i" : "")
  );
  while (true && words.length) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      // tokens.push(before);
    }
    // chunks.push([regexp.lastIndex, regexp.lastIndex + length]);
    chunks.push([regexp.lastIndex - length, regexp.lastIndex]);
    console.log(regexp.lastIndex, " ---- ", regexp);
    lastIndex = regexp.lastIndex;
    // tokens.push(
    //   <span className="result-highlight" key={lastIndex}>
    //     {match[0]}
    //   </span>
    // );
  }

  const rest = text.slice(lastIndex);
  const sortedChunks = chunks
    .sort((chunkA, chunkB) => {
      return chunkA[0] - chunkB[0];
    })
    .reverse();
  lastIndex = text.length;
  sortedChunks.forEach((chunk) => {
    tokens.unshift(text.slice(chunk[1], lastIndex));
    tokens.unshift(
      <span className="result-highlight" key={lastIndex}>
        {text.slice(chunk[0], chunk[1])}
      </span>
    );
    lastIndex = chunk[0];
  });
  console.log(chunks, " === chunks === ", sortedChunks, text, lastIndex);

  if (lastIndex > 0) {
    tokens.unshift(text.slice(0, lastIndex));
  }
  return tokens;
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
