// ========== 类型定义 ==========

/** 支持的二进制字段类型 */
export type BinaryValue =
  | ArrayBuffer
  | Float32Array
  | Uint16Array
  | Uint32Array
  | Uint8Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float64Array;

/** 编码时二进制字段的占位符 */
interface BufferRef {
  __buf: number;
  __t:BinaryTypeName;
}

/** 编码时内部收集的 buffer 描述 */
interface BufferEntry {
  index: number;
  type: BinaryTypeName;
  byteLength: number;
  view: Uint8Array;
}

/** 可序列化的类型名 */
type BinaryTypeName =
  | 'ArrayBuffer'
  | 'Float32Array'
  | 'Uint16Array'
  | 'Uint32Array'
  | 'Uint8Array'
  | 'Int8Array'
  | 'Int16Array'
  | 'Int32Array'
  | 'Float64Array';

/** 类型名 -> 构造器 的白名单映射 */
const TYPED_ARRAY_CTORS = {
  Float32Array,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float64Array,
} as const;

type TypedArrayName = keyof typeof TYPED_ARRAY_CTORS;

const isTypedArrayName = (name: string): name is TypedArrayName =>
  name in TYPED_ARRAY_CTORS;

/** 判断是否为受支持的二进制类型 */
function isBinaryValue(value: unknown): value is BinaryValue {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

/** 获取二进制类型名 */
function getBinaryTypeName(value: BinaryValue): BinaryTypeName {
  if (value instanceof ArrayBuffer) return 'ArrayBuffer';
  const name = value.constructor.name;
  if (isTypedArrayName(name)) return name;
  throw new TypeError(`Unsupported binary type: ${name}`);
}
const CHUNK_SIZE = 16 * 1024;
const BUFFER_LOW_THRESHOLD = 256 * 1024;
//const SEND_TIMEOUT = 60_000;

const HEADER_SIZE = 13;
const FLAG_LAST = 0x01;
const MAX_PAYLOAD = CHUNK_SIZE - HEADER_SIZE;

let nextMsgId = 1;

export async function sendChunked(
  channel: RTCDataChannel,
  buffer: ArrayBuffer,
  //signal?: AbortSignal
) { 
  await  doSend(channel, buffer); 
}

async function doSend(
  channel: RTCDataChannel,
  buffer: ArrayBuffer,
  //signal?: AbortSignal
)  {
  if (channel.readyState !== 'open') {
    throw new Error('DataChannel is not open');
  }
  const totalLen = buffer.byteLength;
  if (totalLen === 0) throw new Error('empty payload');

  const msgId = nextMsgId++ >>> 0;
  if (nextMsgId > 0xFFFFFFFF) nextMsgId = 1;

  const view = new Uint8Array(buffer);
  const totalChunks = Math.ceil(totalLen / MAX_PAYLOAD);

  channel.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;

  //const deadline = Date.now() + SEND_TIMEOUT;

  for (let seq = 0; seq < totalChunks; seq++) {
    //if (signal?.aborted) throw new Error('aborted');
    //if (channel.readyState !== 'open') throw new Error('DataChannel closed');
    //if (Date.now() > deadline) throw new Error('send timeout');

    const offset = seq * MAX_PAYLOAD;
    const isLast = seq === totalChunks - 1;
    const payloadLen = isLast ? totalLen - offset : MAX_PAYLOAD;

    const frame = new Uint8Array(HEADER_SIZE + payloadLen);
    const fv = new DataView(frame.buffer);
    fv.setUint32(0, msgId, true);
    fv.setUint32(4, seq, true);
    fv.setUint32(8, totalLen, true);
    fv.setUint8(12, isLast ? FLAG_LAST : 0);
    frame.set(view.subarray(offset, offset + payloadLen), HEADER_SIZE);

    await waitForDrain(channel);
    channel.send(frame);
  }
}
 async function waitForDrain(channel: RTCDataChannel): Promise<void> {
  if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) return;
  await new Promise<void>((resolve, reject) => {
    const onLow = () => { cleanup(); resolve(); };
    const onClose = () => { cleanup(); reject(new Error('closed')); };
    const cleanup = () => {
      channel.removeEventListener('bufferedamountlow', onLow);
      channel.removeEventListener('close', onClose);
    };
    channel.addEventListener('bufferedamountlow', onLow, { once: true });
    channel.addEventListener('close', onClose, { once: true });
  });
}
type StreamState = {
  msgId: number;
  totalLen: number;
  totalChunks: number  ;
  full:Uint8Array<ArrayBuffer>;
  parts: Set<number>; 
  update:number;
  //del?:()=>void;
};

