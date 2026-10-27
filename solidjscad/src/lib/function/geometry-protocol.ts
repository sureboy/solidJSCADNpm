// geometry-protocol.ts
export const ATTR_POSITION = 0;
export const ATTR_NORMAL   = 1;
export const ATTR_COLOR    = 2;
export const ATTR_INDEX    = 3;
export const ATTR_META     = 4;
// const HEADER_SIZE = 20;
export const FLAG_LAST = 0x01;
export const FLAG_META = 0x02;

export const HEADER_SIZE = 20;
export const CHUNK_SIZE  = 8 * 1024 * 1024;
export const MAX_PAYLOAD = CHUNK_SIZE - HEADER_SIZE;

export type ComponentType = 'Float32' | 'Uint16' | 'Uint32';

export const HDR_MSG_ID    = 0;
export const HDR_SEQ       = 4;
export const HDR_TOTAL_LEN = 8;
export const HDR_FLAGS     = 12;
export const HDR_ATTR_ID   = 13;
export const HDR_RESERVED  = 14;
export const HDR_OFFSET    = 16;
export interface AttrDescFloat {
  byteLength: number;
  componentType: 'Float32';
}
export interface AttrDescColor extends AttrDescFloat {
  itemSize: 3 | 4;
}
export interface AttrDescIndex {
  byteLength: number;
  componentType: 'Uint16' | 'Uint32';
}
export interface GeometryAttributesMeta {
  position: AttrDescFloat;
  normal: AttrDescFloat | null;
  color: AttrDescColor | null;
  index: AttrDescIndex | null;
}
export interface GeometryMaterialMeta {
  type: string;
  color: [number, number, number, number] | null;
  opacity?: number;
  isTransparent?: boolean;
}
export interface GeometryMeta {
  attributes: GeometryAttributesMeta;
  material: GeometryMaterialMeta;
  smooth: boolean;
}
export interface DecodedFrame {
  msgId: number;
  seq: number;
  totalLen: number;
  flags: number;
  attrId: number;
  offset: number;
  payload: Uint8Array;
  isLast: boolean;
  isMeta: boolean;
}
/**
 * 解析一帧原始数据。输入可以是 ArrayBuffer 或 Uint8Array。
 * 返回结构化的字段；如果帧长度不足或头非法，返回 null。
 */
export function decodeFrame(
  data: ArrayBuffer | Uint8Array
): DecodedFrame | null {
  let frame: Uint8Array;
  if (data instanceof Uint8Array) {
    frame = data;
  } else {
    frame = new Uint8Array(data);
  }

  if (frame.byteLength < HEADER_SIZE) {
    console.warn('[rtc] frame too short', frame.byteLength);
    return null;
  }

  const fv = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);

  const msgId    = fv.getUint32(HDR_MSG_ID, true);
  const seq      = fv.getUint32(HDR_SEQ, true);
  const totalLen = fv.getUint32(HDR_TOTAL_LEN, true);
  const flags    = fv.getUint8(HDR_FLAGS);
  const attrId   = fv.getUint8(HDR_ATTR_ID);
  // offset 14 是 reserved uint16，跳过
  const offset   = fv.getUint32(HDR_OFFSET, true);

  // payload 是零拷贝视图，指向原 buffer 上 [HEADER_SIZE, end) 的范围
  const payload = frame.subarray(HEADER_SIZE);

  return {
    msgId,
    seq,
    totalLen,
    flags,
    attrId,
    offset,
    payload,
    isLast: (flags & FLAG_LAST) !== 0,
    isMeta: (flags & FLAG_META) !== 0,
  };
}

/**
 * 把 meta 帧的 payload 解析成 GeometryMeta。
 * 失败时抛异常，让调用方决定怎么处理。
 */
export function decodeMeta(payload: Uint8Array): GeometryMeta {
  const text = new TextDecoder().decode(payload);
  const meta = JSON.parse(text) as GeometryMeta;
  return meta;
}