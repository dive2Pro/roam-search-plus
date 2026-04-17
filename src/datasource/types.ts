/**
 * 数据源接口
 * 所有数据源适配器必须实现此接口
 */
export interface IDataSource {
  /**
   * 执行查询
   * @param query - Datalog 查询字符串
   * @returns 查询结果数组
   */
  query(query: string): Promise<unknown[]>;

  /**
   * 执行带参数的查询
   * @param query - Datalog 查询字符串（包含 :in 子句）
   * @param args - 查询参数
   * @returns 查询结果数组
   */
  queryWithArgs(query: string, ...args: unknown[]): Promise<unknown[]>;

  /**
   * 测试数据源连接是否正常
   * @returns 连接是否成功
   */
  testConnection(): Promise<boolean>;

  /**
   * 获取数据源类型
   */
  getType(): DataSourceType;
}

/**
 * 数据源类型枚举
 */
export enum DataSourceType {
  /** Roam 浏览器内 API（默认） */
  ROAM_ALPHA_API = "roam-alpha-api",
  /** 本地 HTTP API (localhost:3333) */
  LOCALHOST_API = "localhost-api",
}

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  /** 数据源类型 */
  type: DataSourceType;
  /** Localhost API URL（仅当 type 为 LOCALHOST_API 时使用） */
  localhostUrl?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否启用回退机制（当 Localhost API 失败时回退到 RoamAlphaAPI） */
  fallbackToRoamAPI?: boolean;
}

/**
 * Localhost API 请求格式
 */
export interface LocalhostApiRequest {
  /** 操作类型，如 "data.q" */
  action: string;
  /** 参数数组，第一个元素是查询字符串，后面是查询参数 */
  args: unknown[];
}

/**
 * Localhost API 响应格式
 */
export interface LocalhostApiResponse {
  /** 是否成功 */
  success: boolean;
  /** 查询结果 */
  data?: unknown[];
  /** 错误信息 */
  error?: string;
}
