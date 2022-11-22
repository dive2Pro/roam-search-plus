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
