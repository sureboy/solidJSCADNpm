import modeling from '@jscad/modeling';

import manifold from 'manifold-3d';

const { roundedRectangle, circle, rectangle } = modeling.primitives;
const { extrudeLinear } = modeling.extrusions;
const { translate, rotateX, rotateY, rotate } = modeling.transforms;
const { subtract, union } = modeling.booleans;
const { geom3 } = modeling.geometries;

const ext = 15

const Opt={
  L:230+ext,
  W:145 +ext,
  H:175 +ext,
  T :4 +ext,
  Fitting:true,
}
export default Opt

/*
const L = 230 +ext ; // 长
const W = 145+ext ; // 宽
const H = 175 +ext;  // 高
const T = 1+ ext;   // 面板厚度
*/

const bakeTransform = (geo) => {
  const baked = geom3.create(geom3.toPolygons(geo));
  // 保留颜色等属性（可选）
  baked.color = geo.color;
  return baked;
};
const manifold_main =async (opt) => {
  const {L,W,H,T} = Object.assign(Opt,opt)
  const Manifold = await manifold();
Manifold.setup();
   /**
   * 生成单个穿孔面板 (3D)，面板中心位于原点 (0,0,0)
   * @param {number} panelWidth 面板宽度 (X轴)
   * @param {number} panelHeight 面板高度 (Y轴)
   * @param {boolean} isVertical 是否为纵向孔洞 (true: 3x10, false: 10x3)
   * @param {number} thickness 面板厚度 (Z轴)
   */
  const createPanel = (panelWidth, panelHeight, isVertical, thickness) => {
    const cutters = [];

    // 定义孔洞尺寸和排布周期
    let rectW, rectH, periodX, periodY, offsetX;
    
    if (isVertical) {
      // 纵向孔洞：长方形宽3，高10；圆孔直径3
      rectW = 3;
      rectH = 10;
      periodX = rectW + 3 + radius * 2 + 3; // 12mm
      periodY = rectH + 3;                  // 13mm
      offsetX = periodX / 2;                // 6mm
    } else {
      // 横向孔洞：长方形宽10，高3；圆孔直径3
      rectW = 10;
      rectH = 3;
      periodX = rectW + 3 + radius * 2 + 3; // 19mm
      periodY = 10;                         // 行间距 10mm
      offsetX = periodX / 2;                // 9.5mm
    }

    // 【性能优化】预创建几何体原型
    const r = 0.5; // 圆角矩形半径 0.5mm
    const rectBase = Manifold.CrossSection.square([rectW - 2*r, rectH - 2*r], true);
    const rectRounded = rectBase.offset(r, 'Round', 2, 16);
    rectBase.delete();
    
    // 挤出并居中 (厚度+2是为了确保打孔时完全穿透面板)
    const rectExtruded = Manifold.Manifold.extrude(rectRounded, thickness + 2);
    rectRounded.delete();
    const rectProto = rectExtruded.translate([0, 0, -(thickness + 2) / 2]);
    rectExtruded.delete();

    const circleProto = Manifold.Manifold.cylinder(thickness + 2, radius, radius, 16, true);

    // 计算可容纳的列数和行数，减去边缘留白
    const margin = 8;
    const cols = Math.floor((panelWidth - margin * 2) / periodX);
    const rows = Math.floor((panelHeight - margin * 2) / periodY);

    // 计算起始坐标，使孔洞阵列在面板中居中
    const startX = -((cols - 1) * periodX) / 2;
    const startY = -((rows - 1) * periodY) / 2;

    // 生成孔洞阵列
    for (let row = 0; row < rows; row++) {
      const isEvenRow = row % 2 === 0;
      const y = startY + row * periodY;
      const currentOffset = isEvenRow ? 0 : offsetX;

      for (let col = 0; col < cols; col++) {
        const x = startX + col * periodX + currentOffset;
        
        // 防止偏移后超出边界
        if (x > panelWidth / 2 - margin || x < -panelWidth / 2 + margin) continue;

        const rectX = isEvenRow ? x : x + offsetX;
        const circleX = isEvenRow ? x + offsetX : x;

        cutters.push(rectProto.translate([rectX, y, 0]));
        cutters.push(circleProto.translate([circleX, y, 0]));
      }
    }

    // 创建基础面板（居中于原点）
    const base = Manifold.Manifold.cube([panelWidth, panelHeight, thickness], true);
    
    // 【性能优化】先将所有孔洞合并，再做一次减法
    const holes = Manifold.Manifold.union(cutters);
    cutters.forEach(c => c.delete());
    rectProto.delete();
    circleProto.delete();

    const wall = base.subtract(holes);
    base.delete();
    holes.delete();

    return wall;
  };

  // ================= 拼装逻辑修正 =================

  // 1. 底面 (长L, 宽W, 竖向孔洞)，位于 Z = T/2 处
  const bottom = createPanel(L, W, false, T)
    .translate([0, 0, T / 2]);

  // 2. 前壁和后壁 (长L, 高H, 横向孔洞)
  // 步骤：先绕 X 轴旋转 90 度使其立起（高度方向变 Z 轴），再平移到前后位置
  const front = createPanel(L, H, false, T)
    .rotate([90, 0, 0])
    .translate([0, -W / 2 + T / 2, T + H / 2]);

  const back = createPanel(L, H, false, T)
    .rotate([90, 0, 0])
    .translate([0, W / 2 - T / 2, T + H / 2]);

  // 3. 左壁和右壁 (宽W, 高H, 竖向孔洞)
  // 步骤：
  //   a. 绕 X 轴旋转 90 度使其立起（初始高H变Z轴）
  //   b. 绕 Z 轴旋转 90 度使其面向 X 轴（初始宽W变Y轴，厚度T变X轴）
  //   c. 平移到左右两侧
  const left = createPanel(W, H, false, T)
    .rotate([90, 0, 0])
    .rotate([0, 0, 90])
    .translate([-L / 2 + T / 2, 0, T + H / 2]);

  const right = createPanel(W, H, false, T)
    .rotate([90, 0, 0])
    .rotate([0, 0, -90])
    .translate([L / 2 - T / 2, 0, T + H / 2]);

  // 4. 合并所有面
  const finalBasket = Manifold.Manifold.union([bottom, front, back, left, right]);
  
  // 清理各面内存
  bottom.delete(); front.delete(); back.delete(); left.delete(); right.delete();

  // 5. 提取网格数据
  const meshData = finalBasket.getMesh();
  const vertices = meshData.vertProperties;
  const indices = meshData.triVerts;
  
  // 6. 清理最终结果
  finalBasket.delete();

  return [{ vertices, indices }, opt];
};
/**
 * 生成单个穿孔面板 (2D)
 */
