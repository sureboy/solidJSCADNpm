// types.ts
export type Encoding = 'utf8' | 'buffer' | null;

export interface EntryInfo {
  name: string;           // 文件或目录名
  isFile: boolean;
  isDirectory: boolean;
  size?: number;          // 仅文件有
  lastModified?: number;  // 仅文件有
}

export interface StorageOptions {
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