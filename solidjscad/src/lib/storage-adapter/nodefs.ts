// nodefs.ts
import * as fs from 'fs';
import * as path from 'path';
import type { ListDirectoryOptions, WriteStream, EntryInfo, Encoding } from './types';
import  { StorageAdapter   } from './adapter';

export class NodeFSStorage extends StorageAdapter {
  private baseDir: string;
  private rootPrefix: string;

  constructor(baseDir = './storage', rootPrefix = '') {
    super();
    this.baseDir = path.resolve(baseDir);
    this.rootPrefix = rootPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getRealPath(relPath: string): string {
    const full = this.rootPrefix ? `${this.rootPrefix}/${relPath}` : relPath;
    const resolved = path.join(this.baseDir, full);
    const relative = path.relative(this.baseDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('路径遍历攻击');
    }
    return resolved;
  }

  async readFile(relPath: string, encoding: Encoding = 'utf8'): Promise<string | Buffer> {
    const real = this.getRealPath(relPath);
    return encoding === 'utf8' ? fs.promises.readFile(real, 'utf8') : fs.promises.readFile(real);
  }

  async writeFile(relPath: string, data: string | ArrayBuffer | Uint8Array | Buffer): Promise<void> {
    const real = this.getRealPath(relPath);
    const dir = path.dirname(real);
    await fs.promises.mkdir(dir, { recursive: true });
    let buffer: Buffer | string;
    if (typeof data === 'string') {
      buffer = data;
    } else if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      buffer = Buffer.from(data);
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else {
      throw new Error('不支持的数据类型');
    }
    await fs.promises.writeFile(real, buffer);
  }

  async deleteFile(relPath: string): Promise<void> {
    const real = this.getRealPath(relPath);
    await fs.promises.unlink(real);
  }

  async fileExists(relPath: string): Promise<boolean> {
    const real = this.getRealPath(relPath);
    try {
      await fs.promises.access(real, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectories(): Promise<string[]> {
    const base = this.rootPrefix ? path.join(this.baseDir, this.rootPrefix) : this.baseDir;
    try {
      const entries = await fs.promises.readdir(base, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }
  }

  async listFilesInDirectory(dir: string, options: ListDirectoryOptions={}): Promise<EntryInfo[]> {
    const realDir = this.getRealPath(dir);
    if (options.create) {
      await fs.promises.mkdir(realDir, { recursive: true });
    }
    try {
      const entries = await fs.promises.readdir(realDir, { withFileTypes: true });
      const files: EntryInfo[] = [];
      for (const e of entries) {
        if (e.isFile()) {
          const stat = await fs.promises.stat(path.join(realDir, e.name));
          files.push({
            name: e.name,
            isFile: true,
            isDirectory: false,
            size: stat.size,
            lastModified: stat.mtimeMs,
          });
        }
        // 忽略子目录
      }
      return files;
    } catch {
      return [];
    }
  }

  // nodefs.ts
  async deleteDirectory(dir: string): Promise<void> {
    const realDir = this.getRealPath(dir);
    try {
      // 递归删除目录及其所有内容（包括子目录）
      await fs.promises.rm(realDir, { recursive: true, force: true });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // 目录不存在，忽略
        return;
      }
      throw err;
    }
  }
  async createWriteStream(relPath: string): Promise<WriteStream> {
    const realPath = this.getRealPath(relPath);
    const dir = path.dirname(realPath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    const stream = fs.createWriteStream(realPath);
    
    return {
      write: (chunk: string | Uint8Array) => {
        return new Promise<void>((resolve, reject) => {
          const canContinue = stream.write(chunk);
          if (canContinue) {
            resolve();
          } else {
            // 背压，等待 drain 事件
            stream.once('drain', resolve);
            stream.once('error', reject);
          }
        });
      },
      close: () => {
        return new Promise<void>((resolve, reject) => {
          stream.end((err:any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      },
      abort: (reason?: any) => {
        return new Promise<void>((resolve, reject) => {
          stream.destroy(reason);
          stream.once('close', resolve);
          stream.once('error', reject);
        });
      },
    };
  }
}