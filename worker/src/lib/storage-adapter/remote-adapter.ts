// remote-adapter.ts
import {
  //StorageAdapter,
  Encoding,
  EntryInfo,
  ListDirectoryOptions,
  WriteStream,
} from './types';
import  { StorageAdapter   } from './adapter'; 
import { request, RequestOptions, HttpError } from './http.js';

type HeadersProvider = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

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

const trimSlashes = (p: string) => p.replace(/^\/+|\/+$/g, '');

function defaultEndpoints(baseUrl: string): RemoteEndpoints {
  const base = baseUrl.replace(/\/$/, '');
  const u = (p: string) => base + p;
  const q = (path: string) => `path=${encodeURIComponent(trimSlashes(path))}`;
  return {
    readFile:            (path)         => u(`/file?${q(path)}`),
    writeFile:           (path)         => u(`/file?${q(path)}`),
    deleteFile:          (path)         => u(`/file?${q(path)}`),
    fileExists:          (path)         => u(`/file?${q(path)}`),
    writeStream:         (path)         => u(`/file/stream?${q(path)}`),
    listDirectories:     ()             => u(`/dirs`),
    listFilesInDirectory:(dir, create)  => u(`/dir?${q(dir)}${create ? '&create=1' : ''}`),
    deleteDirectory:     (dir)          => u(`/dir?${q(dir)}`),
  };
}

export class RemoteStorageAdapter extends StorageAdapter {
  private readonly ep: RemoteEndpoints;
  private readonly headers?: HeadersProvider;
  private readonly timeout: number;

  constructor(options: RemoteStorageOptions = {}) {
    super();
    this.ep = { ...defaultEndpoints(options.baseUrl ?? ''), ...options.endpoints };
    this.headers = options.headers;
    this.timeout = options.timeout ?? 30_000;
  }

  /* ---------------- 内部工具 ---------------- */

  private async resolveHeaders(extra?: HeadersInit): Promise<HeadersInit> {
    const base = typeof this.headers === 'function' ? await this.headers() : this.headers;
    const h = new Headers(base);
    if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
    return h;
  }

  private async req<T>(url: string, opts: RequestOptions): Promise<T> {
    const headers = await this.resolveHeaders(opts.headers);
    return request<T>(url, { timeout: this.timeout, ...opts, headers });
  }

  private toNodeBuffer(data: ArrayBuffer): ArrayBuffer | Buffer {
    // 浏览器下 Buffer 未定义，直接返回 ArrayBuffer
    return typeof Buffer !== 'undefined' ? Buffer.from(data) : data;
  }

  /* ---------------- 读 ---------------- */

  async readFile(
    path: string,
    encoding?: Encoding,
  ): Promise<string | ArrayBuffer | Buffer> {
    const url = this.ep.readFile(path);

    if (encoding === 'utf8') {
      return this.req<string>(url, { method: 'GET', responseType: 'text' });
    }

    const buf = await this.req<ArrayBuffer>(url, {
      method: 'GET',
      responseType: 'arrayBuffer',
    });
    return this.toNodeBuffer(buf);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.req(this.ep.fileExists(path), { method: 'HEAD', responseType: 'none' });
      return true;
    } catch (err) {
      if (err instanceof HttpError && (err.status === 404 || err.status === 410)) {
        return false;
      }
      throw err;
    }
  }

  /* ---------------- 写 ---------------- */

  async writeFile(
    path: string,
    data: string | ArrayBuffer | Uint8Array | Blob,
  ): Promise<void> {
    await this.req(this.ep.writeFile(path), {
      method: 'POST',
      body: data,          // request 内部会原样透传 string/BufferSource/Blob
      responseType: 'none',
    });
  }

  async createWriteStream(path: string): Promise<WriteStream> {
    const url = this.ep.writeStream(path);
    const headers = new Headers(await this.resolveHeaders());
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/octet-stream');
    }

    const abortCtrl = new AbortController();

    let ctrl!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) { ctrl = c; },
    });

    const init: RequestInit & { duplex?: 'half' } = {
      method: 'POST',
      headers,
      body,
      signal: abortCtrl.signal,
      duplex: 'half',        // Node(undici) 流式上传必须
    };

    // 立即发起请求（不 await），边写边传
    const respPromise = fetch(url, init).then(async (res) => {
      if (!res.ok) {
        let detail: unknown;
        try {
          const text = await res.text();
          detail = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : undefined;
        } catch { /* ignore */ }
        throw new HttpError(res.status, res.statusText, url, detail);
      }
      return res;
    });
    // 避免未处理拒绝（close/abort 时再 await 它）
    respPromise.catch(() => {});

    let settled = false;

    return {
      write: async (chunk: string | Uint8Array) => {
        if (settled) throw new Error('write stream already closed');
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
        ctrl.enqueue(bytes);
      },
      close: async () => {
        if (settled) return;
        settled = true;
        ctrl.close();
        await respPromise;       // 服务端确认成功才算写完
      },
      abort: async (reason?: any) => {
        if (settled) return;
        settled = true;
        try { ctrl.error(reason); } catch { /* ignore */ }
        abortCtrl.abort(reason);
        try { await respPromise; } catch { /* 已取消，忽略 */ }
      },
    };
  }

  /* ---------------- 删除 ---------------- */

  async deleteFile(path: string): Promise<void> {
    await this.req(this.ep.deleteFile(path), {
      method: 'DELETE',
      responseType: 'none',
    });
  }

  async deleteDirectory(dir: string): Promise<void> {
    await this.req(this.ep.deleteDirectory(dir), {
      method: 'DELETE',
      responseType: 'none',
    });
  }

  /* ---------------- 列表 ---------------- */

  async listDirectories(): Promise<string[]> {
    const res = await this.req<string[] | { directories: string[] }>(
      this.ep.listDirectories(),
      { method: 'GET' },
    );
    return Array.isArray(res) ? res : (res?.directories ?? []);
  }

  async listFilesInDirectory(
    dir: string,
    options?: ListDirectoryOptions,
  ): Promise<EntryInfo[]> {
    const res = await this.req<EntryInfo[] | { files: EntryInfo[] }>(
      this.ep.listFilesInDirectory(dir, options?.create === true),
      { method: 'GET' },
    );
    return Array.isArray(res) ? res : (res?.files ?? []);
  }
}