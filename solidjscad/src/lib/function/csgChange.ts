// csgChange.ts

// ============================================================================
// 几何对象类型定义（基于运行时检查的特征）
// ============================================================================
type Geo = Geom3|Geom2|Path2|RawGeometry   |Promise<RawGeometry>
interface Geom3 {
  polygons: Array<{ vertices: number[][] }>;
  transforms: unknown;
  color?: unknown;
}

interface Geom2 {
  sides: number[][][]; // 每个 side 为 [起点, 终点]
  transforms: unknown;
}

interface Path2 {
  points: number[][];
  transforms: unknown;
  isClosed: boolean;
}

// 任何包含 vertices 和 indices 的几何（直接透传）
interface RawGeometry {
  vertices: unknown;
  indices: unknown;
  [key: string]: any;
}

// ============================================================================
// 转换结果类型
// ============================================================================

interface MeshData {
  type: "mesh";
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  normals?: Float32Array;
  color?: unknown;
  transforms?: unknown;
  [key: string]: any;
}

interface LinesData {
  type: "lines";
  vertices: Float32Array;
  transforms: unknown;
  [key: string]: any;
}

interface LineData {
  type: "line";
  vertices: Float32Array;
  transforms: unknown;
  [key: string]: any;
}

type ConvertResult = MeshData | LinesData | LineData | RawGeometry  ;

// ============================================================================
// 回调消息类型
// ============================================================================

type BackMessage =
 ( | { start: true }
  | { end: true }
  | { errMsg: string }
 
  | ({ index: number } & (ConvertResult|{[k:string]:any}) )
  | { options: unknown })
  // & {[key:string]:any};

type BackCallback = (msg: BackMessage ) =>Promise<void>;

// ============================================================================
// 类型守卫（用于运行时判断）
// ============================================================================

const geometries = {
  geom3: {
    isA: (object: Geo): object is Geom3 => {
      if (object && typeof object === "object") {
        const obj = object as Geom3;
        if ("polygons" in obj && "transforms" in obj) {
          if (Array.isArray(obj.polygons) && "length" in (obj.transforms as object)) {
            return true;
          }
        }
      }
      return false;
    },
  },
  geom2: {
    isA: (object: Geo): object is Geom2 => {
      if (object && typeof object === "object") {
        const obj = object as Geom3;
        if ("sides" in obj && "transforms" in obj) {
          if (Array.isArray(obj.sides) && "length" in (obj.transforms as object)) {
            return true;
          }
        }
      }
      return false;
    },
  },
  path2: {
    isA: (object: unknown): object is Path2 => {
      if (object && typeof object === "object") {
        const obj = object as Record<string, unknown>;
        if ("points" in obj && "transforms" in obj && "isClosed" in obj) {
          if (Array.isArray(obj.points) && "length" in (obj.transforms as object)) {
            return true;
          }
        }
      }
      return false;
    },
  },
};

// ============================================================================
// 核心转换函数
// ============================================================================

/**
 * 递归遍历 db（支持嵌套数组），对每个非数组元素调用 getCsgObj 并通过 back 回调
 */
export const getCsgObjArray =async (db:  Geo[]|Geo, back: BackCallback) => {
  const arrayReturn =async (v: Geo[]|Geo , fn: (item: Geo ) =>Promise<void>)=> {
    if (Array.isArray(v)) {
      for (let _v of v){ 
        await arrayReturn(_v, fn); 
      }
      
    } else {
      await fn(v);
    }
  };

  try {
    //await back({ start: true });
    let index = 0;
    await arrayReturn(db,async (v) => {
      const result =await getCsgObj(v,index, back);
      if (result){
        await back(Object.assign({index},result) );
        index++;
      }      
    });
    //await back({ end: true });
  } catch (e) {
    await back({ errMsg: e?.toString() ?? "unknown error" });
  }
};

/**
 * 将单个几何对象转换为统一的渲染数据格式
 * @param v 输入的几何对象
 * @param back 可选回调，用于报告无法识别的对象或错误
 * @returns 转换后的数据，若出错则返回 undefined
 */
export const getCsgObj =async (v:  Geo,index:number, back?: BackCallback):Promise<ConvertResult | undefined> => {
  try {
    if (geometries.geom3.isA(v)) {
      return CSG2Vertices(v);
    } else if (geometries.geom2.isA(v)) {
      return CSGSides2LineSegmentsVertices(v);
    } else if (geometries.path2.isA(v)) {
      return CSG2LineVertices(v);
    } else if (
      v &&
      typeof v === "object" &&
      "vertices" in v &&
      "indices" in v
    ) {
      return v as RawGeometry;
    } else if (v && (v as Promise<RawGeometry>).then){
      return (await v)
       
    } else {
    
        await back?.({ options: v });
    
      return undefined;
    }
  } catch (e) {
   
      await back?.({ errMsg: e?.toString() ?? "unknown error", end: true });
    
    return undefined;
  }
};

// ----------------------------------------------------------------------------
// 几何体转换实现
// ----------------------------------------------------------------------------

/**
 * 将 geom3 转换为 MeshData（顶点、法线、索引）
 */