const createPanel = (opt 
) => {
  const {panelWidth, panelHeight, isVertical, thickness,radius,width} = opt
  const cutters = [];
  // 定义孔洞尺寸和排布周期
  let rectW, rectH, periodX, periodY, offsetX;
  if (isVertical) {
    // 纵向孔洞：长方形宽3，高10；圆孔直径3
    rectW = 3;
    rectH = 10;
    periodX = rectW + 3 + radius * 2 + 3; // 12mm
    periodY = rectH + 3;                  // 13mm
    offsetX = periodX / 2;                // 6mm
  } else {
    // 横向孔洞：长方形宽10，高3；圆孔直径3
    rectW = 10;
    rectH = 3;
    periodX = rectW + 3 + radius * 2 + 3; // 19mm
    periodY = 10;                         // 行间距 10mm
    offsetX = periodX / 2;                // 9.5mm
  }

  // 预创建几何体原型，避免在循环中重复创建（性能优化关键点）
  const rectProto = roundedRectangle({ size: [rectW, rectH], roundRadius: 0.5, segments: 8 });
  const circleProto = circle({ radius, center: [0, 0] });

  // 计算可容纳的列数和行数，减去边缘留白
  const margin = 8;
  const cols = Math.floor((panelWidth - margin * 2) / periodX);
  const rows = Math.floor((panelHeight - margin * 2) / periodY);

  // 计算起始坐标，使孔洞阵列在面板中居中
  const startX = -((cols - 1) * periodX) / 2;
  const startY = -((rows - 1) * periodY) / 2;

  // 生成孔洞阵列
  for (let row = 0; row < rows; row++) {
    const isEvenRow = row % 2 === 0;
    const y = startY + row * periodY;
    const currentOffset = isEvenRow ? 0 : offsetX;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * periodX + currentOffset;
      
      // 防止偏移后超出边界
      if (x > panelWidth / 2 - margin || x < -panelWidth / 2 + margin) continue;

      // 偶数行：先长方形后圆孔；奇数行：先圆孔后长方形
      const rectX = isEvenRow ? x : x + offsetX;
      const circleX = isEvenRow ? x + offsetX : x;

      cutters.push(translate([rectX, y, 0], rectProto));
      cutters.push(translate([circleX, y, 0], circleProto));
    }
  }

  // 创建基础面板
  const base = rectangle({ size: [panelWidth, panelHeight], center: [0, 0] });
  
  // 性能优化：先将所有孔洞合并成一个几何体，再做一次减法
  // 避免了几百次连续的布尔减法操作
  const holes = union(cutters);
  const wall = subtract(base, holes);

  // 挤出为 3D 面板
  return extrudeLinear({ height: thickness }, wall);
};
export function bottom (opt) {
    // 基础孔洞参数
  const {L,W,H,T} = Object.assign(Opt,opt)
  const option = Object.assign({ 
    panelWidth:L, panelHeight:W, isVertical:false,thickness: T,radius: 1.5, width: 10 }, opt);  

  return bakeTransform(modeling.transforms.centerZ(createPanel(option)));
}
 
