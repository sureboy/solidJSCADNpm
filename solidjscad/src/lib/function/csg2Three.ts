import {
    MeshPhongMaterial,
    LineBasicMaterial,
    BufferGeometry,
    BufferAttribute,
    Mesh, 
    Line,
    LineSegments,
    Color,
    Vector3,
} from "three";  
import type {
  MeshPhongMaterialParameters,LineBasicMaterialParameters,TypedArray,Matrix4,Matrix4Tuple} from "three"  ;
export interface csgObj {
    polygons?:TypedArray
    list?:TypedArray,
    vertices:TypedArray;
    indices?:TypedArray; 
    normals?:TypedArray;
    color?:TypedArray;
    colors?:TypedArray;
    isTransparent?:boolean;
    opacity? :any;
    transforms?:Matrix4Tuple;
    type?:any;

    //csg:Geometry;
}   
const flatShading = false;
export const materials:Record<string,any> = {
  mesh: {
    def: new MeshPhongMaterial({ color: 0x0084d1, flatShading }),
    make: (params:MeshPhongMaterialParameters) => new MeshPhongMaterial({ ...params,flatShading }),
  },
  line: {
    def: new LineBasicMaterial({ color: 0x0000ff }),
    make: (params:LineBasicMaterialParameters) => new LineBasicMaterial(params),
  },
  lines: null,
};
materials.lines = materials.line;
materials.instance = materials.mesh ;// todo support instances for lines

export function csg2Geo(obj:csgObj ,{ smooth = false }){
 
    const { vertices, indices, normals, color, colors, isTransparent = false, opacity } = obj;
    const type = obj.type || 'mesh';
    //console.log(obj)
    const materialDef = materials[type];
    if (!materialDef) {
      console.error(`material not found for type ${type}`, obj);
      return;
    }
    let material = materialDef.def;
    //const isInstanced = obj.type === 'instance'
    if (color || colors)  {
      const c = color || colors;
      const opts:{color?:Color,vertexColors:boolean,opacity:any,transparent:boolean} = {       
        vertexColors: !!colors,
        opacity: c![3] === undefined ? 1 : c![3],
        transparent: (color && c![3] !== 1 && c![3] !== undefined) || isTransparent,
      };
      if (opacity) {opts.opacity = opacity;}
      if (!colors) {opts.color =  new Color(color![0], color![1], color![2]);}
      material = materialDef.make(opts);
      if (opacity) {
        material.transparent = true;
        material.opacity = opacity;
      }
    }
    let geometry = new BufferGeometry();
    geometry.setAttribute('position',
      //vertices
       new BufferAttribute(vertices instanceof ArrayBuffer ?new Float32Array(vertices):vertices, 3)
      );
    if (indices) {
      if (obj.type){
        geometry.setIndex(
          new BufferAttribute(indices instanceof ArrayBuffer ?((indices as ArrayBuffer).byteLength>65535 ?new Uint32Array(indices) : new Uint16Array(indices)):indices, 1)
        )
      }else{
        geometry.setIndex(new BufferAttribute(indices instanceof ArrayBuffer ?new Uint32Array(indices):indices,1))
      }
       //new BufferAttribute(indices instanceof ArrayBuffer ?new Uint32Array(indices):indices,1)
  
    }
    if (normals) {geometry.setAttribute('normal', 
      new BufferAttribute(normals instanceof ArrayBuffer?new Float32Array(normals) :normals, 3)
    );
    }else{
      geometry.computeVertexNormals();
    }
    if(smooth) {geometry = toCreasedNormals( geometry, Math.PI / 10);}
    if (colors) {geometry.setAttribute('color', new BufferAttribute(colors, isTransparent ? 4 : 3));}
    //geometry.computeVertexNormals();
    return {geometry,material,type}
}
 
