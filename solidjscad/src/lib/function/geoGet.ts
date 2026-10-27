
import {
    BufferGeometry,
    Material,
    BufferAttribute,
    Color,
    Scene,
    Mesh
} from "three";  
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {type GeometryMeta,
  MAX_PAYLOAD,
  FLAG_META,
  ATTR_POSITION,
  ATTR_NORMAL,
  ATTR_COLOR,
  ATTR_INDEX, 
  HEADER_SIZE, 
 } from "./geometry-protocol";
 import {materials} from './csg2Three'
interface GeometryStream {
  msgId: number;
  meta: GeometryMeta;
  totalLen: number;

  positions: Float32Array;
  normals: Float32Array | null;
  colors: Float32Array | null;
  indices: Uint16Array | Uint32Array | null;

  received: {
    position: number;
    normal: number;
    color: number;
    index: number;
  };

  geometry: BufferGeometry;
  material: Material;
  type: string;

  // 累积脏范围，节流上传 GPU
  dirtyPos: [number, number] | null;
  dirtyNrm: [number, number] | null;
  dirtyCol: [number, number] | null;
  dirtyIdx: [number, number] | null;

  update: number;
  rafPending: boolean;
}

export const streams = new Map<number, GeometryStream>();
//const meshes  = new Map<number, Mesh>();
const STREAM_TIMEOUT = 30_000;
export const MAX_MESSAGE_SIZE = 256 * 1024 * 1024;

let sweeper: ReturnType<typeof setInterval> | undefined;
  
export function onMeta(msgId: number, totalLen: number, meta: GeometryMeta): GeometryStream {
  const { attributes } = meta;

  const positions = new Float32Array(attributes.position.byteLength / 4);
  const normals = attributes.normal
    ? new Float32Array(attributes.normal.byteLength / 4)
    : null;
  const colors = attributes.color
    ? new Float32Array(attributes.color.byteLength / 4)
    : null;

  let indices: Uint16Array | Uint32Array | null = null;
  if (attributes.index) {
    indices = attributes.index.componentType === 'Uint16'
      ? new Uint16Array(attributes.index.byteLength / 2)
      : new Uint32Array(attributes.index.byteLength / 4);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  if (colors)  geometry.setAttribute('color', new BufferAttribute(colors, attributes.color!.itemSize));
  if (indices) geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);

  const { material, type } = buildMaterial(meta);

  return {
    msgId, meta, totalLen,
    positions, normals, colors, indices,
    received: { position: 0, normal: 0, color: 0, index: 0 },
    geometry, material, type,
    dirtyPos: null, dirtyNrm: null, dirtyCol: null, dirtyIdx: null,
    update: Date.now(),
    rafPending: false,
  };
}
export function onDataFrame(
  st: GeometryStream,
  attrId: number,
  offset: number,
  payload: Uint8Array
): void {
  switch (attrId) {
    case ATTR_POSITION: {
      const dst = new Uint8Array(st.positions.buffer);
      dst.set(payload, offset);
      st.received.position += payload.byteLength;
      st.dirtyPos = mergeRange(st.dirtyPos, offset, payload.byteLength);
      break;
    }
    case ATTR_NORMAL: {
      if (!st.normals) return;
      new Uint8Array(st.normals.buffer).set(payload, offset);
      st.received.normal += payload.byteLength;
      st.dirtyNrm = mergeRange(st.dirtyNrm, offset, payload.byteLength);
      break;
    }
    case ATTR_COLOR: {
      if (!st.colors) return;
      new Uint8Array(st.colors.buffer).set(payload, offset);
      st.received.color += payload.byteLength;
      st.dirtyCol = mergeRange(st.dirtyCol, offset, payload.byteLength);
      break;
    }
    case ATTR_INDEX: {
      if (!st.indices) return;
      new Uint8Array(st.indices.buffer).set(payload, offset);
      st.received.index += payload.byteLength;
      st.dirtyIdx = mergeRange(st.dirtyIdx, offset, payload.byteLength);
      break;
    }
  }
  st.update = Date.now();
  scheduleFlush(st);
}

function mergeRange(
  cur: [number, number] | null,
  offset: number,
  len: number
): [number, number] {
  if (!cur) return [offset, len];
  const start = Math.min(cur[0], offset);
  const end = Math.max(cur[0] + cur[1], offset + len);
  return [start, end - start];
}

const pendingFlush = new Set<GeometryStream>();

function scheduleFlush(st: GeometryStream): void {
  if (st.rafPending) return;
  st.rafPending = true;
  pendingFlush.add(st);
  requestAnimationFrame(() => {
    pendingFlush.delete(st);
    st.rafPending = false;
    flush(st);
  });
}

