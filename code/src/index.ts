import modeling from "@jscad/modeling";
import {gear} from './gear.ts' 
const miniWheelopt = {
   gA: { sun: 7, plant: 29, ring: 65, modul: 0.7 },
   gB: { sun: 13, plant: 29, ring: 71, modul: 0.6 }
} 
const height = 4
const width = 2
const slit = 0.2
const heightSlit = 0.8
const plantO=9
export const main = ()=>{
    //modeling.geometries.geom3
    return [modeling.primitives.sphere({radius:2}),modeling.primitives.circle({radius:10})]
}

export const sunA = (o=2.2)=>{
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
      ),modeling.transforms.translateZ(height/2, 
     
        modeling.extrusions.extrudeLinear({height:height/2},
          modeling.booleans.subtract(
          modeling.primitives.circle({
            radius:baseR+miniWheelopt.gA.modul*2}
          ),
          modeling.primitives.circle({
            radius:o/3*2}
          ),
          modeling.primitives.rectangle({size:[o ,baseR*3]})
        ),
    //  modeling.primitives.cylinderElliptic({height:height/2,center:[0,0,height/4],startRadius:[o/2,o/2],endRadius:[o ,o ]})
    ),),),
  
   /*
      modeling.extrusions.extrudeLinear({height:height},
        modeling.booleans.subtract(
        modeling.primitives.circle({
          radius:miniWheelopt.gA.modul*miniWheelopt.gA.sun/2 - miniWheelopt.gA.modul/3*2}
        ),
        modeling.primitives.circle({
          radius:o/2}
        )
       )
      ),
      */
      gear.getGearEasy({
        bohrung : o,
        height:height,
        spiel:0,
        modul:miniWheelopt.gA.modul,
        gearNum:miniWheelopt.gA.sun,
        dif:0,txx:heightSlit,txxEnd:heightSlit})
      ]
}
export const sunB = ()=>{
  const h = height+heightSlit/2
  const g = gear.getGear({bohrung : 0,
    height:h ,
    //spiel:0.1,
    modul:miniWheelopt.gB.modul,
    gearNum:miniWheelopt.gB.sun, 
    dif:0 ,
    txx:heightSlit,
    txxEnd:heightSlit*2
    })
  //  if (miniWheelopt.gB.sun<miniWheelopt.gA.sun)
       // return modeling.transforms.rotateZ(,g)
  return g
}