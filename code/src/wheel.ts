//wheel.ts
import modeling from "@jscad/modeling";
const { geom3 } = modeling.geometries;
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
  spielA :0.2,
  spielB : 0
}
const unionReturn = (...csg:any)=> csg.map((c:any)=>{
  if (Array.isArray(c)){
    return unionReturn(...c)
  }
  if (geom3.isA(c)){
    const _c = geom3.create(geom3.toPolygons(c as geom3.Geom3))
    _c.color = c.color
    return _c
  }
  return c
})

export const sunB = (opt:any={})=>{
  const {miniWheelopt,height ,heightSlit}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
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
export const sunA = (opt:any={})=>{
  //console.log("sun",opt.DefaultOpt.miniWheelopt.gA)
  const {o,miniWheelopt,height,heightSlit,slit}=Object.assign({o:2.2,...DefaultOpt},opt.DefaultOpt||{})
  //console.log("sun",miniWheelopt,opt.DefaultOpt)
  const baseR = miniWheelopt.gA.modul*miniWheelopt.gA.sun/2+miniWheelopt.gA.modul*2 

  return unionReturn(...modeling.transforms.translateZ(height+heightSlit+slit, [  
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
    )),
    gear.getGearEasy({
      bohrung : o,
      height:height,
      spiel:0,
      modul:miniWheelopt.gA.modul,
      gearNum:miniWheelopt.gA.sun,
      dif:0,txx:heightSlit,txxEnd:heightSlit})
    ]
  ))
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
export const plantGroup = (opt:any={})=>{
    const {heightSlit,
    miniWheelopt,height,slit,plantO,spielA,spielB 
  }=Object.assign({},DefaultOpt,(opt.DefaultOpt||{spielA :0.2,spielB : 0}) );
  const r = (miniWheelopt.gA.sun + miniWheelopt.gA.plant)/2 * miniWheelopt.gA.modul
  const pie = gear.PI2/3
  const p =  plant(opt)
  test
  return unionReturn(
    ...modeling.transforms.translate([...gear.pol_zu_kart([r,pie*0])] as any,p),
    ...modeling.transforms.translate([...gear.pol_zu_kart([r,pie*1])] as any,p),
   ...modeling.transforms.translate([...gear.pol_zu_kart([r,pie*2])] as any,p)
  )
}
const plant = ( opt:any={spielA :0.2,spielB : 0})=>{  
  const {heightSlit,
    miniWheelopt,height,slit,plantO,spielA,spielB 
  }=Object.assign(DefaultOpt,(opt.DefaultOpt||{spielA :0.2,spielB : 0}) );
  if (miniWheelopt.gA.plant*miniWheelopt.gA.modul > miniWheelopt.gB.plant*miniWheelopt.gB.modul){
    return modeling.transforms.translateZ(height*2+heightSlit ,modeling.transforms.mirrorZ([
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
    ]))
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

  const {miniWheelopt,height,slit,width,heightSlit}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
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
  return unionReturn(...modeling.transforms.translateZ(height+heightSlit+slit, [ Ring,r1,
    // modeling.primitives.cylinder({height,radius:1,center:[ringArWidth,0,height/2]}),
    // modeling.extrusions.extrudeLinear({height},
    //  modeling.booleans.subtract(...cy)) ,
    modeling.transforms.translateZ(height,rss)]))
}
export const ringB = (opt:any={})=>{
  const {miniWheelopt,height,slit,width,heightSlit}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
  //getRingAr();
  const ringAr = miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit
  const rAr =ringAr+width+slit;
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
      
      //return rss
      for (let i =0;i<m;i++){
        rss.push(modeling.transforms.rotateZ(i*ragX*gear.radX, r3_1))
      }
      rss.push(Ring,
        ...modeling.transforms.translateZ(
            height+l,
            r4,
            r4_1
        )
      )
  return unionReturn(...rss)
}

export const ringBCap = (opt:any={})=>{
  const {miniWheelopt,height,slit,width,heightSlit}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
//getRingAr();
  const ringAr = miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit
  //const ringAr = getRingAr()
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
  ].reverse() as any});

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
    ringBLib(0.3,opt),
    bottom
  ]
};
const ringBLib = (t=0,opt:any={})=>{
  const {miniWheelopt,height,slit,width,heightSlit}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
  const {polygon} = modeling.primitives
  const ringAr = miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit
  const rAr =ringAr+width+slit;
  const rA = rAr+width; 
  const l = 0.8
  //const rag_1 = (rag-0.5)*this.gearBase.radX
  const k =  slit*2
  const _width =width  -k
  const m = 3;
  const ragX =360/m;
  const layer = height 
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
  return modeling.booleans.subtract(r2,rss) 
};

export const ringPlantFix = (opt:any={})=>{ 
  
  const {miniWheelopt,height,slit,width,heightSlit,plantO}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
  const ringAr = miniWheelopt.gA.ring*miniWheelopt.gA.modul/2+miniWheelopt.gA.modul+slit
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
  ].reverse() as any});
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
    ringPlantFixBase(opt),
    modeling.primitives.circle({ center: [0, 0], radius:rAr/2  }), 
  ]))
  return  [
    ringBLib(1),
    modeling.transforms.translateZ(-1,
    modeling.booleans.subtract(bottom,modeling.transforms.translateZ(-0.8,rss_)))
  ]
};

const   ringPlantFixBase = (opt:any)=>{
  //const o = 5;
  const {miniWheelopt,height,slit,width,heightSlit,plantO}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})
  const p = boFix(plantO)
  const pie = gear.PI2/3 
  const r = (miniWheelopt.gA.sun+miniWheelopt.gA.plant) /2 * miniWheelopt.gA.modul;// (this.Agear[0]+this.Agear[1])/2 * this.Agear[2]
  return modeling.booleans.union([
    //this.primitives.circle({ center: [0, 0], radius: r-1 }),
    modeling.transforms.translate( gear.pol_zu_kart([r,pie*0]) as any,p),
    modeling.transforms.translate( gear.pol_zu_kart([r,pie*1]) as any,p),
    modeling.transforms.translate( gear.pol_zu_kart([r,pie*2]) as any,p),
  ])
}
export const plantFix = (opt:any)=>{ 

  const {miniWheelopt,height,slit,width,heightSlit,plantO}=Object.assign({},DefaultOpt,opt.DefaultOpt||{})

  const p = boFix(plantO*0.95)
  const r =(miniWheelopt.gA.sun+miniWheelopt.gA.plant) /2 * miniWheelopt.gA.modul;// (this.Agear[0]+this.Agear[1])/2 * this.Agear[2]
  const pie = gear.PI2/3
  const k =  modeling.primitives.rectangle({
      center: [0.5, 0],
      size: [plantO,1]
  })
  return  modeling.transforms.translateZ(-1 ,  [
    modeling.extrusions.extrudeRotate({
        segments: miniWheelopt.gB.ring  
    }, 
    modeling.transforms.translateX(r,k)),
    modeling.extrusions.extrudeLinear({
      height: 5,
      twistAngle: 0,
      twistSteps: 1,
      //repair: true
    },modeling.booleans.union(
      modeling.transforms.translate([...gear.pol_zu_kart([r,pie*0])] as any,p),
      modeling.transforms.translate([...gear.pol_zu_kart([r,pie*1])] as any,p),
      modeling.transforms.translate([...gear.pol_zu_kart([r,pie*2])] as any,p)
    ))
  ])
};