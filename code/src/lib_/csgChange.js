// csgChange.ts
const geometries = {
  geom3: { isA: (object) => {
    if (object && typeof object === "object") {
      if ("polygons" in object && "transforms" in object) {
        if (Array.isArray(object.polygons) && "length" in object.transforms) {
          return true;
        }
      }
    }
    return false;
  } },
  geom2: { isA: (object) => {
    if (object && typeof object === "object") {
      if ("sides" in object && "transforms" in object) {
        if (Array.isArray(object.sides) && "length" in object.transforms) {
          return true;
        }
      }
    }
    return false;
  } },
  path2: { isA: (object) => {
    if (object && typeof object === "object") {
      if ("points" in object && "transforms" in object && "isClosed" in object) {
        if (Array.isArray(object.points) && "length" in object.transforms) {
          return true;
        }
      }
    }
    return false;
  } }
};
const getCsgObjArray = (db, back) => {
  const arrayReturn = (v, fn) => {
    if (Array.isArray(v)) {
      v.forEach((_v) => {
        arrayReturn(_v, fn);
      });
    } else {
      fn(v);
    }
  };
  try {
    back({ start: true });
    let index = 0;
    arrayReturn(db, (v) => {
      back({ ver: getCsgObj(v, back,index), index });
      index++;
    });
    back({ end: true });
  } catch (e) {
    back({ errMsg: e.toString(), end: true });
  }
};
const getCsgObj = (v, back) => {
  try {
    if (geometries.geom3.isA(v)) {
      return CSG2Vertices(v);
    }else if (geometries.geom2.isA(v)) {
      return CSGSides2LineSegmentsVertices(v);
    }else if (geometries.path2.isA(v)) {
      return CSG2LineVertices(v);
    }else{
      back({ options:v });
    }
  } catch (e) {
    if (back) {
      back({ errMsg: e.toString(), end: true });
    }
  }
};
const CSG2Vertices = (csg)=> {
  let vLen = 0;
  let iLen = 0;
  for (const poly of csg.polygons) {
    const len = poly.vertices.length;
    vLen += len * 3;
    iLen += 3 * (len - 2);
  }
  const vertices = new Float32Array(vLen);
  const normals = new Float32Array(vLen);
  const indices = vLen > 65535 ? new Uint32Array(iLen) : new Uint16Array(iLen);
  const color = csg.color;
  let vertOffset = 0;
  let indOffset = 0;
  let posOffset = 0;
  let first = 0;
  for (const poly of csg.polygons) {
    const arr = poly.vertices;
    const normal = calculateNormal(arr);
    const len = arr.length;
    first = posOffset;
    vertices.set(arr[0], vertOffset);
    normals.set(normal, vertOffset);
    vertOffset += 3;
    vertices.set(arr[1], vertOffset);
    normals.set(normal, vertOffset);
    vertOffset += 3;
    posOffset += 2;
    for (let i = 2; i < len; i++) {
      vertices.set(arr[i], vertOffset);
      normals.set(normal, vertOffset);
      indices[indOffset++] = first;
      indices[indOffset++] = first + i - 1;
      indices[indOffset++] = first + i;
      vertOffset += 3;
      posOffset += 1;
    }
  }
  return { type: "mesh", vertices, indices, color, normals, transforms: csg.transforms };
};
const calculateNormal = (vertices) => {
  const v0 = vertices[0];
  const v1 = vertices[1];
  const v2 = vertices[2];
  const Ax = v1[0] - v0[0];
  const Ay = v1[1] - v0[1];
  const Az = v1[2] - v0[2];
  const Bx = v2[0] - v0[0];
  const By = v2[1] - v0[1];
  const Bz = v2[2] - v0[2];
  const Nx = Ay * Bz - Az * By;
  const Ny = Az * Bx - Ax * Bz;
  const Nz = Ax * By - Ay * Bx;
  const len = Math.hypot(Nx, Ny, Nz);
  return [Nx / len, Ny / len, Nz / len];
};
const CSGSides2LineSegmentsVertices = (csg) => {
  const vLen = csg.sides.length * 6;
  const vertices = new Float32Array(vLen);
  csg.sides.forEach((side, idx) => {
    const i = idx * 6;
    setPoints(vertices, side[0], i);
    setPoints(vertices, side[1], i + 3);
  });
  return { type: "lines", vertices, transforms: csg.transforms };
};
const setPoints = (points, p, i) => {
  points[i++] = p[0];
  points[i++] = p[1];
  points[i++] = p[2] || 0;
};
const CSG2LineVertices = (csg)=> {
  let vLen = csg.points.length * 3;
  if (csg.isClosed) {
    vLen += 3;
  }
  const vertices = new Float32Array(vLen);
  csg.points.forEach((p, idx) => setPoints(vertices, p, idx * 3));
  if (csg.isClosed) {
    setPoints(vertices, csg.points[0], vertices.length - 3);
  }
  return { type: "line", vertices, transforms: csg.transforms };
};
export {
  getCsgObjArray
};