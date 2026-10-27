import modeling from './lib/modeling.esm.js';
export const motor = class {
 //const motor__9tltqb =class{
//Input Ctrl+S perview and save this solid
  height = 25;
  mX = 15;
  mY = 20;
  lar = 5.5 +1
  Pi90 = Math.PI/2;
  earY = 7+1
  motorFixBody(between=5){
    const m1 =  this.transforms.translateY(-between,
      this.transforms.rotate([this.Pi90,-this.Pi90,0],
      [
        this.colors.colorize([0,1,1,0.2],this.motor()), 
        this.transforms.translateZ(this.height+this.lar,this.transforms.mirrorZ(this.motorRoom()))
      ]))
    //const m=this.transforms.translateY(-20,this.transforms.rotate([this.Pi90,0,0],this.motor()))
    const m2= this.transforms.mirrorY(m1)
    return  [m1,m2]
  };
  /*
  motorFix(){
    const b = this.transforms.translateZ(this.mX/2,this.extrusions.extrudeLinear({
    height: 1,
    }, this.booleans.subtract(
      [
      this.primitives.roundedRectangle({size:[49,52],roundRadius: 1.5}),    
      this.primitives.circle({
        center: [18.5, 20],
        radius: 3.3,     
      }),
      this.primitives.circle({
        center: [18.5, -20],
        radius: 3.3,     
      }),
      this.primitives.circle({
        center: [-18.5,-20],
        radius: 3.3,     
      }),
      this.primitives.circle({
        center: [-18.5,20],
        radius: 3.3,     
      }),
    ])))
    return [b,this.motorFixBody()]
  };
   
  motork(obj,size,x,y,opt={}){
 return  this.booleans.union(obj({
            center: [x, y],
            size,
 ...opt
          }),
        obj({
            center: [-x, y],
            size,
 ...opt
          }),
        obj({
            center: [-x, -y],
            size,
 ...opt
          }), obj({
            center: [x, -y],
            size,
 ...opt
          }),
                            )
  }
                            */
  motorRoom(){
    const rh = 12
    const lar = this.lar
    const ext = this.wheel.width+this.wheel.slit*4
    const b_1 = this.motorlib(this.mY-1,this.mX-1)
    const b_2 = this.motorlib(this.mY ,this.mX )
    const b2  = this.motorlib(this.mY+ext,this.mX+ext)
    //const b2  = this.motorlib(this.mY+ext*2,this.mX+ext)
    const b3  = this.motorlib(this.mY+ext*3,this.mX+ext*4)
    /*
    const earX = (this.mX -ext+3 )/2    
    const earY = this.earY+4
    const earXD = 6
    const b_3 = this.primitives.circle({
      center: [0, 0],
      radius: this.mX, 
      segments: this.wheel.ringA
    })
      */
    const cover = this.hulls.hull(
      //this.motork( this.primitives.roundedRectangle,[3,8],earX-4 ,earY,{roundRadius: 1}),
      this.primitives.roundedRectangle({size:[10.5,(this.mY+ext+9.5)],roundRadius: 1}) ,
      b2,
       // this.primitives.circle({ center: [0,0], radius: (this.mY+ext)/2 }) 
    )
    const cover1 = this.hulls.hull(
      //this.motork( this.primitives.roundedRectangle,[3,8],earX-4 ,earY,{roundRadius: 1}),
      this.primitives.roundedRectangle({size:[10.5,(this.mY+ext+9.5)],roundRadius: 1}) ,
      b2,
      //  this.primitives.circle({ center: [0,0], radius: (this.mY+ext)/2 }) 
    )
    const ttt1 = modeling.primitives.rectangle({size:[this.mX*2,2],center:[0,this.mY/2]})
    const ttt2 = modeling.transforms.mirrorY(ttt1)
    const h2 = 3
    const h3 = 4.4
    return  [    
      this.transforms.translateZ(rh+lar,
        // modeling.booleans.subtract(
        // modeling.booleans.union( 
        modeling.transforms.translateZ(-0.5,
        this.extrusions.extrudeLinear({height: h2+0.5},
        this.booleans.subtract( 
          //modeling.booleans.union(
          cover,
            //b_3
          //),
          b_2,
          modeling.primitives.rectangle({size:[70,2]}),
          //modeling.primitives.rectangle({size:[this.mX*2,3],center:[0,this.mY/2-1]}),
          ttt1,ttt2,
          modeling.primitives.rectangle({size:[7.2,(this.mY+ext)+5.2]}),
          
          //this.motork(this.primitives.rectangle,[4,8],earX-earXD,earY-2),        
        ))),
      this.transforms.translateZ( h2,
        this.extrusions.extrudeLinear({height: h3},
        this.booleans.subtract( 
          //modeling.booleans.union(
          //  cover,
         //   modeling.primitives.rectangle({size:[this.mX,(this.mY*2)]}),
            b2,
          //),
          b_2,
          //this.motorlib(this.mY-1 ,this.mX ),
          ttt1,ttt2,
          modeling.primitives.rectangle({size:[this.mX-ext,(this.mY+ext)+10]}),
          //this.motork(this.primitives.rectangle,[4,8],earX-earXD,earY-2),        
        )),
        modeling.transforms.translate([this.mX/2,0,h3-0.5], modeling.transforms.rotateX(Math.PI/2, modeling.primitives.cylinder({height:this.mX,radius:0.5}))),
        modeling.transforms.translate([-this.mX/2,0,h3-0.5], modeling.transforms.rotateX(Math.PI/2, modeling.primitives.cylinder({height:this.mX,radius:0.5}))),
      )),
        //this.extrusions.extrudeLinear({height: 7}, modeling.primitives.rectangle({size:[this.mX*2,3],center:[0,this.mY/2-1]})),
        //this.extrusions.extrudeLinear({height: 7}, modeling.primitives.rectangle({size:[this.mX*2,3],center:[0,-(this.mY/2-1)]}))
     // )
     // ),
 
      this.booleans.subtract(    
        modeling.booleans.union(   
        modeling.hulls.hullChain(
        //modeling.booleans.union(
        this.transforms.translateZ(rh-1+lar,
        this.extrusions.extrudeLinear({height: 1}, 
           cover
        )),
      // modeling.transforms.translateZ(1,  this.extrusions.extrudeLinear({ height: 0.1 },  b2,)),
        this.extrusions.extrudeLinear({ height: 1 },  b2,)
        ),
        modeling.hulls.hullChain(         
          modeling.transforms.translateZ(this.wheel.layer,  this.extrusions.extrudeLinear({ height:  1 },  b2,)),
          modeling.extrusions.extrudeLinear({ height:1 },  b3)
        )),
        this.hulls.hull(
          this.transforms.translateZ(rh-1+lar,
            this.extrusions.extrudeLinear({height: 1}, 
          modeling.primitives.rectangle({size:[70,2]}),
        )),
        this.extrusions.extrudeLinear({ height: 1 },
          modeling.primitives.rectangle({size:[70,5]}))
        ),
        this.extrusions.extrudeLinear({ height: lar }, b_1),
        this.transforms.translateZ(lar,
          this.extrusions.extrudeLinear({ height: rh  }, 
            b_2)),     
        this.transforms.translateZ(10,
          this.extrusions.extrudeLinear({
            height:(lar+2)}, 
            modeling.primitives.rectangle({size:[7.2,(this.mY+ext)+10]}),
              ),),
      
       // modeling.primitives.cuboid({radius:2,size:[70,5,(lar)],center:[0,0,(10+(lar+1.5))/2 ]}),
        /*
        modeling.transforms.translateZ(rh,
          modeling.extrusions.extrudeLinear({
            height:10
          },
            ttt1,ttt2,
          )
        )*/
      ),
      modeling.booleans.subtract(
        this.ringALib(b_1),
        modeling.primitives.cuboid({size:[70,5,this.wheel.layer],center:[0,0,this.wheel.layer/2]}),
      )
      
    ] 
    
  };
   
  motor(){ 
    const endH = 2
    const beginH = 1.6
    const axleH = 38
    const end = this.booleans.intersect(
      this.primitives.rectangle({
        center: [1, 0],
        size: [10, 10],       
      }),
      this.primitives.circle({
        radius: 5 ,       
      })
    )    
    const link = [
      this.primitives.cuboid({
        center: [15/2+1.5/2, 0,2.5 ],
        size: [1.5,8,5]
      }),
      this.primitives.cuboid({
        center: [15/2+0.5, 0,3 ],
        size: [0.5,15,3]
      }),
    ]
    //return end
    return [
      link,
      this.primitives.cylinder({
        center: [0, 0, this.height+beginH/2],
        height: beginH,
        radius: 3,  
      }),
      this.transforms.translateZ(axleH/2,this.primitives.cylinder({
        center: [0, 0, -endH-1],
        height: axleH,
        radius: 1,  
      })),
      this.transforms.translateZ(-endH, this.extrusions.extrudeLinear({height:endH},end)),
      this.extrusions.extrudeLinear({ height:this.height },this.motorlib()),
    ]
  };

  motorlib(mY=this.mY,mX=this.mX){
    return this.booleans.intersect(
      this.primitives.circle({
        center: [0, 0],
        radius: mY/2, 
        segments: this.wheel.ringA
      }),
      this.primitives.rectangle({
        center: [0,0],
        size: [mX,mY]
      }) 
    )
 
  }
  ringALib(center= this.primitives.circle({radius: 1})){
    const {extrudeRotate} = modeling.extrusions
    const {translateX,rotateZ} = this.transforms
    const {polygon} = this.primitives 
    const ringAr = this.wheel.ringAr;
    const width =  this.wheel.width+this.wheel.slit*3
 
    const h  = this.wheel.layer-1;
    //const center = this.wheel.Agear[0] * this.wheel.Agear[2];
    
 
    const r2 = extrudeRotate(
      {
        segments: this.wheel.ringA, 
        startAngle:-(Math.PI/6),
        angle:Math.PI/3
      },
      translateX(
        ringAr-width,
        polygon({
          points:[
            [0,0],
            [width,0],
            [width,h],
            [0,h]
    ]})))
    let rss = [
      r2,
      modeling.transforms.mirrorX(r2)
    ]
 
   //rotate([0,0,ang*i+ang/4]) rotate_extrude(angle=ang/2) translate([w1,0])   polygon([[0,0],[-width,0],[-width,h],[0,h]]);
    const centerP = modeling.extrusions.extrudeLinear({
      height: h
    },  
      center,
    )
    const maxR = ringAr
    const minR = ringAr-width/2
    const p =  modeling.booleans.subtract(
        modeling.transforms.translateZ(h/2,
        modeling.primitives.cylinderElliptic({
      height:h,
      startRadius:[maxR,maxR],
      endRadius:[minR,minR],
    })),
    centerP,
    
  )
 
    return modeling.booleans.union([
      ...rss,
      p, 
    ]);
  }
  init(){
     //this.wheel.init()
  } 
  main(){
    this.init()
  return this.motorFixBody()
    
    return [
      this.motorRoom(),
      //this.transforms.translateZ(-this.wheel.layer,this.colors.colorize([1,0,0,0.5],this.wheel.showRingA())),
    ]
   
  };
}