function flush(st: GeometryStream): void {
  const g = st.geometry;

  // 1) 增量上传 GPU
  if (st.dirtyPos) {
    const a = g.attributes.position as BufferAttribute;
    a.addUpdateRange(st.dirtyPos[0] / 4, st.dirtyPos[1] / 4);
    a.needsUpdate = true;
    st.dirtyPos = null;
  }
  if (st.dirtyNrm && st.normals) {
    const a = g.attributes.normal as BufferAttribute;
    a.addUpdateRange(st.dirtyNrm[0] / 4, st.dirtyNrm[1] / 4);
    a.needsUpdate = true;
    st.dirtyNrm = null;
  }
  if (st.dirtyCol && st.colors) {
    const a = g.attributes.color as BufferAttribute;
    const itemSize = a.itemSize;
    a.addUpdateRange(st.dirtyCol[0] / 4 / itemSize, st.dirtyCol[1] / 4 / itemSize);
    a.needsUpdate = true;
    st.dirtyCol = null;
  }
  if (st.dirtyIdx && st.indices) {
    const a = g.index as BufferAttribute;
    const bytesPer = st.indices.BYTES_PER_ELEMENT;
    a.addUpdateRange(st.dirtyIdx[0] / bytesPer, st.dirtyIdx[1] / bytesPer);
    a.needsUpdate = true;
    st.dirtyIdx = null;
  }

  // 2) 推进 drawRange
  if (st.indices) {
    // 索引到达后，所有 position 已经在位，可以安全渲染到已收到的索引数
    const idxCount = st.received.index / st.indices.BYTES_PER_ELEMENT;
    g.setDrawRange(0, idxCount);
  } else {
    // 非索引：只渲染已完整到达的顶点
    const vtxCount = Math.floor(st.received.position / 12);
    g.setDrawRange(0, vtxCount);
  }
}
/**
 * 与 csg2Geo 的材质构造逻辑一一对应。
 * 输入是流式协议里的 meta，输出是可直接挂到 Mesh 上的材质。
 */
function buildMaterial(meta: GeometryMeta): {
  material: Material;
  type: string;
} {
  const type = meta.material.type || 'mesh';

  // ① 查定义
  const materialDef = materials[type];
  if (!materialDef) {
    console.error(`material not found for type ${type}`, meta);
    throw new Error(`material not found for type ${type}`);
  }

  // ② 默认材质
  let material: Material = materialDef.def;

  const color  = meta.material.color;                 // 等价 obj.color
  const hasColors = meta.attributes.color != null;    // 等价 !!obj.colors
  const isTransparent = meta.material.isTransparent ?? false;
  const opacity = meta.material.opacity;

  // ③ 有颜色（数组色或顶点色）才重建
  if (color || hasColors) {
    const c = color;

    const opts: {
      color?: Color;
      vertexColors: boolean;
      opacity: any;
      transparent: boolean;
    } = {
      vertexColors: hasColors,
      opacity: c?.[3] === undefined ? 1 : c![3],
      transparent:
        (color != null && c![3] !== 1 && c![3] !== undefined) || isTransparent,
    };

    if (opacity) opts.opacity = opacity;

    if (!hasColors && color) {
      opts.color = new Color(color[0], color[1], color[2]);
    }

    material = materialDef.make(opts);

    if (opacity) {
      material.transparent = true;
      material.opacity = opacity;
    }
  }

  return { material, type };
}
 
export function disposeStream(msgId: number): void {
  const st = streams.get(msgId);
  if (st) {
    st.geometry.dispose();
    st.material.dispose();
    streams.delete(msgId);
  }
  
}
 
export function isComplete(st: GeometryStream): boolean {
  const a = st.meta.attributes;
  if (st.received.position < a.position.byteLength) return false;
  if (a.normal && st.received.normal < a.normal.byteLength) return false;
  if (a.color && st.received.color < a.color.byteLength) return false;
  if (a.index && st.received.index < a.index.byteLength) return false;
  return true;
}

export function finalizeGeometry(st: GeometryStream): void {
  // 最后一次 flush，确保 drawRange 到底
  flush(st);

  // normals 缺失：整体算一次
  if (!st.meta.attributes.normal) {
    st.geometry.computeVertexNormals();
  }
/*
  // smooth：等数据齐了再 crease，返回新几何体
  if (st.meta.smooth) {
    const newGeo = toCreasedNormals(st.geometry, Math.PI / 10);
    st.geometry.dispose();
    st.geometry = newGeo;

    const mesh = meshes.get(st.msgId);
    if (mesh) mesh.geometry = newGeo;
  }

  // 数据齐了，恢复视锥剔除
  const mesh = meshes.get(st.msgId);
  if (mesh) {
    st.geometry.computeBoundingSphere();
    mesh.frustumCulled = true;
  }
    */
}