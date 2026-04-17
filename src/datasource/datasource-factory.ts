import { IDataSource, DataSourceConfig, DataSourceType } from "./types";
import { RoamAlphaAPIAdapter } from "./adapters/roam-alpha-adapter";
import { LocalhostAPIAdapter } from "./adapters/localhost-adapter";

/**
 * 数据源工厂类
 * 负责创建数据源实例和管理回退机制
 */
export class DataSourceFactory {
  /**
   * 根据配置创建数据源实例
   * @param config - 数据源配置
   * @returns 数据源实例
   */
  static create(config: DataSourceConfig): IDataSource {
    const type = config.type || DataSourceType.LOCALHOST_API;

    switch (type) {
      case DataSourceType.LOCALHOST_API:
        return new LocalhostAPIAdapter(config);

      case DataSourceType.ROAM_ALPHA_API:
      default:
        return new RoamAlphaAPIAdapter();
    }
  }

  /**
   * 创建带回退机制的数据源
   * 当主要数据源失败时，自动回退到 RoamAlphaAPI
   * @param config - 数据源配置
   * @returns 带有回退机制的数据源实例
   */
  static createWithFallback(config: DataSourceConfig): IDataSource {
    const primaryDataSource = this.create(config);

    // 如果不是 Localhost API 或没有启用回退，直接返回
    if (
      config.type !== DataSourceType.LOCALHOST_API ||
      !config.fallbackToRoamAPI
    ) {
      return primaryDataSource;
    }

    // 创建带回退机制的数据源包装器
    return new FallbackDataSource(config);
  }
}

/**
 * 带回退机制的数据源包装器
 * 当 Localhost API 失败时，自动回退到 RoamAlphaAPI
 */
class FallbackDataSource implements IDataSource {
  private readonly primary: IDataSource;
  private readonly fallback: IDataSource;
  private useFallback: boolean = false;

  constructor(config: DataSourceConfig) {
    this.primary = new LocalhostAPIAdapter(config);
    this.fallback = new RoamAlphaAPIAdapter();
  }

  async query(query: string): Promise<unknown[]> {
    if (this.useFallback) {
      return this.fallback.query(query);
    }

    try {
      return await this.primary.query(query);
    } catch (error) {
      console.warn(
        "Primary data source failed, falling back to RoamAlphaAPI:",
        error
      );
      this.useFallback = true;
      return this.fallback.query(query);
    }
  }

  async queryWithArgs(query: string, ...args: unknown[]): Promise<unknown[]> {
    if (this.useFallback) {
      return this.fallback.queryWithArgs(query, ...args);
    }

    try {
      return await this.primary.queryWithArgs(query, ...args);
    } catch (error) {
      console.warn(
        "Primary data source failed, falling back to RoamAlphaAPI:",
        error
      );
      this.useFallback = true;
      return this.fallback.queryWithArgs(query, ...args);
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.useFallback) {
      return this.fallback.testConnection();
    }

    try {
      const connected = await this.primary.testConnection();
      if (!connected) {
        console.warn(
          "Primary data source connection test failed, using fallback"
        );
        this.useFallback = true;
      }
      return connected;
    } catch (error) {
      console.warn(
        "Primary data source connection test failed, using fallback:",
        error
      );
      this.useFallback = true;
      return this.fallback.testConnection();
    }
  }

  getType(): DataSourceType {
    return this.useFallback
      ? DataSourceType.ROAM_ALPHA_API
      : this.primary.getType();
  }
}

// 导出单例实例，用于在整个应用中共享
let _dataSourceInstance: IDataSource | null = null;

/**
 * 获取全局数据源实例
 * @param config - 可选的配置，仅在第一次调用时使用
 * @returns 数据源实例
 */
export function getDataSource(config?: DataSourceConfig): IDataSource {
  if (!_dataSourceInstance) {
    _dataSourceInstance = DataSourceFactory.createWithFallback(
      config || { type: DataSourceType.LOCALHOST_API }
    );
  }
  return _dataSourceInstance;
}

/**
 * 重置全局数据源实例
 * 用于测试或切换配置
 */
export function resetDataSource(): void {
  _dataSourceInstance = null;
}

/**
 * 设置新的数据源实例
 * @param config - 数据源配置
 */
export function setDataSource(config: DataSourceConfig): void {
  resetDataSource();
  _dataSourceInstance = DataSourceFactory.createWithFallback(config);
}