const streams = new Map<number, StreamState>();
const STREAM_TIMEOUT = 30_000;
const MAX_MESSAGE_SIZE = 16 * 1024 * 1024;
let timeoutInterval:ReturnType<typeof setInterval> | undefined;
const startTimeoutSweeper = ()=>{
  if (timeoutInterval!==undefined)return
  timeoutInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, st] of streams) {
    if (now - st.update > STREAM_TIMEOUT) {
      console.warn(`[rtc] msg ${id} timeout, discarded (have ${st.parts.size}/${st.totalChunks ?? '?'})`);
      streams.delete(id);
    }
  }
  if (streams.size===0){
    if (timeoutInterval !== undefined) {
      clearInterval(timeoutInterval)
      timeoutInterval = undefined
    }
  }

}, 10_000);

}
export const channelMessage = async (
  ev: MessageEvent,
  postMessage: (obj: unknown) => void | Promise<void>
) => {
  const data = ev.data;
  let frame: Uint8Array;
  if (data instanceof ArrayBuffer) {
    frame = new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    const v = data as ArrayBufferView;
    frame = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
    frame = new Uint8Array(await data.arrayBuffer());
  } else {
    console.warn('[rtc] unexpected frame type', data);
    return;
  }

  if (frame.byteLength < HEADER_SIZE) {
    console.warn('[rtc] frame too short', frame.byteLength);
    return;
  }

  const fv = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const msgId = fv.getUint32(0, true);
  const seq = fv.getUint32(4, true);
  const totalLen = fv.getUint32(8, true);
  if (totalLen === 0 || totalLen > MAX_MESSAGE_SIZE) {
    console.warn(`[rtc] msg ${msgId} invalid totalLen ${totalLen}`);
    return;
  }
  //const isLast = (fv.getUint8(12) & FLAG_LAST) !== 0;
  const payload = frame.subarray(HEADER_SIZE);
  if (payload.byteLength > MAX_PAYLOAD) {
    console.warn(`[rtc] msg ${msgId} seq ${seq} payload too large ${payload.byteLength}`);
    return;
  }
 
  // 空 payload 只有在 totalLen === 0 时合法，但我们已经禁止空消息
  if (payload.byteLength === 0) {
    console.warn(`[rtc] msg ${msgId} seq ${seq} empty payload`); 
    return;
  } 
  let st = streams.get(msgId); 
  if (st && st.totalLen !== totalLen) {
    console.warn(`[rtc] msg ${msgId} totalLen conflict (${st.totalLen} vs ${totalLen}), discarding old`); 
    streams.delete(msgId);
    st = undefined;
  }

  if (!st) {
    st = {
      msgId,
      totalLen,
      update:0,
      totalChunks: Math.ceil(totalLen / MAX_PAYLOAD),
      parts: new Set(),
      full :new Uint8Array(totalLen),  
    };
    console.log("totalLen",totalLen/(1024*1024))
    streams.set(msgId, st);
    startTimeoutSweeper();
  }else{
    if (st.parts.has(seq)) {
      console.warn(`[rtc] msg ${msgId} duplicate seq ${seq}, ignoring`);
      return;
    }
  }
  if ( seq >=  st.totalChunks ) {
    console.warn(`[rtc] msg ${msgId} seq ${seq} out of range`);
    return;
  }
 
  const offset = seq*MAX_PAYLOAD
  if ((offset + payload.byteLength) > totalLen){
    console.warn(`[rtc] msg ${msgId} seq ${seq} overflow`);
    //st.del?.();
    streams.delete(msgId);
    return;
  }
 
  st.full.set(payload,offset) 
  st.parts.add(seq );
  st.update = Date.now()
  if (st.parts.size!== st.totalChunks)return ;
  //streams.delete(msgId);
  //st.del?.()
  streams.delete(msgId);
  let obj: unknown;
  try {
    obj = decodeMessage(st.full.buffer,true);
  } catch (e) {
    console.error(`[rtc] msg ${msgId} decode failed`, e);
    return;
  }

  try {
    await postMessage(obj);
  } catch (e) {
    console.error(`[rtc] msg ${msgId} postMessage failed`, e);
  }
   
};

