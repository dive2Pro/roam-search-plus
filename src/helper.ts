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

export const debounce = <T, R>(cb: (t: T) => R, ms = 500) => {
  let timeout: any;
  return (t: T) => {
    return new Promise<R>((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        resolve(cb.call(null, t));
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


export const pull = (uid: string) => {
  return window.roamAlphaAPI.data.pull("[*]", [":block/uid", uid]);
};

export const pull_many = (uids: string[]) => {
  return window.roamAlphaAPI.data.pull_many(
    "[*]",
    uids.map((uid) => {
      return [":block/uid", uid];
    })
  );
};

