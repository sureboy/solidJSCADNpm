const isNode = typeof process !== 'undefined' && !!process.versions?.node
let nodeParentPort: any = null
if (isNode) {
  try {
    nodeParentPort = (await import('node:worker_threads')).parentPort
  } catch {}
}

export const postMain =(msg: any, transfer?: Transferable[]) => {
  if (nodeParentPort) {
    transfer ? nodeParentPort.postMessage(msg, transfer) : nodeParentPort.postMessage(msg)
  } else {
    const w = self as unknown as Worker
    transfer ? w.postMessage(msg, transfer ) : w.postMessage(msg)
  }
}

export const onMainMessage = (handler: (data: any) => void) => {
  if (nodeParentPort) nodeParentPort.on('message', handler)
  else self.onmessage = (e: MessageEvent) => handler(e.data)
}
export const getTransferableList = (obj: any, transfer: Transferable[], seen = new WeakSet()): void => {
  if (obj === null || obj === undefined) return;
  
  // 基本类型直接跳过
  if (typeof obj !== 'object' && typeof obj !== 'function') return;
  
  // 防止循环引用
  if (seen.has(obj)) return;
  seen.add(obj);
  
  // ArrayBuffer - 直接转移
  if (obj instanceof ArrayBuffer) {
    if (!transfer.includes(obj)) transfer.push(obj);
    return;
  }
  
  // TypedArray / DataView - 转移底层 buffer
  if (ArrayBuffer.isView(obj)) {
    const buf = (obj as ArrayBufferView).buffer;
    if (!transfer.includes(buf)) transfer.push(buf);
    return;
  }
  
  // MessagePort、ImageBitmap、OffscreenCanvas 等
  if (
    (typeof MessagePort !== 'undefined' && obj instanceof MessagePort) ||
    (typeof ImageBitmap !== 'undefined' && obj instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas) ||
    (typeof ReadableStream !== 'undefined' && obj instanceof ReadableStream) ||
    (typeof WritableStream !== 'undefined' && obj instanceof WritableStream) ||
    (typeof TransformStream !== 'undefined' && obj instanceof TransformStream)
  ) {
    if (!transfer.includes(obj)) transfer.push(obj);
    return;
  }
  
  // 其他 Transferable 类型可以通过 Symbol.toStringTag 判断
  // 或使用 structuredClone 的检测方式
  
  // 递归处理普通对象和数组
  if (Array.isArray(obj)) {
    for (const item of obj) getTransferableList(item, transfer, seen);
    return;
  }
  
  // Map
  if (obj instanceof Map) {
    for (const [k, v] of obj) {
      getTransferableList(k, transfer, seen);
      getTransferableList(v, transfer, seen);
    }
    return;
  }
  
  // Set
  if (obj instanceof Set) {
    for (const v of obj) getTransferableList(v, transfer, seen);
    return;
  }
  
  // 普通对象
  for (const key of Object.keys(obj)) {
    getTransferableList(obj[key], transfer, seen);
  }
};
export function binaryReplacer( value: any): any|{
  __type:string,data:ArrayBuffer|ArrayBufferLike} {
  // 检测 ArrayBuffer
  if (value instanceof ArrayBuffer) {
    return {
      __type: 'ArrayBuffer',
      data:value
      //data: Array.from(new Uint8Array(value)), // 或转为 base64
    };
  }

  // 检测各种 TypedArray（Uint8Array, Int32Array, Float64Array 等）
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const typedArray = value as any;
    return {
      __type: typedArray.constructor.name, // 获取准确的类型名称，如 "Uint8Array"
      //data: Array.from(typedArray),
      data:value.buffer// as ArrayBuffer
    };
  }

  // 检测 Buffer（Node.js 环境）
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return {
      __type: 'Buffer',
      data:value.buffer// as ArrayBuffer
      //data: value.toString('base64'),
    };
  }

  return value;
}
