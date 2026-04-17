import {
  IDataSource,
  DataSourceType,
  LocalhostApiRequest,
  LocalhostApiResponse,
  DataSourceConfig,
} from "../types";

/**
 * Localhost API 数据源适配器
 * 通过 HTTP 请求与 localhost:3333 API 通信
 */
export class LocalhostAPIAdapter implements IDataSource {
  private readonly url: string;
  private readonly timeout: number;

  constructor(config: Partial<DataSourceConfig> = {}) {
    this.url = config.localhostUrl || "http://localhost:3333/api/my-graph";
    this.timeout = config.timeout || 30000; // 默认 30 秒超时
  }

  /**
   * 执行查询
   * @param query - Datalog 查询字符串
   * @returns 查询结果数组
   */
  async query(query: string): Promise<unknown[]> {
    const requestBody: LocalhostApiRequest = {
      action: "data.q",
      args: [query],
    };

    const response = await this.fetchWithTimeout(requestBody);
    return this.transformResponse(response);
  }

  /**
   * 执行带参数的查询
   * @param query - Datalog 查询字符串（包含 :in 子句）
   * @param args - 查询参数
   * @returns 查询结果数组
   */
  async queryWithArgs(query: string, ...args: unknown[]): Promise<unknown[]> {
    const requestBody: LocalhostApiRequest = {
      action: "data.q",
      args: [query, ...args],
    };

    const response = await this.fetchWithTimeout(requestBody);
    return this.transformResponse(response);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query(`
        [:find ?e .
         :where [?e :block/uid]]
        LIMIT 1
      `);
      return result !== undefined;
    } catch (error) {
      console.error("Localhost API connection test failed:", error);
      return false;
    }
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return DataSourceType.LOCALHOST_API;
  }

  /**
   * 发送带超时的 HTTP 请求
   */
  private async fetchWithTimeout(
    requestBody: LocalhostApiRequest
  ): Promise<LocalhostApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LocalhostApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error from Localhost API");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            `Localhost API request timeout after ${this.timeout}ms`
          );
        }
        throw error;
      }

      throw new Error("Unknown error during Localhost API request");
    }
  }

  /**
   * 转换 Localhost API 响应格式为与 RoamAlphaAPI 一致的格式
   *
   * Localhost API 的响应格式可能与 window.roamAlphaAPI.data.fast.q 不同
   * 此方法负责将 API 响应转换为兼容格式
   *
   * @param apiResponse - Localhost API 的原始响应
   * @returns 转换后的数据格式
   */
  private transformResponse(apiResponse: LocalhostApiResponse): unknown[] {
    if (!apiResponse.data) {
      return [];
    }

    // 如果 API 返回的数据格式已经与 RoamAlphaAPI 一致，直接返回
    // 这里假设 API 已经返回了正确的格式
    // 如果实际 API 格式不同，需要在此处添加转换逻辑

    // 示例：如果 API 返回的是包装后的格式，需要解包
    // const rawData = apiResponse.data;
    // return rawData.map((item: unknown) => {
    //   // 转换逻辑
    //   return item;
    // });

    return apiResponse.data;
  }
}