export function CSG2Three(obj:csgObj , { smooth = false }) {
    //const obj = CSG2Vertices(csg)
    const { vertices, indices, normals, color, colors, isTransparent = false, opacity } = obj;
    let { transforms } = obj;
    const objType = obj.type || 'mesh';

    const materialDef = materials[objType];
    if (!materialDef) {
      console.error(`material not found for type ${objType}`, obj);
      return;
    }
    let material = materialDef.def;
    //const isInstanced = obj.type === 'instance'
    if (color || colors)  {
      const c = color || colors;
      const opts:{color?:Color,vertexColors:boolean,opacity:any,transparent:boolean} = {       
        vertexColors: !!colors,
        opacity: c![3] === undefined ? 1 : c![3],
        transparent: (color && c![3] !== 1 && c![3] !== undefined) || isTransparent,
      };
      if (opacity) {opts.opacity = opacity;}
      if (!colors) {opts.color =  new Color(color![0], color![1], color![2]);}
      material = materialDef.make(opts);
      if (opacity) {
        material.transparent = true;
        material.opacity = opacity;
      }
    }

    let geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(vertices, 3));
    if (indices) {geo.setIndex(new BufferAttribute(indices, 1));}
    if (normals) {geo.setAttribute('normal', new BufferAttribute(normals, 3));}
    if(smooth) {geo = toCreasedNormals( geo, Math.PI / 10);}
    if (colors) {geo.setAttribute('color', new BufferAttribute(colors, isTransparent ? 4 : 3));}

    let mesh:any;
    //mesh = new Mesh(geo, material)
    //console.log(geo, material)
    switch (objType) {
      case 'mesh':
        geo.computeVertexNormals();
        mesh = new Mesh(geo, material);
        break;
     // case 'instance':
     //   const { list } = obj
     //   console.log(list)
        /*
        mesh = new InstancedMesh(geo, materials.mesh.make({ color: 0x0084d1 }), list.length)
        list.forEach((item, i) => {
          copyTransformToArray(item.transforms, mesh.instanceMatrix.array, i * 16)
        })
        transforms = undefined
        */
     //   break
      case 'line':
        mesh = new Line(geo, material);
        break;
      case 'lines':
        // https://threejs.org/docs/#api/en/materials/LineBasicMaterial
        mesh = new LineSegments(geo, material);
        break;
    }
        
    if (transforms ) {mesh.applyMatrix4({ elements: transforms }as Matrix4);}
    return mesh;
}
 
function toCreasedNormals(  geometry:BufferGeometry, creaseAngle = Math.PI / 3 /* 60 degrees */) {
  const creaseDot = Math.cos(creaseAngle);
  const hashMultiplier = (1 + 1e-10) * 1e2;

  // reusable vectors
  const verts = [new Vector3(), new Vector3(), new Vector3()];
  const tempVec1 = new Vector3();
  const tempVec2 = new Vector3();
  const tempNorm = new Vector3();
  const tempNorm2 = new Vector3();

  // hashes a vector
  function hashVertex(v:Vector3) {
    const x = ~~(v.x * hashMultiplier);
    const y = ~~(v.y * hashMultiplier);
    const z = ~~(v.z * hashMultiplier);
    return `${x},${y},${z}`;
  }

  // BufferGeometry.toNonIndexed() warns if the geometry is non-indexed
  // and returns the original geometry
  const resultGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const posAttr = resultGeometry.attributes.position;
  const vertexMap:Record<string,any>= {};

  // find all the normals shared by commonly located vertices
  for (let i = 0, l = posAttr.count / 3; i < l; i++) {
    const i3 = 3 * i;
    const a = verts[0].fromBufferAttribute(posAttr, i3 + 0);
    const b = verts[1].fromBufferAttribute(posAttr, i3 + 1);
    const c = verts[2].fromBufferAttribute(posAttr, i3 + 2);

    tempVec1.subVectors(c, b);
    tempVec2.subVectors(a, b);

    // add the normal to the map for all vertices
    const normal = new Vector3().crossVectors(tempVec1, tempVec2).normalize();
    for (let n = 0; n < 3; n++) {
      const vert = verts[n];
      const hash = hashVertex(vert);
      if (!(hash in vertexMap)) {
        vertexMap[hash] = [];
      }

      vertexMap[hash].push(normal);
    }
  }

  // average normals from all vertices that share a common location if they are within the
  // provided crease threshold
  const normalArray = new Float32Array(posAttr.count * 3);
  const normAttr = new BufferAttribute(normalArray, 3, false);
  for (let i = 0, l = posAttr.count / 3; i < l; i++) {
    // get the face normal for this vertex
    const i3 = 3 * i;
    const a = verts[0].fromBufferAttribute(posAttr, i3 + 0);
    const b = verts[1].fromBufferAttribute(posAttr, i3 + 1);
    const c = verts[2].fromBufferAttribute(posAttr, i3 + 2);

    tempVec1.subVectors(c, b);
    tempVec2.subVectors(a, b);

    tempNorm.crossVectors(tempVec1, tempVec2).normalize();

    // average all normals that meet the threshold and set the normal value
    for (let n = 0; n < 3; n++) {
      const vert = verts[n];
      const hash = hashVertex(vert);
      const otherNormals = vertexMap[hash];
      tempNorm2.set(0, 0, 0);

      for (let k = 0, lk = otherNormals.length; k < lk; k++) {
        const otherNorm = otherNormals[k];
        if (tempNorm.dot(otherNorm) > creaseDot) {
          tempNorm2.add(otherNorm);
        }
      }

      tempNorm2.normalize();
      normAttr.setXYZ(i3 + n, tempNorm2.x, tempNorm2.y, tempNorm2.z);
    }
  }

  resultGeometry.setAttribute('normal', normAttr);
  return resultGeometry;
}     