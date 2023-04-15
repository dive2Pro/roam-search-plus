let graphLoaded = false;

export function isGraphLoaded() {
    return graphLoaded === true;
}

export function setGraphLoaded(loaded: boolean) {
    graphLoaded = loaded;
}