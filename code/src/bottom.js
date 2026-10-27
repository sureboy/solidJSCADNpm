import modeling from './lib/modeling.esm.js';


export const bottom = class {
    option = {
        between:15,
        offsetX:18,
        batterySize:[18,66],
        height:7.2,
        fixHeight:5.6,
        xd : 1.8,
        tip:true
        
    }
    battery(opt){    
        const {batterySize} = Object.assign({},this.option,opt)
        return modeling.transforms.rotateY(Math.PI/2,modeling.primitives.cylinder({
          center: [0, 0, 0],
          height: batterySize[1],
          radius: batterySize[0]/2, 
        }));    
    };
    motorFixLine(opt){
      const {height,fixHeight} = Object.assign({},this.option,opt)
      const ext = 9.5
      const x_ = ext+7+1
      const x_1 = x_-2.5
      const y_ =  height/2 +2
      const y_1 = y_+4+3
      const y_2 = y_1+3
      const points = [
        [3,-(y_1)],        
        //[x_1-11.5,-(y_+1.5+2) ],
        //[x_1-10.3,-(y_+1.5+3) ],
        [x_1-5,-y_-1.5-2.5 ],  
        [x_1-4,-y_-1.5-1  ],
        [x_1-4.5,-y_-1.5-1  ],
        [x_1-6,-y_-1.5-2  ],
       
        [x_1-9.8,-y_-1.5-2  ],
        [x_1-10,-y_-1.5-3  ],
        [x_1-11.5,-y_-1.5-3  ],
        [x_1-10.5,-y_-1.5  ],
        [x_1-7,-y_-1.5  ],
        [x_1-6.5,-y_-0.5  ],
        [x_1-3,-y_-0.5  ],

        [x_1-1,-y_+1.8 ],
        [x_1,-y_+1.8 ],
        [x_1,y_-1.8],
        [x_1-1.7,y_-1.8],
        [x_1-2,y_-1.2],
        // [x_1-1,y_+2], 

        [x_1+1,y_+2], 
        [x_1+1.5,y_+2],         
        [x_,y_+1],  
        [x_,-y_],
        [x_1-4,-y_2+4],

        [3,-(y_1+3)],
       //[0,-(y_1+10)]
      ]
      const points_ = points.map(([x,y])=>{
        return [-x,y]
      }) 
      points_.push(...points.reverse())

     
      const k_ = modeling.geometries.geom2.fromPoints(points_ )
        
      
      //const k_ = this.booleans.union( [k,this.transforms.mirrorX(k)])
      //return k_
    
      //return this.booleans.union(k,this.transforms.mirrorY(k))
      //return k
      //return this.transforms.rotateX(-Math.PI/2,this.extrusions.extrudeLinear({height: 5.6}, k_))
 
      const out =modeling.booleans.union(
        modeling.transforms.translate([5,fixHeight/2+0.5,10], modeling.transforms.rotateY(Math.PI/180*20, modeling.primitives.cylinderElliptic({endRadius:[1,1],startRadius:[0.5,0.5],height:5}))),
        modeling.transforms.translate([13,fixHeight/2+0.5,5], modeling.transforms.rotateY(Math.PI/180*20, modeling.primitives.cylinder({radius:1,height:10}))),
      )
      const g =   this.booleans.subtract(
        modeling.booleans.union(
          this.transforms.rotateX(-Math.PI/2,this.extrusions.extrudeLinear({height: fixHeight}, k_)),
          //out
          //modeling.transforms.translate([7, 0, y_+4.5], modeling.transforms.rotateZ( Math.PI/180*30, modeling.primitives.cuboid({size:[2,1,3]}))),
          //modeling.transforms.translate([-7, 0, y_+4.5], modeling.transforms.rotateZ( -Math.PI/180*30, modeling.primitives.cuboid({size:[2,1,3]}))),
        ),


        //out,
        //modeling.transforms.mirrorX(out),
         
        //  modeling.primitives.cuboid({size:[2,3,6],center:[-7, y_, y_+4.3]}),
        //  modeling.primitives.cuboid({size:[2,3,6],center:[-7, 0, y_+4.3]}),
          /*
      this.primitives.cylinderElliptic({
        center: [7.5, y_/2, y_+4.3],
        height: 4,
        startRadius: [1.2, 1.2],
        endRadius: [1, 1.5],
        segments: 32
      }),this.primitives.cylinderElliptic({
        center: [-7.5, y_/2, y_+4.3],
        height: 4,
        startRadius: [1.2, 1.2],
        endRadius: [1, 1.5],
        segments: 32
        }),*/
      modeling.transforms.rotateX(Math.PI/180*6, modeling.primitives.cuboid({size:[40,2,13],center:[0,-1,-5]})),
      )         
      //])
      return g
    // return [g,this.transforms.mirrorX(g)]
    }
    addPCB(height,px,py,bett = this.option.between+3+2.3,h1=2.4,h2=4,bw =1,bw2 = 3){

      //const {height} = Object.assign({},this.option,opt)
      const hh =this.getHH(py+bw2,bett+bw/2) +(h1-h2)/2
      return modeling.booleans.subtract(
        modeling.transforms.translateY(-bw/2,modeling.hulls.hull(              
          modeling.primitives.cuboid({size:[px+2,bw,h1],center:[0,bett,height/2+7]}),
          modeling.primitives.cuboid({size:[px+2,bw2,h2],center:[0,py/2,height/2+7+hh]}),
        )),
          modeling.primitives.roundedCuboid({size:[px,py,3],center:[0,0,height/2+7+hh],roundRadius:0.5}),
            
          
        // modeling.primitives.roundedCuboid({size:[21,24,10],center:[-21/2,0,this.roomFixHeight/2+20],roundRadius:0.5})
        )

    }
    getHH(py,bett,angle=Math.PI/180*30){
      return Math.tan(angle)*(bett -(py)/2) 
    }
  
    PCBFixEnd(opt={}){
      const {between,fixHeight,xd} = Object.assign({},this.option,opt) 
      const betX = between - xd
      const bett = betX+fixHeight

      return modeling.extrusions.extrudeLinear({height:1.6}, 
        modeling.booleans.subtract(
        modeling.primitives.roundedRectangle({size:[6,bett*2+4],roundRadius:1.5}),
        modeling.primitives.roundedRectangle({size:[3,bett*2],
          center:[0,0],roundRadius:1}),
        modeling.primitives.rectangle({size:[4,bett*2-6],
          center:[3,0]}),
       
      ))
    }
   
    PCBFix(opt){
      const {between,height,fixHeight,xd} = Object.assign({},this.option,opt) 

      const betX = between - xd
      const bet = betX + fixHeight/2
      const fixline = this.transforms.translateY(betX , this.motorFixLine(), )
      const bw = 1 
      const bett = betX+fixHeight
      const h1 = 2.4
      const h2 = 5
      const h3=15 
      const pcb1_x =21.5
      const pcb2_x = 35.5
      //const ang = Math.tan(Math.PI/180*30)
      //const fixY = bett
      //const fixX = ang*fixY
      //const fixZ = ang*(bett-5)
      //console.log(fixY,bet)
      const ffw = 3
      const ff =modeling.transforms.translate([0,bett-ffw/2,height/2+7+h3],
        modeling.primitives.cuboid({
          size:[4,ffw,h1],
          center:[0,0,0]
        }),
        modeling.primitives.cuboid({
          size:[2,ffw,h1],
          center:[-1,0,1]
        })
      )
      return modeling.booleans.union(
        fixline,
        modeling.transforms.translateX(-(pcb1_x/2 +1+2),ff),
        modeling.transforms.translateX((pcb1_x/2+pcb2_x +1+3),modeling.transforms.mirrorX(ff)),
        //modeling.primitives.cuboid({size:[2,3,h1],center:[-(pcb1_x/2 +2),bet+1.3,height/2+7+h3]}) ,
        //priFunc&& priFunc(-(pcb1_x/2),bett,height/2+7+h3) ,
        //priFunc&&modeling.transforms.mirrorX(priFunc(-(pcb2_x+pcb1_x/2+1),bett,height/2+7+h3)),
        modeling.booleans.subtract(
          modeling.booleans.union(
          modeling.transforms.translate([0,0,h3] ,                
            this.addPCB(height,pcb1_x,25,bett,h1,h2,bw),               
          ), 
          modeling.primitives.cuboid({
            size:[2,fixHeight,h3-2],center:[3.5,bet ,height/2+7+h3/2+2]}),      
          modeling.primitives.cuboid({
            size:[2,fixHeight,h3-2],center:[-3.5,bet ,height/2+7+h3/2+2]}),  
          ),  
        //  modeling.primitives.cuboid({size:[4,3,100],center:[0,bet+2,0]}) , 

        //  modeling.primitives.cuboid({size:[6,25,100],center:[-(pcb1_x/2-3.5),0,0]}),
          modeling.primitives.cuboid({size:[6,25,100],center:[(pcb1_x/2-3.5),0,0]}),
          // modeling.primitives.cuboid({size:[5,25,30],center:[-pcb1_x/2,0,-1]}), 
        ),  
        modeling.transforms.translate([pcb2_x/2+pcb1_x/2+1,0,h3] ,
            modeling.booleans.subtract(
            this.addPCB(height,pcb2_x,25.5,bett,h1,h2,bw), 
            //modeling.primitives.cuboid({size:[4,3,100],center:[0,bet+2,0]}) ,  
            modeling.primitives.cuboid({size:[22,25.5,100],center:[0,0,0]}),
          ),  
        ),
 
      )
    }
 
    left(opt){
      return   this.PCBFix(opt )
    }
    right(opt){
      return modeling.transforms.mirrorY(
        this.PCBFix(opt)
      )
    }
    roomFixLib(opt={ fb: this.between}){
        const ft = 3
        const {between,xd} = Object.assign({},this.option,opt)
        //const defaultOpt ={ext : 9.5,fH : 18.8,fW : 5.4,fK : 4,fb: this.between}
        //const {ext ,fW ,fK ,fb} = Object.assign(defaultOpt,opt)
        //const xd = 3
        const fb = between-xd
        const ext = 9.5
        const fK = 4
        const fW = 5.4
        let fH = 18.8
        //let {fH} = defaultOpt
        fH += between-5

        
        let points = [
              //[0,0],
              [ext+fW+1.5,11],
              [ext+fW+2,11.5],
              //[ext+fW,fH],
              [ext+fW+2,fb-0.5],
              [ext+fW+1.5,fb],
              [ext+fW,fb],
              [ext+fW,fH-fK-4-xd],
              [ext+fW+ft-0.5,fH-fK-4-xd],
              [ext+fW+ft,fH-fK-3.5-xd],
              //[ext+fW+ft,fH-fK-6],
             // [ext+fW+ft+2,fH-fK-6],
              //[ext+fW+ft+2,fH-fK-2],
              //[ext+fW+ft+1.5,fH-fK-1],
              [ext+fW+ft,fH-fK-0.5],
              [ext+fW+ft-0.5,fH-fK],
              
              [ext+fW-1,fH-fK],
              [ext+fW-1,fH ],
              [ext+fW+0.3,fH ],
              [ext+fW+0.6 ,fH+0.5 ],
              [ext+fW-1,fH+6.5],
              [ext+3,fH+6.5],
              [ext+2.5,fH+6],

              [ext+2.5,fH-fK+1 ],
              //[ext+1,fH-fK],
              [ext,fH -fK*3-2],
              [ext+1,fH -fK*3 - 2],

              [ext+3.5,fH -fK*1.5-1],
              [ext+4,fH -fK*1.5-1],
              //[ext,fH_-1],
              //[ext ,fH-fK],
              //[ext-1 ,fH_-fK],
              [ext+2.5,fb+2],
              [ext+1,fb],
              [ext-2,fb], 
              [ext-4,fb-1.5], 
              [ext-4,9], 
             // [0,11.5], 
          ] 
        //const points_ =   points.map(([x,y])=>[-x,y]).reverse();
        points.push(...points.map(([x,y])=>[-x,y]).reverse())
        return modeling.primitives.polygon({points})
        //return b_1
        //return this.primitives.polygon({points:})
        //return this.booleans.union(b_1,this.transforms.mirrorX(b_1))  
    
      };
    base(opt,ext=()=>{
      const extfix = modeling.booleans.subtract(modeling.primitives.circle({radius:5,center:[5,0] }),modeling.primitives.circle({radius:3,center:[5,0] }))
      return modeling.transforms.translateX(this.option.batterySize[1]/2, modeling.extrusions.extrudeLinear({height:this.option.height},modeling.booleans.union(
        modeling.transforms.translateY(15,extfix),
        modeling.transforms.translateY(-15,extfix)
      )))
    }){
      const {height,offsetX,batterySize,tip,between} = Object.assign({},this.option,opt)
      const f = this.roomFixLib(opt)
      //return f
    
      const f_1 = this.booleans.union(this.transforms.mirrorY(f),f)
      //return f_1
      
      const batteryLong =batterySize[1]
      const dk = 5
      //const ext
      let b = this.booleans.subtract(         
        this.booleans.union(
          f_1,
          this.transforms.translateX(offsetX ,
 
          this.primitives.roundedRectangle({
            center: [0, 0],
            size: [batteryLong+dk*2 , 23],
            roundRadius: 3,
            segments: 32
          }),            
  
          //),

        )),
        //modeling.primitives.rectangle({size:[batteryLong+dk-5,14],center:[offsetX-dk/2,0]}),
        //modeling.primitives.rectangle({size:[batteryLong+dk-5,6.5],center:[offsetX+dk/2,0]}),
        modeling.primitives.rectangle({size:[dk,14],center:[batteryLong/2+offsetX,0]}),
        modeling.primitives.rectangle({size:[dk,14],center:[-(batteryLong/2-offsetX),0]}),
        //modeling.primitives.rectangle({size:[batteryLong+8,2],center:[offsetX,-6]}),      
      ) 

    //if (ext){
    //  b = modeling.booleans.union(b, modeling.transforms.translateX(offsetX+batteryLong/2,modeling.booleans.union(ext())))
    //}

 
      const kenT = modeling.booleans.subtract(
        modeling.extrusions.extrudeLinear({height:1.6}, 
          modeling.booleans.subtract(
          
          modeling.hulls.hullChain(
            modeling.primitives.rectangle({size:[dk,10],center:[-0.5,0]}),
            //modeling.primitives.rectangle({size:[2,3],center:[height/2+1,0]}),
            modeling.primitives.roundedRectangle({roundRadius:1,size:[3,8],center:[height,0]}),
          ),
          modeling.primitives.rectangle({size:[2,10],center:[-dk/2,5]}),
         modeling.transforms.translate([0,-4], modeling.transforms.rotateZ(-Math.PI/180*10,modeling.primitives.rectangle({size:[1,10]}))),
         modeling.transforms.translate([height/2,4], modeling.transforms.rotateZ(Math.PI/180*10,modeling.primitives.rectangle({size:[1,10]}))),
          
          //modeling.primitives.rectangle({size:[1,10],center:[2.5,5]}),
          //modeling.primitives.rectangle({size:[1,10],center:[6,-6]}),
        )),
        modeling.transforms.translate([height+1.5,0,0],modeling.transforms.rotateY(
          Math.PI/180 *35,
          modeling.primitives.cuboid({size:[2,10,10]}))
          //modeling.extrusions.extrudeLinear({height:3},modeling.primitives.rectangle({size:[1,7],center:[height+2,0]}))
        ),
      )
      const ken1 = modeling.extrusions.extrudeLinear({height:1.6},
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,5]}),
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,-5]}),
        //modeling.booleans.union(
        modeling.primitives.polygon({points:[
          [dk/2,0],[dk/2,7],[1,6], [-1.5,-2],
          [-height*1.5,-3],
          [-height*1.5+1,-7],
          [dk/2-1,-5],
          [dk/2-1,0],
        ]}),
         // modeling.primitives.rectangle({size:[dk/2,3],center:[dk/4,4.6]}),
        //  modeling.primitives.rectangle({size:[dk/2,3],center:[dk/4,-4.6]}),        
        //)
        
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,4.5]}),
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,-4.5]}),
      )
      const ken1_ = modeling.transforms.translateZ(3,
        modeling.booleans.subtract(
      modeling.extrusions.extrudeLinear({height:3},
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,5]}),
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,-5]}),
        modeling.booleans.union(
          modeling.primitives.rectangle({size:[dk/2,3],center:[dk/4,4.6]}),
          modeling.primitives.rectangle({size:[dk/2,3],center:[dk/4,-4.6]}),        
        )
        
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,4.5]}),
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,-4.5]}),
      ),
      modeling.transforms.translateZ(1.4,
      modeling.extrusions.extrudeLinear({height:2},
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,5]}),
        //modeling.primitives.rectangle({size:[dk/2,4],center:[dk/2,-5]}),
        modeling.booleans.union(
          modeling.primitives.rectangle({size:[1,3],center:[dk/4,4.6]}),
          modeling.primitives.rectangle({size:[1,3],center:[dk/4,-4.6]}),        
        )
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,4.5]}),
        //modeling.primitives.rectangle({size:[dk/8,3],center:[dk/8,-4.5]}),
      ),
    
      )))
      const t1 =modeling.transforms.translate([-10,between+2,height/2],
        modeling.transforms.rotate([Math.PI/2,0,Math.PI/180*15],
          modeling.primitives.cylinderElliptic({startRadius:[1,1.5],endRadius:[1,1.5],height:4})
          //modeling.primitives.cylinder({radius:1.5,height:5})
        )
      )
      const t2 = modeling.transforms.mirrorX(t1)
      const t3 = modeling.transforms.mirrorY(t1,t2)
      return modeling.booleans.union(
        modeling.transforms.translateX(
          offsetX,
          //modeling.primitives.roundedCuboid({roundRadius:0.9,size:[2,10,height],center:[batteryLong/2,0,height/2+4]}),
          //modeling.primitives.roundedCuboid({roundRadius:0.9,size:[2,10,height],center:[-(batteryLong/2),0,height/2+4]}),
          ext?ext():modeling.hulls.hull(
            modeling.extrusions.extrudeLinear({height:height},
              modeling.booleans.subtract(
                modeling.primitives.roundedRectangle({
                  roundRadius:3,
                  size:[7,23],
                  center:[batteryLong/2+dk-3.5,0]}),
                  modeling.primitives.rectangle(
                    {
                      size:[7,23],
                      center:[batteryLong/2+dk-3.5-2.4,0]
                    }
                  )
              )
            ),
            modeling.primitives.sphere({
              center: [batteryLong/2+dk+2, 0, height+4],
              radius: 4,
            }),
          ),
          //modeling.primitives.roundedCuboid({roundRadius:2,size:[11,23,height+4],center:[0,0,((height+4)/2)]}),
          //modeling.primitives.roundedCuboid({roundRadius:2,size:[11,23,height+4],center:[-offsetX,0,((height+4)/2)]})
        ),

        modeling.booleans.subtract(          
          modeling.extrusions.extrudeLinear({height:height},b),
          this.transforms.translate([offsetX,0,height/2+1], 
            modeling.transforms.translateZ(0 ,this.battery()), 
          )
        ),
        //this.transforms.translate([offsetX,0,height/2+1], 
        //  modeling.transforms.translateZ(0 ,this.battery()), 
        //),
        t1,t2,t3,
        
        this.transforms.translateX(
          offsetX,
          modeling.transforms.translateX(-batteryLong/2,kenT),
          tip?modeling.transforms.translateX(batteryLong/2,ken1):modeling.transforms.translateX(batteryLong/2,modeling.transforms.mirrorX(kenT)),
        )
               
      )
    }
    footFix(){
      const {height} = this.option
      return modeling.extrusions.extrudeLinear(
        {height:3},
        modeling.booleans.union(
          modeling.transforms.translateY(-22.5,
          modeling.primitives.roundedRectangle({roundRadius:1,size:[height+2,2.4],center:[-height/2-1,-1.5]}),
          modeling.primitives.roundedRectangle({roundRadius:1,size:[height+2,2.4],center:[-height/2-1,1.5]})),
          modeling.booleans.subtract(
            modeling.hulls.hullChain(
              modeling.transforms.translate([-12.5,-7-2],
              modeling.primitives.roundedRectangle({roundRadius:2,size:[10,36],center:[0,0]}),
              modeling.primitives.circle({radius:10,center:[-6,7]})
              )
            ),
            modeling.transforms.translate([-10,-5],
              modeling.transforms.rotateZ(-Math.PI/180*20 ,modeling.primitives.roundedRectangle({roundRadius:5,size:[25,15] }))
            ),
            modeling.transforms.translate([-10,0],  modeling.transforms.rotateZ(Math.PI/180*30 ,modeling.primitives.rectangle({size:[10,5] }))),
          ),
          
        )
      )
      return modeling.extrusions.extrudeLinear({height:3},
        modeling.booleans.subtract(
          modeling.booleans.union(
            modeling.primitives.roundedRectangle({roundRadius:1,size:[25,40],center:[-5,-5]}),
           // modeling.primitives.rectangle({ size:[height+1,10],center:[0,10]}),
           // modeling.primitives.roundedRectangle({roundRadius:1,size:[3,7],center:[-3.5-5.5,-25]}),
          ),
          //modeling.primitives.roundedRectangle({roundRadius:1,size:[height+1,3],center:[-3.5,-25]}),
          modeling.primitives.rectangle({ size:[height+1,10],center:[-15,-22]}),
          modeling.primitives.rectangle({ size:[height+2,12],center:[3,11]}),

          modeling.primitives.roundedRectangle({roundRadius:1,size:[height+1+10,5],center:[-3.5-5,-17.5]}),
          modeling.primitives.rectangle({ size:[height+1,1],center:[-3.5-4,-22.5]}),
          modeling.transforms.rotateZ( -Math.PI/180*20 ,modeling.primitives.roundedRectangle({roundRadius:1,size:[25,15],center:[0,0]})),
        )
      )
    }
    main(opt){

      Object.assign(this.option,opt)


        return [
            this.left(),
            this.right(),
            this.transforms.translateZ(this.option.height/2,
            this.transforms.mirrorZ(this.base())),
            //modeling.booleans.union(this.motor.motorFixBody(this.option.between)),
            //this.base()
        ]
    }
}