export const frontAndBack = (opt)=>{
  console.log("front",opt)
  const {L,W,H,T,Fitting} = Object.assign(Opt,opt)
  const option = Object.assign({ 
    panelWidth:L, panelHeight:H, isVertical:false,thickness: T,radius: 1.5, width: 10 }, opt);  
  const frontBase =modeling.transforms.centerZ(createPanel(option));
  let _y = W / 2  
  let f_y = _y - T/2
  let y =  _y + H/2  
  const front = bakeTransform(translate(
    Fitting?[0, -f_y, T/2+  H / 2]:[0, -y  , 0], 
    Fitting?rotateX(Math.PI / 2,frontBase):frontBase));
  const back = bakeTransform(translate(
    Fitting?[0, f_y, T/2+  H / 2]:[0, y ,0], 
    Fitting?rotateX(Math.PI / 2, frontBase):frontBase));
  return [front,back] 
}
 
export const leftAndRight = (opt)=>{
  const {L,W,H,T,Fitting} = Object.assign(Opt,opt)
  const option = Object.assign({ 
    panelWidth:W, panelHeight:H, isVertical:false,thickness: T,radius: 1.5, width: 10 }, opt);  
  const sideBase =modeling.transforms.centerZ(createPanel(option));
  let _x = L/2
  let f_x = _x - T/2
  let x = _x    + H / 2 
  const left =bakeTransform( 
    translate(Fitting?[-f_x, 0, T/2+  H / 2]:[-x, 0, 0], 
              Fitting?rotate([Math.PI / 2, 0, Math.PI / 2], sideBase):
              rotate([0, 0, Math.PI / 2],sideBase)));
  const right =bakeTransform( 
    translate(Fitting?[f_x, 0, T/2+  H / 2]:[x, 0, 0],
              Fitting?rotate([Math.PI / 2, 0, Math.PI / 2], sideBase):
              rotate([0, 0, Math.PI / 2],sideBase)));
  return [left,right]
}


 
 