import modeling from "@jscad/modeling";
//import modeling from './lib/modeling.esm.js'
import {gear} from './gear.ts' 
const miniWheelopt = {
   gA: { sun: 7, plant: 29, ring: 65, modul: 0.7 },
   gB: { sun: 13, plant: 29, ring: 71, modul: 0.6 }
} 
const height = 4
//const width = 2
//const slit = 0.2
const heightSlit = 0.8
//const plantO=9
const main = ()=>{
    //modeling.geometries.geom3
    return [modeling.primitives.sphere({radius:2}),modeling.primitives.circle({radius:10})]
}
const { geom3 } = modeling.geometries;
//type geoType = geom3.Geom3  |(geom3.Geom3[])
function bakeTransform ( geo:any):any  {
  if (Array.isArray(geo)){
    return geo.map(g=>{
      return bakeTransform(g) 
    })  
  }
  if (geo.polygons){
    const baked = geom3.create(geom3.toPolygons(geo));
    // 保留颜色等属性（可选）
    baked.color = (geo as geom3.Geom3).color;
    return baked;
  }
  return geo
};
export const sunA = (opt={})=>{
  const {o}=Object.assign({o:2.2},opt)
  const baseR = miniWheelopt.gA.modul*miniWheelopt.gA.sun/2+miniWheelopt.gA.modul*2
  console.log(o,o/2,baseR,height)
 
    return [ 
       bakeTransform(
        modeling.transforms.translateZ(height, 
          modeling.extrusions.extrudeLinear({height:height/2},
            modeling.booleans.subtract(
              modeling.primitives.circle({
                radius:baseR}
              ),
              modeling.primitives.circle({radius:o/2})
            )
          ) ,
          //  bakeTransform(
          modeling.transforms.translateZ( height/2,  
            modeling.extrusions.extrudeLinear({height:height/2},
              modeling.booleans.subtract(
              modeling.primitives.circle({
                radius:baseR+miniWheelopt.gA.modul*2}
              ),
              modeling.primitives.circle({
                radius:o/3*2}
              ),
              modeling.primitives.rectangle({size:[o ,baseR*3]})
            )),
          //modeling.primitives.cylinderElliptic({height:height/2,center:[0,0,height/4],startRadius:[o/2,o/2],endRadius:[o ,o ]})
        )
      )),
      gear.getGearEasy({
        bohrung : o,
        height:height,
        spiel:0,
        modul:miniWheelopt.gA.modul,
        gearNum:miniWheelopt.gA.sun,
        dif:0,txx:heightSlit,txxEnd:heightSlit})
      ]
}
 