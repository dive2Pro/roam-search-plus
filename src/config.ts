import { DataSourceType } from "./datasource/types";

const constants = {
  "auto-close-shift-click": "auto-close-shift-click",
  tab: "tab",
  "auto-search": "auto-search",
  "data-source-type": "data-source-type",
  "localhost-api-url": "localhost-api-url",
  "data-source-timeout": "data-source-timeout",
  "enable-fallback": "enable-fallback",
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
      {
        id: constants["data-source-type"],
        name: "Data Source",
        description: "Choose the data source: Roam Browser API (default) or Localhost API",
        action: {
          type: "select",
          options: [
            {
              value: DataSourceType.ROAM_ALPHA_API,
              label: "Roam Browser API",
            },
            {
              value: DataSourceType.LOCALHOST_API,
              label: "Localhost API",
            },
          ],
        },
      },
      {
        id: constants["localhost-api-url"],
        name: "Localhost API URL",
        description: "The URL of the localhost API server (only used when Data Source is Localhost API)",
        action: {
          type: "text",
        },
      },
      {
        id: constants["data-source-timeout"],
        name: "Data Source Timeout (ms)",
        description: "Request timeout in milliseconds for Localhost API",
        action: {
          type: "text",
        },
      },
      {
        id: constants["enable-fallback"],
        name: "Enable Fallback",
        description: "Automatically fall back to Roam Browser API if Localhost API fails",
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
  // 数据源配置默认值
  extensionAPI.settings.set(
    constants["data-source-type"],
    extensionAPI.settings.get(constants["data-source-type"]) ?? DataSourceType.ROAM_ALPHA_API
  );
  extensionAPI.settings.set(
    constants["localhost-api-url"],
    extensionAPI.settings.get(constants["localhost-api-url"]) ?? "http://localhost:3333/query"
  );
  extensionAPI.settings.set(
    constants["data-source-timeout"],
    extensionAPI.settings.get(constants["data-source-timeout"]) ?? "30000"
  );
  extensionAPI.settings.set(
    constants["enable-fallback"],
    extensionAPI.settings.get(constants["enable-fallback"]) ?? true
  );
};

export const isAutoCloseWhenShiftClick = () => {
  return API.settings.get(constants["auto-close-shift-click"]);
};


export const isAutoSearch = () => {
  return API.settings.get(constants["auto-search"]);
};

/**
 * 获取数据源配置
 */
export const getDataSourceConfig = () => {
  const type = API.settings.get(constants["data-source-type"]) as DataSourceType;
  const localhostUrl = API.settings.get(constants["localhost-api-url"]) as string;
  const timeout = parseInt(API.settings.get(constants["data-source-timeout"]) as string, 10);
  const fallbackToRoamAPI = API.settings.get(constants["enable-fallback"]) as boolean;
  return {
    type: DataSourceType.LOCALHOST_API,
    localhostUrl: "http://localhost:3333/api/thoughtfull",
    timeout: isNaN(timeout) ? 30000 : timeout,
    fallbackToRoamAPI: fallbackToRoamAPI !== undefined ? fallbackToRoamAPI : true,
  };
};
