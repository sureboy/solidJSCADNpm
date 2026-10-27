// adapter.ts
import type {EntryInfo,Encoding,ListDirectoryOptions,WriteStream} from "./types.ts"
export abstract class StorageAdapter {
  abstract readFile(path: string, encoding?: Encoding): Promise<string | ArrayBuffer | Buffer>;
  abstract writeFile(path: string, data: string | ArrayBuffer | Uint8Array | Blob): Promise<void>;
  abstract deleteFile(path: string): Promise<void>;
  abstract fileExists(path: string): Promise<boolean>;
  
  /** 列出所有一级目录名 */
  abstract listDirectories(): Promise<string[]>;
  
  /** 列出指定目录下的所有文件（不含子目录，因为不支持） */
  abstract listFilesInDirectory(dir: string, options?: ListDirectoryOptions): Promise<EntryInfo[]>;

  abstract deleteDirectory(dir: string): Promise<void>;
  abstract createWriteStream(path: string): Promise<WriteStream>;
}