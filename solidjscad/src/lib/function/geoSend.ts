import {type csgObj } from "#lib/function/csg2Three.js";
import {type GeometryMeta,
  MAX_PAYLOAD,
  FLAG_META,
  ATTR_META,
  ATTR_POSITION,
  ATTR_NORMAL,
  ATTR_COLOR,
  ATTR_INDEX,
  FLAG_LAST,
  HEADER_SIZE,
  HDR_MSG_ID,
  HDR_SEQ,
  HDR_TOTAL_LEN,
  HDR_FLAGS,
  HDR_ATTR_ID,
  HDR_RESERVED,
  HDR_OFFSET
 } from "#lib/function/geometry-protocol.js";


//const CHUNK_SIZE  = 64 * 1024;
//const MAX_PAYLOAD = CHUNK_SIZE - HEADER_SIZE;
let nextMsgId = 1;
function toAB(x: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (x instanceof ArrayBuffer) return x;
  if (x.byteOffset === 0 && x.byteLength === x.buffer.byteLength) {
    return x.buffer as ArrayBuffer;
  }
  return x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength) as ArrayBuffer;
}

export async function sendGeometry(
  channel: {send:(db:any)=>void},
  obj: csgObj,
  options: { smooth?: boolean } = {}
): Promise<void> {
  //if (channel.readyState !== 'open') throw new Error('DataChannel is not open');
  //return;
  const positionBuf = toAB(obj.vertices);
  const normalBuf   = obj.normals ? toAB(obj.normals) : null;
  const colorBuf    = obj.colors  ? toAB(obj.colors)  : null;
  const indexBuf    = obj.indices ? toAB(obj.indices) : null;
  //  console.log(1)
 // return ;
  // 索引类型：与 csg2Geo 判断保持一致
  const useUint16 = indexBuf != null
    && positionBuf.byteLength / 12 <= 65535
    && indexBuf.byteLength <= 65535 * 2;

  const meta: GeometryMeta = {
    attributes: {
      position: { byteLength: positionBuf.byteLength, componentType: 'Float32' },
      normal:   normalBuf ? { byteLength: normalBuf.byteLength, componentType: 'Float32' } : null,
      color:    colorBuf ? {
        byteLength: colorBuf.byteLength,
        componentType: 'Float32',
        itemSize: obj.isTransparent ? 4 : 3,
      } : null,
      index:    indexBuf ? {
        byteLength: indexBuf.byteLength,
        componentType: useUint16 ? 'Uint16' : 'Uint32',
      } : null,
    },
    material: {
      type: obj.type || 'mesh',
      color: (obj.color as any) ?? null,
      opacity: obj.opacity,
      isTransparent: obj.isTransparent,
    },
    smooth: options.smooth ?? false,
  };

  const msgId = nextMsgId++ >>> 0;
  if (nextMsgId > 0xFFFFFFFF) nextMsgId = 1;

  const totalLen =
    positionBuf.byteLength +
    (normalBuf?.byteLength ?? 0) +
    (colorBuf?.byteLength ?? 0) +
    (indexBuf?.byteLength ?? 0);

  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  let seq = 0;

  // 1. meta 帧
  await sendFrame(channel, msgId, seq++, totalLen, FLAG_META, ATTR_META, 0, metaBytes);

  // 2. position 必须先发完，索引才能引用它们
  seq = await sendAttr(channel, msgId, seq, totalLen, ATTR_POSITION, positionBuf);
  if (normalBuf) seq = await sendAttr(channel, msgId, seq, totalLen, ATTR_NORMAL, normalBuf);
  if (colorBuf)  seq = await sendAttr(channel, msgId, seq, totalLen, ATTR_COLOR,  colorBuf);
  if (indexBuf)  seq = await sendAttr(channel, msgId, seq, totalLen, ATTR_INDEX,  indexBuf);
}

async function sendAttr(
  channel:  {send:(db:any)=>void},
  msgId: number,
  seq: number,
  totalLen: number,
  attrId: number,
  buf: ArrayBuffer
): Promise<number> {
  const view = new Uint8Array(buf);
  const total = view.byteLength;
  for (let offset = 0; offset < total; offset += MAX_PAYLOAD) {
    const len = Math.min(MAX_PAYLOAD, total - offset);
    const isLast = offset + len >= total;
    await sendFrame(
      channel, msgId, seq++, totalLen,
      isLast ? FLAG_LAST : 0,
      attrId, offset,
      view.subarray(offset, offset + len)
    );
  }
  return seq;
}

async function sendFrame(
  channel:  {send:(db:any)=>void},
  msgId: number,
  seq: number,
  totalLen: number,
  flags: number,
  attrId: number,
  offset: number,
  payload: Uint8Array
): Promise<void> {
  const frame = new Uint8Array(HEADER_SIZE + payload.byteLength);
  const fv = new DataView(frame.buffer);
  fv.setUint32(HDR_MSG_ID, msgId, true);
  fv.setUint32(HDR_SEQ, seq, true);
  fv.setUint32(HDR_TOTAL_LEN, totalLen, true);
  fv.setUint8(HDR_FLAGS, flags);
  fv.setUint8(HDR_ATTR_ID, attrId);
  fv.setUint16(HDR_RESERVED, 0, true);
  fv.setUint32(HDR_OFFSET, offset, true);
  frame.set(payload, HEADER_SIZE);

  //await waitForDrain(channel);
  channel.send(frame);
}
/*
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
  */