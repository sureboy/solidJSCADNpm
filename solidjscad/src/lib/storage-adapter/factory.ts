// factory.ts
import type { StorageOptions } from './types';
import  { StorageAdapter   } from './adapter';
import { OPFSStorage } from './opfs';
import { IDBStorage } from './idb';
import { NodeFSStorage } from './nodefs';
function isNode(): boolean {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
}
export function createStorage(options: StorageOptions = {}): StorageAdapter {
  const { dbName, storeName, baseDir, rootDir = '' } = options;

  if (!isNode()) {
    // 浏览器
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage) {
      return new OPFSStorage(rootDir);
    }
    // 降级 IndexedDB
    return new IDBStorage(
      dbName || 'FileStorage',
      storeName || 'files',
      rootDir
    );
  }
  // Node.js
  return new NodeFSStorage(baseDir || './storage', rootDir);
}