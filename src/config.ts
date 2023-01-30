const constants = {
  "auto-close-shift-click": "auto-close-shift-click",
  tab: 'tab'
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
    ],
  });

  extensionAPI.settings.set(
    constants["auto-close-shift-click"],
    extensionAPI.settings.get(constants["auto-close-shift-click"]) ?? true
  );
};

export const isAutoCloseWhenShiftClick = () => {
  return API.settings.get(constants["auto-close-shift-click"])
};
