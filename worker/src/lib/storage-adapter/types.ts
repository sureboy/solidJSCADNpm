// types.ts
export type Encoding = 'utf8' | 'buffer' | null;

export interface EntryInfo {
  name: string;           // 文件或目录名
  isFile: boolean;
  isDirectory: boolean;
  size?: number;          // 仅文件有
  lastModified?: number;  // 仅文件有
}
export interface RemoteEndpoints {
  readFile: (path: string) => string;
  writeFile: (path: string) => string;
  deleteFile: (path: string) => string;
  fileExists: (path: string) => string;
  writeStream: (path: string) => string;
  listDirectories: () => string;
  listFilesInDirectory: (dir: string, create: boolean) => string;
  deleteDirectory: (dir: string) => string;
}
export type HeadersProvider = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

export interface RemoteStorageOptions {
  /** 服务端根地址，如 'https://api.example.com/storage'；默认 ''（同源） */
  baseUrl?: string;
  /** 静态头，或返回头的函数（每次请求都会调用，适合动态 token） */
  headers?: HeadersProvider;
  /** 请求超时（ms），0 表示不超时，默认 30s */
  timeout?: number;
  /** 自定义端点映射，不传则用默认 REST 约定 */
  endpoints?: Partial<RemoteEndpoints>;
}
export interface StorageOptions {
  remote? :RemoteStorageOptions;
  dbName?: string;        // IndexedDB 数据库名（浏览器用）
  storeName?: string;     // IndexedDB 存储对象名（浏览器用，默认 'files'）
  baseDir?: string;       // Node.js 基础目录（默认 './storage'）
  rootDir?: string;       // 浏览器端根路径前缀（可选，用于隔离数据）
}
export interface ListDirectoryOptions {
  create?: boolean;  // 目录不存在时是否自动创建
}
export interface WriteStream {
  write(chunk: string | Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(reason?: any): Promise<void>;
}