import { IDataSource, DataSourceType } from "../types";

/**
 * RoamAlphaAPI 数据源适配器
 * 封装浏览器内 window.roamAlphaAPI.data.fast.q 调用
 */
export class RoamAlphaAPIAdapter implements IDataSource {
  /**
   * 执行查询
   * @param query - Datalog 查询字符串
   * @returns 查询结果数组
   */
  async query(query: string): Promise<unknown[]> {
    // window.roamAlphaAPI.data.fast.q 是同步的，包装为 Promise
    const result = window.roamAlphaAPI.data.fast.q(query);
    return result as unknown[];
  }

  /**
   * 执行带参数的查询
   * @param query - Datalog 查询字符串（包含 :in 子句）
   * @param args - 查询参数
   * @returns 查询结果数组
   */
  async queryWithArgs(query: string, ...args: unknown[]): Promise<unknown[]> {
    // window.roamAlphaAPI.data.fast.q 是同步的，包装为 Promise
    const result = window.roamAlphaAPI.data.fast.q(query, ...args);
    return result as unknown[];
  }

  /**
   * 测试连接
   * RoamAlphaAPI 在浏览器环境中总是可用的
   */
  async testConnection(): Promise<boolean> {
    try {
      // 执行一个简单的查询来测试连接
      const result = window.roamAlphaAPI.data.fast.q(`
        [:find ?e .
         :where [?e :block/uid]]
        LIMIT 1
      `);
      return result !== undefined;
    } catch (error) {
      console.error("RoamAlphaAPI connection test failed:", error);
      return false;
    }
  }

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType {
    return DataSourceType.ROAM_ALPHA_API;
  }
}
