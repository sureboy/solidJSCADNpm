import modeling from "@jscad/modeling";
//import modeling from './lib/modeling.esm.js'
import {gear} from './gear.ts' 
export const DefaultOpt = {
  miniWheelopt : {
   gA: { sun: 7, plant: 29, ring: 65, modul: 0.7 },
   gB: { sun: 13, plant: 29, ring: 71, modul: 0.6 }
  } ,
  height : 4, 
  heightSlit : 0.8 
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
            radius:baseR}
          ),
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
 