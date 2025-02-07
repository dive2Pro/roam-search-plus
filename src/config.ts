const constants = {
  "auto-close-shift-click": "auto-close-shift-click",
  tab: "tab",
  "auto-search": "auto-search",
};
let API: RoamExtensionAPI;
export const initSettings = (extensionAPI: RoamExtensionAPI) => {
  API = extensionAPI;
  extensionAPI.settings.panel.create({
    tabTitle: "Search+",
    settings: [
      {
        id: constants["auto-close-shift-click"],
        name: "Auto Close",
        description: "shift+ click will automatically close the search window",
        action: {
          type: "switch",
        },
      },
      {
        id: constants["auto-search"],
        name: "Auto Search",
        description:
          "After a 0.5-second pause in typing, the search will be automatically initiated. If you uncheck this option, you will need to manually trigger the search.",
        action: {
          type: "switch",
        },
      },
    ],
  });

  extensionAPI.settings.set(
    constants["auto-close-shift-click"],
    extensionAPI.settings.get(constants["auto-close-shift-click"]) ?? true
  );
  extensionAPI.settings.set(
    constants['auto-search'],
    extensionAPI.settings.get(constants["auto-search"]) ?? true
  );
};

export const isAutoCloseWhenShiftClick = () => {
  return API.settings.get(constants["auto-close-shift-click"]);
};


export const isAutoSearch = () => {
  return API.settings.get(constants["auto-search"]);
  
}