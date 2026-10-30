import {gear} from './gear.js' 
import modeling from './lib/modeling.esm.js';
import {motor} from './motor.js'
import {bottom} from './bottom.js' 
 
const miniWheelopt = {
   gA: { sun: 7, plant: 29, ring: 65, modul: 0.7 },
   gB: { sun: 13, plant: 29, ring: 71, modul: 0.6 }
} 
const height = 4
const width = 2
const slit = 0.2
const heightSlit = 0.8
const plantO=9
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
const getRingAr = ()=>miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit;

const base= Object.assign({},modeling)
const Motor = Object.assign(new motor,base)
const Bottom = Object.assign(new bottom,base)
Motor.wheel = {
    width,
    slit,
    ringA:miniWheelopt.gA.ring,
    ringAr:getRingAr(),
    layer:height
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
    spiel:0.1,
    modul:miniWheelopt.gB.modul,
    gearNum:miniWheelopt.gB.sun, dif:0 ,txx:heightSlit,txxEnd:heightSlit*2})
  //  if (miniWheelopt.gB.sun<miniWheelopt.gA.sun)
       // return modeling.transforms.rotateZ(,g)
  return g
}
export const plant = (o=plantO,spielA =0.2,spielB = 0)=>{ 

    if (miniWheelopt.gA.plant*miniWheelopt.gA.modul > miniWheelopt.gB.plant*miniWheelopt.gB.modul){
        //hB+=0.6
        return [
           modeling.colors.colorize([1,0,0,1], gear.getGear({
              bohrung :boFix(o),
              height:height,
              modul:miniWheelopt.gA.modul,
              gearNum:miniWheelopt.gA.plant,spiel:spielA ,
              dif:-0.1 ,txx:heightSlit,txxEnd:heightSlit})),
            modeling.transforms.translateZ(
                height,
                gear.getGear({
                  bohrung :boFix(o),height:height+heightSlit,
                  modul:miniWheelopt.gB.modul,gearNum:miniWheelopt.gB.plant,
                  spiel:spielB ,dif:-0.2 ,txxEnd:heightSlit,txx: 2*heightSlit})
            )
        ]
    } 
    return [
        gear.getGear({bohrung :boFix(o),height:height,
          modul:miniWheelopt.gB.modul,gearNum:miniWheelopt.gB.plant,
          spiel:spielA ,dif:-0.2 ,txx:heightSlit,txxEnd:heightSlit}),
        modeling.transforms.translateZ(
            height,
            gear.getGear({bohrung :boFix(o),
              height:height+heightSlit,
              modul:miniWheelopt.gA.modul,gearNum:miniWheelopt.gA.plant,
              spiel:spielB ,dif:-0.2 ,txxEnd:heightSlit,txx: 2*heightSlit})
        )
    ]
        //hA+=0.6
    
    
}
const ShowPlant = (o=plantO)=>{
    if (miniWheelopt.gA.plant*miniWheelopt.gA.modul > miniWheelopt.gB.plant*miniWheelopt.gB.modul){
        return modeling.transforms.translateZ(height*2+heightSlit ,modeling.transforms.mirrorZ( plant(o)))
    }
    return plant(o)
}
export const ringA = ()=>{
    const minWidth = 1;
    const ringAr = getRingAr();
    const Ring = gear.getRing({
        spiel:0.00,
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
    /*
    const ringArWidth =  ringAr+width-slit*3
    //const rr1 = modeling.primitives.circle({radius:ringArWidth })
    const acr =  gear.PI2/ Math.floor(gear.PI2 * ringArWidth /3)
    let cy = [
      modeling.primitives.circle({radius:ringArWidth-slit,segments: miniWheelopt.gA.ring*2}),
      modeling.primitives.circle({radius:rr+width-minWidth,segments: miniWheelopt.gA.ring*2 }) 
    ]
    for (let i = 0;i<gear.PI2;i+=acr){
      //const tr = gear.pol_zu_kart([ringArWidth,i])
      cy.push(
        modeling.primitives.circle({
          radius:1, center:gear.pol_zu_kart([ringArWidth,i])
        }) 
      )
    }
*/
    return  [ Ring,r1,
     // modeling.primitives.cylinder({height,radius:1,center:[ringArWidth,0,height/2]}),
     // modeling.extrusions.extrudeLinear({height},
      //  modeling.booleans.subtract(...cy)) ,
      modeling.transforms.translateZ(height,rss)]
}
export const ringB = ()=>{
    //getRingAr();
    const rAr =getRingAr()+width+slit;
    const rA = rAr+width;
    const ran = ( (rA*2*Math.PI)/4);     
    const rag = Math.floor( 360/ran  );
    const l = 0.8
    const cr = miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit/2;
    //const crB = miniWheelopt.gB.ring*miniWheelopt.gB.modul/2+miniWheelopt.gB.modul+slit/2;
    //const cr = crA
    //const crr = this.rAr - cr;
    const m = 3;
    const ragX = 360/m;
    const _width = width- slit*2
    const w = _width - l/2/Math.tan(Math.PI/180*50)
    const r1_ = modeling.primitives.polygon({
        points:[
        [0,height/2],
        // [this.slit,this.layer/2],  
        [width,height+l ],
         
        [0,height+l ],
       // [slit*4,height ],
      //  [-width/2,height ],
      //  [slit*4,height+l ],
        //[width,height+l ],
    ]})
    const r1_1 = modeling.primitives.polygon({
        points:[
        [0,0],
        [width/2-slit,0],  
        [width/2, l/2],
        [width/2, l-slit],
        //[width-this.slit*2, l ],
        [0, height/2 ]
    ]})

    const minWidth = 0;
   
    const Ring =  gear.getRing({
        spiel:0.00,
        dif:0.1,
        randbreite: cr - miniWheelopt.gB.ring*miniWheelopt.gB.modul/2 +width/2+slit,
        height:height ,
        gearNum:miniWheelopt.gB.ring,
        modul:miniWheelopt.gB.modul})
       
    const r0 = modeling.primitives.polygon({
        points:[
            //[this.slit,0],
            [width,0],
            [width,height/2],
            //[this.width+0.2,this.layer+1],
            [width+slit*3,height],
            [width+slit*3,height+2],
            [slit*3,height+2],
            //[0,this.layer+1.4],
            [slit*3,height],
            [-slit,l],
            [-slit,0]
        ]}) 
    const r0_ = modeling.primitives.polygon({
        points:[
        [slit*4,height+2],
        [-slit*2,height+2],
        [-slit*2,height+1.4],
        [slit*4,height] ]}) 
    
    const r2Rotate = (ragX-rag)*gear.radX
    const r3Rotate = (rag)*gear.radX
    const r2 =  modeling.extrusions.extrudeRotate(
            {
              segments: miniWheelopt.gB.ring*2,angle:gear.PI2  }, 
            modeling.transforms.translateX(cr+width,r1_)
          ) ;
    const r3 =  modeling.extrusions.extrudeRotate(
        {
        angle:gear.PI2,
        //startAngle:r2Rotate/2 ,
        segments: miniWheelopt.gB.ring*2},
        modeling.transforms.translateX(cr+width,modeling.booleans.union([r1_1]))
    );
    
    const r1_2 = modeling.primitives.polygon({
          points:[[0,0],
          [w,0],  
          [_width, l/2],
          [_width, l-slit],
          //[width-this.slit*2, l ],
          [0, height/2 ]
    ]})
    let rss = [
      Ring,
      r2,
      r3
    ]
    //return rss
        const r3_1 =  modeling.extrusions.extrudeRotate(
          {angle:r3Rotate,startAngle:r2Rotate/2 ,segments: miniWheelopt.gB.ring},
          modeling.transforms.translateX(cr+width, r1_2)
        );
        
        const r4 = modeling.extrusions.extrudeRotate({
          segments: miniWheelopt.gA.ring*2,angle:gear.PI2},
          modeling.transforms.translateX(cr+width,r0))
        //  return rss
        const r4_1 =modeling.extrusions.extrudeRotate({
          segments: miniWheelopt.gA.ring*2,
          startAngle:r2Rotate/4 ,
          angle:gear.PI2-r2Rotate/2,
          //angle:gear.PI2/2
        },
        modeling.transforms.translateX(cr+ width,r0_))
        
       // return Ring
        for (let i =0;i<m;i++){
          rss.push(modeling.transforms.rotateZ(i*ragX*gear.radX, r3_1))
        }
        rss.push(Ring, modeling.transforms.translateZ(height+l,r4,r4_1))
    return rss
}
const ringBLib = (t=0)=>{
    const {polygon} = modeling.primitives
    const rAr =getRingAr()+width+slit;
    const rA = rAr+width;
    //const ran = ( (rA*2*Math.PI)/4.5);     
    //const rag = Math.floor( 360/ran  );
   

    const l = 0.8
    //const rag_1 = (rag-0.5)*this.gearBase.radX
    const k =  slit*2
    const _width =width  -k
    const m = 3;
    const ragX =360/m;
    const layer = height
    //const r2Rotate = (ragX-rag)*this.gearBase.radX
    //const r3Rotate = (rag)*this.gearBase.radX
    const rag4 = Math.floor( 360/( (rA*2*Math.PI)/4.2)  );
    const p2_ = polygon({points:[
      [0,0],
      [-k,0],
      [width+slit*2,0 ],
      [width+slit*2,layer],
      [-l,layer ],
      [-l,0]
    ]});
    const p = polygon({points:[
      // [k,0],
      [width+slit,0 ] ,
      [width+slit,l ] ,
      [_width,layer/2 ],
      [_width,layer/2+l+slit ],
      [k+t/2,layer/2+l+slit ],
      [t,layer/2+slit ],
      [t,layer/2 ],
      [k+t,l ],
      [k+t,0 ],
     // [k,0 ],
     // [k,this.layer/2]
    ]});
    const ra = modeling.extrusions.extrudeRotate(
      {
        segments: miniWheelopt.gB.ring*2,
        startAngle:(( (ragX-rag4)*gear.radX)/2),
        angle:  (rag4)*gear.radX
      },modeling.transforms.translateX(rAr,p2_))
/*
    const ra_2 = this.extrusions.extrudeRotate(
        {
          segments: this.ringB*2,
          startAngle:-r3Rotate/2,
          angle:  r3Rotate
        },this.transforms.translateX(this.rAr-this.slit,p1_))
        */
    //return ra
    const r2 =  modeling.extrusions.extrudeRotate(
      {
        segments:  miniWheelopt.gA.ring*2,
        angle: gear.PI2
      }, 
      modeling.transforms.translateX(rAr,p)
    ) ;
     let rss = [ ]
    for (let i =0;i<m;i++){
      rss.push(modeling.transforms.rotateZ(i*ragX*gear.radX, ra))
    }
    //return r2
    return modeling.booleans.subtract(r2,rss)
 
  };
export const ringPlant = ()=>{
    const ringAr = getRingAr()
    const rAr =ringAr + width+slit*2
    const rAr_ = rAr+width;  
    const rag4 = Math.floor( 360/( (rAr_*2*Math.PI)/4.2)  );  
    const m = 3;
    const ragX =360/m;
    const p2_ = modeling.primitives.polygon(
      {points:[
      [slit,-1],
      [-width*2,-1 ],
      [-width*2,0],
      [slit,0 ]
    ].reverse()});

    const p1_ = modeling.primitives.polygon(
      {points:[
      [0,-1],
      [-width/2,-1 ],
      [-width/2,0],
      [0,0 ]
    ].reverse()});

    const ra = modeling.extrusions.extrudeRotate(
    {
      segments:miniWheelopt.gB.ring , 
      angle:  (rag4)*gear.radX
    },modeling.transforms.translateX(rAr_,p2_))

 
    let rr1 = 40*(gear.radX)
    let rr = 0*(gear.radX)
    const x = rAr_ *Math.cos(rr) 
    const y = rAr_* Math.sin(rr) 
    let x_ =x- rAr_*Math.cos(rr1) 
    let y_ =y-rAr_* Math.sin(rr1)   
    const ra1 =  modeling.transforms.translate( 
      [x_,y_  ],
      modeling.transforms.rotateZ(rr1,
        modeling.extrusions.extrudeRotate(
      {
        segments:miniWheelopt.gB.ring ,
        startAngle:(( (rag4)*gear.radX)/2),
        angle:  (ragX/2)*gear.radX
      },modeling.transforms.translateX(rAr_,p1_)))) 
    const ra2 =  modeling.transforms.translate( 
      [x_,y_  ],
      modeling.transforms.rotateZ(rr1,modeling.extrusions.extrudeRotate(
        {
          segments:miniWheelopt.gB.ring, 
          angle:  (ragX/2)*gear.radX
        },modeling.transforms.translateX(rAr_,p1_))
      )
      )
    let rss=[]
    let rss_=[]
    //console.log(Math.sin(0),Math.cos(0))
    for (let i =0;i<m;i++){
        const rr = (i*ragX)*(gear.radX)
        rss_.push(modeling.transforms.rotateZ(rr,ra2))
        rss.push(modeling.transforms.rotateZ(rr,[ra,ra1]))
    }
    //return modeling.booleans.union(rss)
    const bottom = modeling.booleans.subtract( 
        modeling.primitives.cylinder({
            center: [0, 0, -0.5],
            height: 1,
            radius: rAr_,
            segments: miniWheelopt.gB.ring*2
        }),
        modeling.transforms.rotateZ( ( (ragX-rag4)*gear.radX)/2, modeling.booleans.union(rss)),
        modeling.transforms.translateZ(-0.8 , modeling.booleans.union(rss_))     
    )
    return  [
      ringBLib(0.3),
      bottom
    ]
  };


const   ringPlantFixBase = (o=plantO)=>{
    //const o = 5;
    const p = boFix(o)
    const pie = gear.PI2/3 
    const r = (miniWheelopt.gA.sun+miniWheelopt.gA.plant) /2 * miniWheelopt.gA.modul;// (this.Agear[0]+this.Agear[1])/2 * this.Agear[2]
    return modeling.booleans.union([
      //this.primitives.circle({ center: [0, 0], radius: r-1 }),
      modeling.transforms.translate( gear.pol_zu_kart([r,pie*0]),p),
      modeling.transforms.translate( gear.pol_zu_kart([r,pie*1]),p),
      modeling.transforms.translate( gear.pol_zu_kart([r,pie*2]),p),
    ])
  }
export const ringPlantFix = (o=plantO)=>{ 
    const ringAr = getRingAr()
    const rAr =ringAr + width+slit*2
    const rAr_ = rAr+width;  
    const m = 6;
    const ragX =360/m;
    
    let rr1 = 40*(gear.radX)
    let rr = 0*(gear.radX)
    const x = rAr_ *Math.cos(rr) 
    const y = rAr_* Math.sin(rr)
    //console.log(rAr_)
    let x_ =x- rAr_*Math.cos(rr1) 
    let y_ =y-rAr_* Math.sin(rr1)  
    const p1_ = modeling.primitives.polygon({points:[
    [0,-1],
    [-width/2,-1 ],
    [-width/2,1],
    [0,1 ]
  ].reverse()});
    let ra2 =  modeling.transforms.translate( [x_,y_  ],
      modeling.transforms.rotateZ(rr1,modeling.extrusions.extrudeRotate(
      {
        segments:miniWheelopt.gB.ring, 
        angle:  (ragX/2)*gear.radX
      },modeling.transforms.translateX(rAr_,p1_)))) 
      let rss_=[] 
      for (let i =0;i<m;i++){
 
        rss_.push(modeling.transforms.rotateZ((i*ragX)*(gear.radX),ra2))
      }

    const bottom =modeling.extrusions.extrudeLinear({ height: 1}, 
    modeling.booleans.subtract([
            modeling.primitives.circle({ center: [0, 0], radius:rAr_,segments:miniWheelopt.gB.ring }),
      ringPlantFixBase(o),
      modeling.primitives.circle({ center: [0, 0], radius:rAr/2  }), 
    ]))
    return  [
      ringBLib(1),
      modeling.transforms.translateZ(-1,
      modeling.booleans.subtract(bottom,modeling.transforms.translateZ(-0.8,rss_)))
    ]
  };
export const   plantFix = (o = plantO)=>{ 
    const p = boFix(o*0.95)
    const r =(miniWheelopt.gA.sun+miniWheelopt.gA.plant) /2 * miniWheelopt.gA.modul;// (this.Agear[0]+this.Agear[1])/2 * this.Agear[2]
    const pie = gear.PI2/3
    const k =  modeling.primitives.rectangle({
        center: [0.5, 0],
        size: [o,1]
    })
    return [
        modeling.extrusions.extrudeRotate({
            segments: miniWheelopt.gB.ring  
        }, 
        modeling.transforms.translateX(r,k)),
    modeling.extrusions.extrudeLinear({
    height: 5,
    twistAngle: 0,
    twistSteps: 1,
    repair: true
  },modeling.booleans.union(
    modeling.transforms.translate([...gear.pol_zu_kart([r,pie*0])],p),
    modeling.transforms.translate([...gear.pol_zu_kart([r,pie*1])],p),
    modeling.transforms.translate([...gear.pol_zu_kart([r,pie*2])],p)
      ))]
  };
 
export const bottomBase = ()=>{
  return Bottom.base({},null);
}
export const bottomPCBFix = ()=>{
  return [
    Bottom.PCBFix(),
   
    modeling.transforms.translate([-(21.5/2+1+1),0,Bottom.option.height/2+7+15],
     modeling.transforms.centerX(
      modeling.transforms.rotateY(Math.PI/2,Bottom.PCBFixEnd())
     )
    )
   
  ];
}
export const PCBFixEnd = ()=>{
  return Bottom.PCBFixEnd();
}
export const PCBFix = ()=>{
  return Bottom.PCBFix();
}
export const motorRoom = ()=>{
  return Motor.motorRoom();
}
export const Wheel = (Wheelopt={})=>{
  Object.assign(miniWheelopt,Wheelopt)
  const p =ShowPlant()
  const r = (miniWheelopt.gA.sun + miniWheelopt.gA.plant)/2 * miniWheelopt.gA.modul
  const pie = gear.PI2/3
  //console.log(r,miniWheelopt.gA.modul,pie)
  //return p
  //return modeling.transforms.translate([...gear.pol_zu_kart([r,pie*0])],p)
  return  [
    miniWheelopt,
     //modeling.transforms.mirrorZ(ringA()),
     
      //modeling.colors.colorize([0,1,1,0.2],plantFix()),
      //ringPlantFix(),
      ringB(),
      sunB(),
      //modeling.transforms.rotateZ(gear.PI2/miniWheelopt.gB.sun/2,sunB()),
      modeling.transforms.translateZ(
          height+heightSlit+slit,
          modeling.transforms.translateZ( height,Motor.motorRoom()),
          modeling.colors.colorize([0,1,1,1],sunA()),
          ringA()
          ),
          modeling.transforms.translate([...gear.pol_zu_kart([r,pie*0])],p),
          modeling.transforms.translate([...gear.pol_zu_kart([r,pie*1])],p),
          modeling.transforms.translate([...gear.pol_zu_kart([r,pie*2])],p),  
       
  ]
}
/*
export const main = (opt={test:1})=>{   
  opt.test++
  console.log(opt)
  const motor = modeling.transforms.translateY( 
    -(Bottom.option.between+Motor.height+Motor.lar ),
  modeling.transforms.rotate([Math.PI/2,-Math.PI/2,Math.PI],
    Motor.motorRoom()
  ))
    return [
      opt,
      //wheel,
      //Bottom.PCBFix(),
      bottomBase(),
      modeling.transforms.translateZ(Bottom.option.height/2,
        motor,
        modeling.transforms.mirrorY( 
        motor
      )),
      //motor,
      // modeling.transforms.rotate( [Math.PI/2,Math.PI/2,0],modeling.transforms.translateZ(Bottom.option.between ,wheel)),
      
    ]
}*/