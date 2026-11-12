import modeling from "@jscad/modeling";
//import modeling from './lib/modeling.esm.js'
import {gear} from './gear.ts' 
export const DefaultOpt = {
  miniWheelopt : {
   gA: { sun: 7, plant: 29, ring: 65, modul: 0.7 },
   gB: { sun: 13, plant: 29, ring: 71, modul: 0.6 }
  } ,
  height : 4, 
  width : 2,
  heightSlit : 0.8 ,
  slit : 0.2,
  plantO:9,
}

export const sunA = (opt:any={})=>{
  //console.log("sun",opt.DefaultOpt.miniWheelopt.gA)
  const {o,miniWheelopt,height,heightSlit}=Object.assign({o:2.2,...DefaultOpt},opt.DefaultOpt||{})
  //console.log("sun",miniWheelopt,opt.DefaultOpt)
  const baseR = miniWheelopt.gA.modul*miniWheelopt.gA.sun/2+miniWheelopt.gA.modul*2 

  return [  
    modeling.transforms.translateZ(height, 
      modeling.extrusions.extrudeLinear({height:height/2},
        modeling.booleans.subtract(
          modeling.primitives.circle({
            radius:baseR
          }),
          modeling.primitives.circle({radius:o/2})
        )
      ),
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
    )
  ),
  gear.getGearEasy({
    bohrung : o,
    height:height,
    spiel:0,
    modul:miniWheelopt.gA.modul,
    gearNum:miniWheelopt.gA.sun,
    dif:0,txx:heightSlit,txxEnd:heightSlit})
  ]
}
const boFix = (o=5)=>{
    const o1 = o/2
    return modeling.booleans.union(
        modeling.primitives.circle({
            center: [0, 0],
            radius: o1,
        }),
        modeling.primitives.rectangle({
            center: [0.5, 0],
            size: [o,o1]
        })
    )
}; 

export const plant = ( opt:any={spielA :0.2,spielB : 0,})=>{  
  const {heightSlit,
    miniWheelopt,height,slit,plantO,spielA,spielB 
  }=Object.assign(DefaultOpt,opt.DefaultOpt||{})
  if (miniWheelopt.gA.plant*miniWheelopt.gA.modul > miniWheelopt.gB.plant*miniWheelopt.gB.modul){
    return [
      modeling.colors.colorize([1,0,0,1], gear.getGear({
        bohrung :boFix(plantO),
        height:height,
        modul:miniWheelopt.gA.modul,
        gearNum:miniWheelopt.gA.plant,
        spiel:spielA ,
        dif:-0.1 ,txx:heightSlit,txxEnd:heightSlit})),
      modeling.transforms.translateZ(
          height,
          gear.getGear({
            bohrung :boFix(plantO),height:height+heightSlit,
            modul:miniWheelopt.gB.modul,gearNum:miniWheelopt.gB.plant,
            spiel:spielB ,
            dif:-0.2 ,txxEnd:heightSlit,txx: 2*heightSlit})
      )
    ]
  } 
  return [
    gear.getGear({bohrung :boFix(plantO),height:height,
      modul:miniWheelopt.gB.modul,gearNum:miniWheelopt.gB.plant,
      spiel:spielA ,dif:-0.2 ,txx:heightSlit,txxEnd:heightSlit}),
    modeling.transforms.translateZ(
        height,
        gear.getGear({bohrung :boFix(plantO),
          height:height+heightSlit,
          modul:miniWheelopt.gA.modul,gearNum:miniWheelopt.gA.plant,
          spiel:spielB ,dif:-0.2 ,txxEnd:heightSlit,txx: 2*heightSlit})
    )
  ]
}

export const ringA = (opt:any={})=>{

  const {miniWheelopt,height,slit,width}=Object.assign(DefaultOpt,opt.DefaultOpt||{})
  const minWidth = 1;
  const ringAr =  miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit; 
  const Ring = gear.getRing({
      //spiel:0.00,
      dif:0.1,
      randbreite:width-minWidth +slit ,
      height ,
      gearNum:miniWheelopt.gA.ring,
      modul:miniWheelopt.gA.modul}) 
  const r0 = modeling.primitives.polygon({
      points:[ 
      [width-minWidth+0.3 ,0],
      [width,height-0.4],
      [width,height],
      [width-minWidth,height],
      [width-minWidth,0]    
  ]})  
  const r1 = modeling.extrusions.extrudeRotate({
    segments: miniWheelopt.gA.ring,
    angle:gear.PI2
  },

    modeling.transforms.translateX(ringAr,r0)
  )
    
  const rr = (miniWheelopt.gA.ring*miniWheelopt.gA.modul-miniWheelopt.gA.modul*2)/2 +slit; 
  const lh=4;         
  //const m = 3; 
  const _w = width
  const p2 = [[1.5,0],[_w+0.5,0],[_w,lh+0.6],[-0.5,lh+0.6]]; 
  const r2 = modeling.extrusions.extrudeRotate(
  {
    startAngle:Math.PI/6,
    segments: miniWheelopt.gA.ring*2,
    angle:Math.PI/3*2,},
    modeling.transforms.translateX(rr,modeling.primitives.polygon({points:p2})
    )
  )       
  const rss = [r2,modeling.transforms.mirrorY(r2)]  
  return  [ Ring,r1,
    // modeling.primitives.cylinder({height,radius:1,center:[ringArWidth,0,height/2]}),
    // modeling.extrusions.extrudeLinear({height},
    //  modeling.booleans.subtract(...cy)) ,
    modeling.transforms.translateZ(height,rss)]
}