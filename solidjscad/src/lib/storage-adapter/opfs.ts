// opfs.ts
import type { ListDirectoryOptions, WriteStream, EntryInfo, Encoding } from './types';
import  { StorageAdapter   } from './adapter'; 
export class OPFSStorage extends StorageAdapter {
  private root: FileSystemDirectoryHandle | null = null;
  private rootPrefix: string; // 如 'myapp/data'

  constructor(rootPrefix = '') {
    super();
    this.rootPrefix = rootPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  private async ensureRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.root) {
      this.root = await navigator.storage.getDirectory();
    }
    return this.root;
  }

  private normalizePath(path: string): string {
    const full = this.rootPrefix ? `${this.rootPrefix}/${path}` : path;
    return full.replace(/\/+/g, '/');
  }

  private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    const root = await this.ensureRoot();
    const parts = this.normalizePath(path).split('/').filter(p => p.length > 0);
    if (parts.length !== 2) throw new Error('路径必须为 目录/文件名');
    const [dirName, fileName] = parts;
    const dirHandle = await root.getDirectoryHandle(dirName, { create });
    return dirHandle.getFileHandle(fileName, { create });
  }

  async readFile(path: string, encoding: Encoding = 'utf8'): Promise<string | ArrayBuffer> {
    const handle = await this.getFileHandle(path);
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    return encoding === 'utf8' ? new TextDecoder().decode(buffer) : buffer;
  }

  async writeFile(path: string, data: string | ArrayBuffer | Uint8Array | Blob): Promise<void> {
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    let blob: Blob;
    if (typeof data === 'string') {
      blob = new Blob([data], { type: 'text/plain' });
    } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      blob = new Blob([data as any]);
    } else if (data instanceof Blob) {
      blob = data;
    } else {
      throw new Error('不支持的数据类型');
    }
    await writable.write(blob);
    await writable.close();
  }

  async deleteFile(path: string): Promise<void> {
    const root = await this.ensureRoot();
    const parts = this.normalizePath(path).split('/').filter(p => p.length > 0);
    if (parts.length !== 2) throw new Error('路径必须为 目录/文件名');
    const [dirName, fileName] = parts;
    const dirHandle = await root.getDirectoryHandle(dirName);
    await dirHandle.removeEntry(fileName);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileHandle(path);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectories(): Promise<string[]> {
    const root = await this.ensureRoot();
    const prefix = this.rootPrefix ? this.rootPrefix.split('/') : [];
    let current = root;
    for (const seg of prefix) {
      current = await current.getDirectoryHandle(seg);
    }
    const dirs: string[] = [];
    for await (const [name, handle] of current.entries()) {
      if (handle.kind === 'directory') dirs.push(name);
    }
    return dirs;
  }

  async listFilesInDirectory(dir: string, options: ListDirectoryOptions={} ): Promise<EntryInfo[]> {
    const root = await this.ensureRoot();
    const dirPath = this.normalizePath(dir);
    const parts = dirPath.split('/').filter(p => p.length > 0);
    if (parts.length !== 1) throw new Error('目录路径必须为一级目录名');
    const [dirName] = parts;
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await root.getDirectoryHandle(dirName,{ create: options?.create ?? false });
    } catch(err) {
      // 如果目录不存在且 create 为 false，返回空数组
      if (!options?.create) return [];
      throw err // 如果 create 为 true 但创建失败，则抛出
    }
    const entries: EntryInfo[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        entries.push({
          name,
          isFile: true,
          isDirectory: false,
          size: file.size,
          lastModified: file.lastModified,
        });
      }
      // 忽略子目录（只返回文件）
    }
    return entries;
  }

  async deleteDirectory(dir: string): Promise<void> {
    const root = await this.ensureRoot();
    const dirPath = this.normalizePath(dir);
    const parts = dirPath.split('/').filter(p => p.length > 0);
    
    if (parts.length !== 1) {
      throw new Error('目录路径必须为一级目录名');
    }
    
    const [dirName] = parts;
    
    // 获取父级目录句柄
    let parent = root;
    if (this.rootPrefix) {
      const prefixParts = this.rootPrefix.split('/').filter(p => p);
      for (const seg of prefixParts) {
        parent = await parent.getDirectoryHandle(seg);
      }
    }
    
    // 直接删除目录，recursive: true 会递归删除所有内容
    await parent.removeEntry(dirName, { recursive: true });
  }
  async createWriteStream(path: string): Promise<WriteStream> {
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    return {
      write: (chunk: string | Uint8Array) => writable.write(chunk as any),
      close: () => writable.close(),
      abort: (reason?: any) => writable.abort(reason),
    };
  }
}