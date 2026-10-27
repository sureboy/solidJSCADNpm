import modeling from './lib/modeling.esm.js';
export const gear = {
    radX : Math.PI/180,
    PI2 :  Math.PI*2,
    rad : 57.29578,
    options:{
        modul:1,
        gearNum:20,
        height:5,
        bohrung:0,
        eingriffswinkel:20,
        schraegungswinkel:20,
        optimiert:true,
        spiel:0.05,
        schrittC:10,
        schritt:0,
        dif:0.1,
        txx:0.8,
        txxEnd:0.8
        //scaleD:0
    },
 
    ev(r,rho){
        return [
            r/Math.cos(rho),
            //this.grad(Math.tan(rho )- rho )
            Math.tan(rho )- rho
        ];
    } ,
    pol_zu_kart(polvect) { 
    //polvect[1]*=this.radX
        return [
            polvect[0]*Math.cos(polvect[1]),  
            polvect[0]*Math.sin(polvect[1] )
        ];
    } ,
    init(opt={}){
        const _opt = Object.assign({},this.options,opt) 
        const{
            modul,gearNum, eingriffswinkel,schraegungswinkel, schrittC
        } =_opt
        let alpha_stirn = Math.atan(Math.tan(this.radX*eingriffswinkel)/ Math.cos(this.radX*schraegungswinkel));
        let d =  modul* gearNum ; 
        let da = (modul <1)? d + modul * 2.2 : d + modul * 2; 
        _opt.ra = da/2; 
        _opt.rb =  (d *Math.cos(alpha_stirn) / 2); 
        _opt.rho_ra = Math.acos((_opt.rb/_opt.ra));
        _opt.schritt = _opt.rho_ra/schrittC;
        //_opt.rho_ra = _opt.schritt *schrittC
        _opt.rho_r = Math.acos((_opt.rb/(d/2)));
        const c =  (gearNum <3)? 0 : modul/6;
        const df = d - 2 * (modul + c);	
        _opt.rf = df/2;
        return _opt
    },
    initRing(opt={}){
        const _opt = Object.assign({},this.options,opt) 
        const{
            modul,gearNum, eingriffswinkel,schraegungswinkel, schrittC
        } =_opt
        let alpha_stirn = Math.atan(Math.tan(this.radX*eingriffswinkel)/ Math.cos(this.radX*schraegungswinkel));
        let d =  modul* gearNum ; 
        let c = modul / 6;													// Kopfspiel
        let da = (modul <1)? d + (modul+c) * 2.2 : d + (modul+c) * 2;	
        //let da = (modul <1)? d + modul * 2.2 : d + modul * 2; 
        _opt.ra = da/2; 
        _opt.rb =  (d *Math.cos(alpha_stirn) / 2); 
        _opt.rho_ra = Math.acos((_opt.rb/_opt.ra));
        _opt.schritt = _opt.rho_ra/schrittC;
        //_opt.rho_ra = _opt.schritt *schrittC
        _opt.rho_r = Math.acos((_opt.rb/(d/2)));
        const ha = (gearNum >= 20) ? 0.02 * Math.atan((gearNum/15)/(Math.PI))*57.29578 : 0.6;	// Verkürzungsfaktor Zahnkopfhöhe
        
        //const d = modul * gearNum;
        const df = d - 2 * modul * ha;
      
        _opt.rf = df/2;
       // console.log("ring B")
        return _opt
    },
    /*
    rfOfRing( modul,gearNum){
        //const{ modul,zahnzahl  } =  this.options; 
        //const  ha = 0.6
        const ha = (gearNum >= 20) ? 0.02 * Math.atan((gearNum/15)/(Math.PI))*57.29578 : 0.6;	// Verkürzungsfaktor Zahnkopfhöhe
        
        const d = modul * gearNum;
        const df = d - 2 * modul * ha;
        //console.log(df/2)
        return df/2;//(modul* gearNum)/2-modul*ha;
    },
   
    rfOfGear(modul,gearNum){

        //const{ modul,zahnzahl  } =  this.options; 
        //let rr =  modul* gearNum/2 ; 
        const d = modul * gearNum;
        const c =  (gearNum <3)? 0 : modul/6;
        const df = d - 2 * (modul + c);	
        return df/2;//rr-modul-modul/6;
    },
     */
    gearAlone(opt ){
        const{rho_ra,rho_r,gearNum,schritt,dif,rb,spiel,rf} = opt;// this.options
        
        let point = [this.pol_zu_kart([rf,0])]
        //point = [0,0] 
        let rightPoint = []
        let leftPoint = []
        const phi_r = Math.tan(rho_r)-rho_r;	
        //console.log(phi_r )
        const zahnbreite = (Math.PI*(1-spiel))/gearNum+2*phi_r; 
        
        const tau = this.PI2/ gearNum ; 
      
        for (let rho =0;rho<=rho_ra;rho+=schritt ){
            
            let [e1,e2] = this.ev(rb,rho)
            if (rf>0 && e1<rf){
                e1 = rf
            }
            
            //e2 +=zahnbreite
            //const [x,y] = this.pol_zu_kart( [e1,e2]) 
            //const _y =y+spiel
            
            rightPoint.push(this.pol_zu_kart( [e1,e2]))
            //console.log(zahnbreite,e1,e2 )

           
            leftPoint.unshift(this.pol_zu_kart( [e1,zahnbreite-e2])) 
        } 
        
        //const [x,y] = this.pol_zu_kart(this.ev(rb,rho_ra))
        //const _y =y+spiel
        
        //leftPoint.unshift([x,-_y])
        
        point.push(...rightPoint)
        rightPoint.push(this.pol_zu_kart(this.ev(rb,rho_ra)))  
        point.push(...leftPoint)
        point.push(this.pol_zu_kart([rf,zahnbreite]))
        //let 
        let p = modeling.primitives.line( point )
        p =modeling.transforms.rotateZ(-zahnbreite/2,p )
        if (dif !== 0 ) {
            let rb_ = (rb + dif)/rb 
            p =  modeling.transforms.scale([rb_,rb_],p )
        }
        
        //return modeling.geometries.geom2.fromPoints(modeling.geometries.path2.toPoints(p))
        //p = modeling.geometries.path2.close(p)
        
        //return modeling.geometries.geom2.fromPoints(modeling.geometries.path2.toPoints(p))
        //let ps =modeling.geometries.path2.toPoints(modeling.geometries.path2.clone(p))
        let ps = []
        let I = 0
        //console.log("tau",this.PI2,tau*gearNum,tau)
        for (let i=0 ;i<this.PI2;i+=tau){            
            ps.push(...modeling.geometries.path2.toPoints(modeling.transforms.rotateZ(i, p))) 
            
            // console.log(gearNum,I*tau,i)
            I++
            if (I===gearNum)break
        }
        //console.log(ps[0],ps[ps.length-1])
        //if (I<gearNum){
        //    ps.push(...modeling.geometries.path2.toPoints(p))
        //}
 
        //modeling.geometries.path2.create(ps)
         
        //return modeling.geometries.geom2.fromPoints( modeling.geometries.path2.toPoints( modeling.geometries.path2.close(modeling.geometries.path2.create(ps))))
        return modeling.geometries.geom2.fromPoints(ps)
    },
    getGearEasy(option={}){
        const opt = this.init(option) 
        const{ height,bohrung } = opt 
        let al = this.gearAlone(opt ) 
        
        const main = modeling.extrusions.extrudeLinear({height},al)
        if (!bohrung || bohrung===0){
            return main
        }
        const bo = (typeof bohrung==="number")? modeling.primitives.cylinder({height:height,radius:bohrung/2,center:[0,0,height/2]}) :modeling.extrusions.extrudeLinear({height},bohrung)
        return modeling.booleans.subtract( 
            main,
            bo
        )
    },
    getGear(option = {height:5,modul:0.5,gearNum:26,schraegungswinkel:20,eingriffswinkel:20,dif:-0.1,bohrung:0 }){ 
 
        const opt = this.init(option) 
        const{ height,bohrung,rb,txx,txxEnd} = opt 
        let al = this.gearAlone(opt ) 
        //return al
        const mat4 = modeling.maths.mat4;
        const txx1 = txx/Math.tan(this.radX*50) 
        const txx2 = (txxEnd) / Math.tan(this.radX*50) 
        const d1 = (rb-txx1)/rb 
        const d2 = (rb-txx2)/rb 
        //let al2 = modeling.transforms.scale([d1,d1],al) 
 
        const o_1 =  modeling.extrusions.slice.fromSides(modeling.geometries.geom2.toSides(al )) 
        const o_2 =  modeling.extrusions.slice.fromSides(modeling.geometries.geom2.toSides(modeling.transforms.scale([d1,d1],al) ))  
        const o_3 =  modeling.extrusions.slice.fromSides(modeling.geometries.geom2.toSides(modeling.transforms.scale([d2,d2],al) ))  
        const o__ = [
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  0]), o_2) ,
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0, txx]), o_1),
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0, height-txxEnd]), o_1),
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  height]), o_3)
        ] 
        const main = modeling.extrusions.extrudeFromSlices({numberOfSlices:4,callback:(progress, index, base) => {
            return o__[index]
        }},o__[1])
        //return main
        if (!bohrung || bohrung===0){
            return main
        }
        const bo = (typeof bohrung==="number")? modeling.primitives.cylinder({height:height,radius:bohrung/2,center:[0,0,height/2]}) :modeling.extrusions.extrudeLinear({height},bohrung)
        return modeling.booleans.subtract( 
            main,
            bo
        )
    },
    getRing(option = {randbreite:1,height:5,gearNum:26,modul:0.5,schraegungswinkel:20,eingriffswinkel:20,dif:0.1 }){ 
        const opt = this.initRing(option)  
        //console.log("ring B")
        const{ra,gearNum,randbreite,height,rb,txx} =  opt
        const {mat4} = modeling.maths
        const c = modeling.primitives.circle({radius:ra+randbreite,segments:gearNum*2 })
        //const rf = this.rfOfRing(modul,gearNum)  
        const al = this.gearAlone(opt)
        //return modeling.extrusions.extrudeLinear({height:height},modeling.booleans.subtract(c,al))
        const txx1 = txx/Math.tan(this.radX*60)
        const d1 = (rb+ txx1)/rb
        //console.log(txx1,d1)
        const o_1 =  modeling.extrusions.slice.fromSides(
            modeling.geometries.geom2.toSides(
                //al
                modeling.booleans.subtract(c,al)
            )
        )
        const al_ = modeling.transforms.scale([d1,d1],al)
        const o_2 =  modeling.extrusions.slice.fromSides(
            modeling.geometries.geom2.toSides(
                //al_
                modeling.booleans.subtract( c, al_ )
            )
        )
        
        const o__ = [
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  0]), o_2) ,
            //this.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  0.2]), o_3),
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0, txx]), o_1),
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0, height-txx]), o_1),
            //this.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  breite-0.4]), o_3),
            modeling.extrusions.slice.transform(mat4.fromTranslation(mat4.create(), [0, 0,  height]), o_2)
        ] 
        return modeling.extrusions.extrudeFromSlices({numberOfSlices:o__.length,callback:(progress, index, base) => { 
            return o__[index] 
        }},o__[1]) 
    }
    
}