const CSG2Vertices = (csg: Geom3): MeshData => {
  // 预计算顶点和索引数量
  let vertexCount = 0;
  let indexCount = 0;
  for (const poly of csg.polygons) {
    vertexCount += poly.vertices.length;
    indexCount += 3 * (poly.vertices.length - 2);
  }

  const vertices = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = vertexCount > 65535 
    ? new Uint32Array(indexCount) 
    : new Uint16Array(indexCount);

  let vertOffset = 0;   // 顶点分量偏移（每顶点 +3）
  let vertexIndex = 0;  // 当前多边形的第一个顶点的全局索引
  let indOffset = 0;

  for (const poly of csg.polygons) {
    const arr = poly.vertices;
    const normal = calculateNormal(arr);
    const len = arr.length;
    const first = vertexIndex;

    // 写入顶点和法线
    for (let i = 0; i < len; i++) {
      vertices.set(arr[i], vertOffset);
      normals.set(normal, vertOffset);
      vertOffset += 3;
      vertexIndex += 1;
    }

    // 扇形三角化
    for (let i = 2; i < len; i++) {
      indices[indOffset++] = first;
      indices[indOffset++] = first + i - 1;
      indices[indOffset++] = first + i;
    }
  }

  return {
    type: "mesh",
    vertices,
    indices,
    normals,
    color: csg.color,
    transforms: csg.transforms,
  };
};


const CSG2Vertices_ = (csg: Geom3): MeshData => {
  let vLen = 0;
  let iLen = 0;
  for (const poly of csg.polygons) {
    const len = poly.vertices.length;
    vLen += len * 3;
    iLen += 3 * (len - 2);
  }

  const vertices = new Float32Array(vLen);
  // 不生成法线数组（或生成但留空，后续由 Three.js 计算）
  const indices =  vLen > 65535 ? new Uint32Array(iLen) : new Uint16Array(iLen);
  const color = csg.color;

  let vertOffset = 0;
  let indOffset = 0;
  let posOffset = 0;
  let first = 0;

  for (const poly of csg.polygons) {
    const arr = poly.vertices;
    const len = arr.length;
    first = posOffset;

    // 写入所有顶点（交换 Y 和 Z）
    for (let i = 0; i < len; i++) {
      const v = arr[i];
      vertices[vertOffset] = v[0];
      vertices[vertOffset + 1] = v[2]; // 原来的 Z 变为新的 Y
      vertices[vertOffset + 2] = v[1]; // 原来的 Y 变为新的 Z
      vertOffset += 3;
      posOffset++;
    }

    // 生成索引（三角形扇），但**反转每个三角形的顶点顺序**
    // 原顺序：first, first+1, first+2; first, first+2, first+3; ...
    // 反转后：first, first+2, first+1; first, first+3, first+2; ...
    for (let i = 2; i < len; i++) {
      indices[indOffset++] = first;
      indices[indOffset++] = first + i;      // 第三个顶点
      indices[indOffset++] = first + i - 1;  // 第二个顶点（交换位置）
    }
  }

  return {
    type: "mesh",
    vertices,
    indices,
    normals: undefined, // 不提供法线，让 Three.js 自动计算
    color,
    transforms: csg.transforms, // 保持不变，但后续应用时要注意
  };
};
/**
 * 计算多边形法线（假设为三角形扇的第一个三角形）
 */
const calculateNormal = (vertices: number[][]): number[] => {
  const [v0, v1, v2] = vertices;
  const u = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
  const v = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
  const nx = u[1]*v[2] - u[2]*v[1];
  const ny = u[2]*v[0] - u[0]*v[2];
  const nz = u[0]*v[1] - u[1]*v[0];
  const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
  return [nx/len, ny/len, nz/len];
};

/**
 * 将 geom2 转换为 LinesData（线段）
 */
const CSGSides2LineSegmentsVertices = (csg: Geom2): LinesData => {
  const vLen = csg.sides.length * 6;
  const vertices = new Float32Array(vLen);

  csg.sides.forEach((side, idx) => {
    const i = idx * 6;
    setPoints(vertices, side[0], i);
    setPoints(vertices, side[1], i + 3);
  });

  return {
    type: "lines",
    vertices,
    transforms: csg.transforms,
  };
};

/**
 * 将点（可能是二维或三维）写入 Float32Array 的指定位置
 */
const setPoints = (points: Float32Array, p: number[], i: number): void => {
  points[i++] = p[0];
  points[i++] = p[1];
  points[i++] = p[2] || 0;
};

/**
 * 将 path2 转换为 LineData（折线）
 */
const CSG2LineVertices = (csg: Path2): LineData => {
  let vLen = csg.points.length * 3;
  if (csg.isClosed) {
    vLen += 3;
  }
  const vertices = new Float32Array(vLen);

  csg.points.forEach((p, idx) => setPoints(vertices, p, idx * 3));
  if (csg.isClosed) {
    setPoints(vertices, csg.points[0], vertices.length - 3);
  }

  return {
    type: "line",
    vertices,
    transforms: csg.transforms,
  };
};