// ========== 解码 ==========

/** 判断是否为占位符 */
function isBufferRef(node: unknown): node is BufferRef {
  return (
    typeof node === 'object' &&
    node !== null &&
    '__buf' in node &&
    typeof (node as BufferRef).__buf === 'number'
  );
}
function restoreTyped(type: BinaryTypeName, bytes: Uint8Array): BinaryValue {
  if (type === 'ArrayBuffer') return bytes.slice().buffer;
  const Ctor = TYPED_ARRAY_CTORS[type as TypedArrayName];
  if (bytes.byteLength % Ctor.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Invalid byteLength for ${type}`);
  }
  return new Ctor(bytes.slice().buffer) as BinaryValue;
}
/**
 * 将 ArrayBuffer 还原为原始对象
 * @param buffer 编码后的数据
 * @param copy 是否复制二进制数据（默认 true，避免共享大包内存）
 */
export function decodeMessage<T = unknown>(
  buffer: ArrayBuffer,
  copy = true
): T {
  const view = new DataView(buffer);
  let offset = 0;

  const metaLen = view.getUint32(offset, true);
  offset += 4;
  const meta = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, offset, metaLen))
  ) as unknown;
  offset += metaLen;

  const restore = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(restore);

    if (node !== null && typeof node === 'object') {
      if (isBufferRef(node)) {
        /*
        const len = view.getUint32(offset, true);
        offset += 4;
        const slice = new Uint8Array(buffer, offset, len);
        offset += len;
        return copy ? slice.slice() : slice;
 */
       
        const len = view.getUint32(offset, true);
        offset += 4;
        const slice = new Uint8Array(buffer, offset, len);
        offset += len;
        const bytes = copy ? slice.slice() : slice;
        return restoreTyped(node.__t, bytes);
       /*
        //const bytes = copy ? slice.slice() : slice;

        // 需要知道类型：占位符里没存类型，所以类型信息必须从 meta 结构里还原
        // —— 见下方说明，这里改为读取编码时写入的类型
        //return bytes.buffer;

        if (copy) {
          return slice.slice().buffer;
        }
        // 不复制，但只返回该块对应的精确范围
        return buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);*/
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        result[key] = restore((node as Record<string, unknown>)[key]);
      }
      return result;
    }

    return node;
  };

  return restore(meta) as T;
}


export function encodeMessage(obj: unknown): ArrayBuffer {
  const buffers: BufferEntry[] = [];

  // 1. 序列化，二进制字段替换为占位符
  const meta = JSON.parse(
    JSON.stringify(obj, (_key, value: unknown) => {
      if (isBinaryValue(value)) {
        const view =
          value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        const index = buffers.length;
        buffers.push({
          index,
          type: getBinaryTypeName(value),
          byteLength: view.byteLength,
          view,
        });
        const ref: BufferRef = { __buf: index, __t: getBinaryTypeName(value) };
        //const ref: BufferRef = { __buf: index };
        return ref;
      }
      return value;
    })
  );

  // 2. 计算总大小
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  let total = 4 + metaBytes.byteLength;
  for (const b of buffers) total += 4 + b.byteLength;

  // 3. 写入
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  let offset = 0;

  view.setUint32(offset, metaBytes.byteLength, true);
  offset += 4;
  new Uint8Array(out, offset, metaBytes.byteLength).set(metaBytes);
  offset += metaBytes.byteLength;

  for (const b of buffers) {
    view.setUint32(offset, b.byteLength, true);
    offset += 4;
    new Uint8Array(out, offset, b.byteLength).set(b.view);
    offset += b.byteLength;
  }

  return out;
}

