// idb.ts
import type { ListDirectoryOptions,WriteStream,  EntryInfo, Encoding } from './types';
import  { StorageAdapter   } from './adapter';

export class IDBStorage extends StorageAdapter {
  private db: IDBDatabase | null = null;
  private storeName: string;
  private rootPrefix: string;
  private dbName:string;

  constructor(dbName = 'FileStorage', storeName = 'files', rootPrefix = '') {
    super();
    this.dbName = dbName
    this.storeName = storeName;
    this.rootPrefix = rootPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'path' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.openDB();
    }
    return this.db;
  }

  private normalizePath(path: string): string {
    const full = this.rootPrefix ? `${this.rootPrefix}/${path}` : path;
    return full.replace(/\/+/g, '/');
  }

  async readFile(path: string, encoding: Encoding = 'utf8'): Promise<string | ArrayBuffer> {
    const db = await this.getDB();
    const key = this.normalizePath(path);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result as { path: string; data: Blob | string } | undefined;
        if (!record) return reject(new Error('文件不存在'));
        const data = record.data;
        if (encoding === 'utf8') {
          if (data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(data);
          } else {
            resolve(data);
          }
        } else {
          if (data instanceof Blob) {
            resolve(data.arrayBuffer());
          } else {
            resolve(new TextEncoder().encode(data).buffer);
          }
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async writeFile(path: string, data: string | ArrayBuffer | Uint8Array | Blob): Promise<void> {
    const db = await this.getDB();
    const key = this.normalizePath(path);
    const parts = key.split('/');
    if (parts.length !== 2) throw new Error('路径必须为 目录/文件名');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      let recordData: Blob | string;
      if (typeof data === 'string') {
        recordData = new Blob([data], { type: 'text/plain' });
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        recordData = new Blob([data as any]);
      } else if (data instanceof Blob) {
        recordData = data;
      } else {
        return reject(new Error('不支持的数据类型'));
      }
      store.put({ path: key, data: recordData });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.getDB();
    const key = this.normalizePath(path);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async fileExists(path: string): Promise<boolean> {
    const db = await this.getDB();
    const key = this.normalizePath(path);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const count = store.count(key);
      count.onsuccess = () => resolve(count.result > 0);
      count.onerror = () => reject(count.error);
    });
  }

  async listDirectories(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result as string[];
        const dirSet = new Set<string>();
        for (const key of keys) {
          const parts = key.split('/');
          if (parts.length >= 1) {
            // 如果 key 是 "dir/file" 或 "dir"，取第一部分
            const dirName = parts[0];
            if (dirName) dirSet.add(dirName);
          }
        }
        resolve(Array.from(dirSet));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async listFilesInDirectory(dir: string, options: ListDirectoryOptions={}): Promise<EntryInfo[]> {
    const db = await this.getDB();
    const prefix = this.normalizePath(dir) + '/';
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const req = store.getAll(range);
      req.onsuccess = () => {
        const records = req.result as { path: string; data: Blob | string }[];
        const files = records.map(rec => {
          const name = rec.path.slice(prefix.length);
          return {
            name,
            isFile: true,
            isDirectory: false,
            // 由于未存储大小和时间，返回 undefined
          };
        });
        resolve(files);
      };
      req.onerror = () => reject(req.error);
    });
  }
  // idb.ts
  async deleteDirectory(dir: string): Promise<void> {
    const db = await this.getDB();
    const prefix = this.normalizePath(dir) + '/';
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const req = store.delete(range);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async createWriteStream(path: string): Promise<WriteStream> {
    const chunks: (string | Uint8Array)[] = [];
    return {
      write: async (chunk) => { chunks.push(chunk); },
      close: async () => {
        const data = chunks.reduce((acc, chunk) => {
          if (typeof chunk === 'string') return acc + chunk;
          // 如果是 Uint8Array，合并
          const totalLen = acc.length + chunk.length;
          const combined = new Uint8Array(totalLen);
          if (typeof acc === 'string') {
            // 将字符串转为 Uint8Array
            const enc = new TextEncoder();
            combined.set(enc.encode(acc), 0);
            combined.set(chunk, acc.length);
            return combined;
          } else {
            combined.set(acc, 0);
            combined.set(chunk, acc.length);
            return combined;
          }
        }, new Uint8Array(0));
        // 最终写入
        await this.writeFile(path, data);
      },
      abort: async () => { chunks.length = 0; },
    };
  }
}