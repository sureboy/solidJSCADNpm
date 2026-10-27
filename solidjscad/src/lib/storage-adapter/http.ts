// http.ts

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public body?: unknown,
  ) {
    super(`HTTP ${status} ${statusText} - ${url}`);
    this.name = 'HttpError';
  }
}

export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'stream' | 'none';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** query 参数，自动拼接（数组会展开成重复 key） */
  params?: Record<string, any>;
  /** 超时毫秒，0 表示不超时，默认 15000 */
  timeout?: number;
  /** 期望的响应类型，默认 json */
  responseType?: ResponseType;
  /** 请求体：普通对象自动 JSON 序列化 */
  body?: any;
  method?: string;
}

const DEFAULTS = {
  timeout: 15_000,
  responseType: 'json' as ResponseType,
};

function appendParams(url: string, params?: Record<string, any>): string {
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      search.append(key, String(v));
    }
  }
  const qs = search.toString();
  return qs ? url + (url.includes('?') ? '&' : '?') + qs : url;
}

function serializeBody(body: any, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  ) {
    return body as BodyInit;
  }
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

async function parseResponse(res: Response, type: ResponseType): Promise<any> {
  switch (type) {
    case 'none':
      return undefined;
    case 'text':
      return res.text();
    case 'blob':
      return res.blob();
    case 'arrayBuffer':
      return res.arrayBuffer();
    case 'stream':
      return res.body;
    case 'json':
    default: {
      const text = await res.text();
      if (!text) return undefined;
      try {
        return JSON.parse(text);
      } catch {
        return text; // 非 JSON 时降级为文本
      }
    }
  }
}

async function readErrorBody(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

/** 核心请求方法 */
export async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    timeout = DEFAULTS.timeout,
    responseType = DEFAULTS.responseType,
    body,
    headers,
    method = 'GET',
    ...init
  } = options;

  const finalUrl = appendParams(url, params);
  const finalHeaders = new Headers(headers);
  const payload = serializeBody(body, finalHeaders);

  const controller = new AbortController();
  const timer =
    timeout > 0
      ? setTimeout(
          () => controller.abort(new DOMException('Request timeout', 'TimeoutError')),
          timeout,
        )
      : undefined;

  let signal: AbortSignal = controller.signal;
  if (init.signal) {
    const anyFn = (AbortSignal as any).any as
      | ((signals: AbortSignal[]) => AbortSignal)
      | undefined;
    signal = anyFn ? anyFn([init.signal, controller.signal]) : init.signal;
  }

  try {
    const res = await fetch(finalUrl, {
      ...init,
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    });

    if (!res.ok) {
      throw new HttpError(res.status, res.statusText, finalUrl, await readErrorBody(res));
    }
    return (await parseResponse(res, responseType)) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* -------------------- 便捷方法 -------------------- */

type NoBodyOptions = Omit<RequestOptions, 'method' | 'body'>;

export function get<T = any>(url: string, options: NoBodyOptions = {}): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' });
}

export function post<T = any>(url: string, body?: any, options: NoBodyOptions = {}): Promise<T> {
  return request<T>(url, { ...options, method: 'POST', body });
}

export function put<T = any>(url: string, body?: any, options: NoBodyOptions = {}): Promise<T> {
  return request<T>(url, { ...options, method: 'PUT', body });
}

export function patch<T = any>(url: string, body?: any, options: NoBodyOptions = {}): Promise<T> {
  return request<T>(url, { ...options, method: 'PATCH', body });
}

export function del<T = any>(url: string, options: NoBodyOptions = {}): Promise<T> {
  return request<T>(url, { ...options, method: 'DELETE' });
}

/* -------------------- 带 baseURL 的工厂 -------------------- */

export interface HttpClientConfig {
  baseURL?: string;
  headers?: HeadersInit;
  timeout?: number;
  /** 请求拦截：可修改 url / options */
  onRequest?: (url: string, options: RequestOptions) => { url?: string; options?: RequestOptions } | void;
  /** 响应拦截 */
  onResponse?: (res: Response, data: any) => void;
  onError?: (err: unknown) => void;
}

export function createHttp(config: HttpClientConfig = {}) {
  const joinURL = (url: string) => {
    if (!config.baseURL || /^[a-z][a-z\d+\-.]*:\/\//i.test(url)) return url;
    return config.baseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
  };

  const mergeHeaders = (h?: HeadersInit) => {
    const res = new Headers(config.headers);
    if (h) new Headers(h).forEach((v, k) => res.set(k, v));
    return res;
  };

  const run = async <T>(url: string, opts: RequestOptions): Promise<T> => {
    let finalUrl = joinURL(url);
    let finalOpts: RequestOptions = {
      timeout: config.timeout,
      ...opts,
      headers: mergeHeaders(opts.headers),
    };

    if (config.onRequest) {
      const patched = config.onRequest(finalUrl, finalOpts);
      if (patched?.url) finalUrl = patched.url;
      if (patched?.options) finalOpts = { ...finalOpts, ...patched.options };
    }

    try {
      const data = await request<T>(finalUrl, finalOpts);
      return data;
    } catch (err) {
      config.onError?.(err);
      throw err;
    }
  };

  return {
    request: run,
    get: <T = any>(url: string, opts: NoBodyOptions = {}) =>
      run<T>(url, { ...opts, method: 'GET' }),
    post: <T = any>(url: string, body?: any, opts: NoBodyOptions = {}) =>
      run<T>(url, { ...opts, method: 'POST', body }),
    put: <T = any>(url: string, body?: any, opts: NoBodyOptions = {}) =>
      run<T>(url, { ...opts, method: 'PUT', body }),
    patch: <T = any>(url: string, body?: any, opts: NoBodyOptions = {}) =>
      run<T>(url, { ...opts, method: 'PATCH', body }),
    delete: <T = any>(url: string, opts: NoBodyOptions = {}) =>
      run<T>(url, { ...opts, method: 'DELETE' }),
  };
}