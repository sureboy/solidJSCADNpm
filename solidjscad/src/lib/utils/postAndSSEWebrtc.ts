import {
    //createRtcTrack,
    createOffer} from '#lib/utils/webrtc.js';
import {pool } from "#lib/utils/webRTCPool.js";
import type {connType} from "#lib/utils/webRTCPool.js"; 
export const createWebrtcConnFromCenterUrl =async (
    obj:{
        id:string,
        create?:boolean,
        host:string
    },getConn:(conn:connType)=>void)=>{
    const r =await  postWebRTCMsg(obj) 
    if (r.ok){
        if (obj.create){ 
            const conn = createRtcConn((msg)=>{
                postWebRTCMsg(Object.assign({msg:btoa(msg)},obj) );
            },obj,getConn) ;
            getWebRTCMsgFromSSE((MsgObj)=>{
                setRemoteRTCMsg(MsgObj,conn) ;
                if ("onmessage" in conn.dc){
                    return false;
                }else{
                    return true;
                }
            } ,obj );
        }else{ 
            const db = await r.json() as any[]
            if (db.length===0){
                return false
            }
            const conn = appendRtcConn(obj.id,(msg)=>{ 
                postWebRTCMsg(Object.assign({msg:btoa(msg)},obj) );
            },getConn); 
            //console.log(db);
            (db as any[]).reverse().forEach((v,i)=>{
                setRemoteRTCMsg(JSON.parse(atob(v)),conn);
                console.log(i,atob(v));
            });
             
        } 
    }
    return r.ok
  
     
};
const getWebRTCMsgFromSSE = (msg:(msg:any)=>void,inputConfig={id:"",host:"http://127.0.0.1:8088/"})=>{
    let u=inputConfig.host+"?" ;
    for (const [k,v] of Object.entries(inputConfig)){
        u+=`${k}=${v}&`;
    }
    const source = new EventSource(
        u ,
        {withCredentials:false}
    );
    source.onmessage = function(event) { 
        try{ 
            msg(JSON.parse(atob(event.data))) ;
        }catch(e){
            const obj = {msg:event.data,online:true};
            msg(obj);
            if (!obj.online){
                source.close();
                //console.log("close source",source.CLOSED);
            }
            //console.log(e)
            //console.log(event.data )
        } 
    };
    source.onerror = (e)=>{
        console.error(e);
        source.close();
    };
};
export const setRemoteRTCMsg = (
    MsgObj:any,
    conn:{
        pc: RTCPeerConnection,
        dc:{send(data: string): void}},
    maxNum=10)=>{
    //console.log(MsgObj);
    if (MsgObj.candidate){ 
         conn.pc.addIceCandidate(new RTCIceCandidate(MsgObj)).then(()=>{
            //console.log( "ok",MsgObj );
        }).catch(e=>{
            maxNum--;
            if (maxNum>0){
                setTimeout(()=>{
                setRemoteRTCMsg(MsgObj,conn,maxNum);
            },2000);
            }
            
            console.error(e);
        }) ;
        return;
    }
    if (MsgObj.sdp){ 
        conn.pc.setRemoteDescription(new RTCSessionDescription(MsgObj)).then(()=>{
            if (MsgObj.type==="offer"){
                conn.pc.createAnswer().then(sdp=>{
                    conn.pc.setLocalDescription(sdp);
                    conn.dc.send(JSON.stringify( sdp) );                 
                });
            } 
        }).catch(e=>{
            console.error(e);
        });  
        return;
    }
    if (MsgObj.online){
        MsgObj.online = !('onmessage' in conn.dc);
        return;
    }
};
const postWebRTCMsg = (inputConfig:{
    id:string,
    create?:boolean,
    host:string}={id:"",create:false,host:"http://127.0.0.1:8088/"})=>{
    console.log(inputConfig);
    return fetch(inputConfig.host,{
        method:"POST",
        headers: {
            "Content-Type": "application/json"   // 告诉服务器发送的是 JSON
        },
        body: JSON.stringify(inputConfig) 
    });
};
const createRtcConn = (
    send:(iceOrSdp:string)=>void,inputConfig:{id:string,create?:boolean},
    getConn:(_conn:connType)=>void
)=>{
    
    const conn = pool.createConnection(inputConfig.id);
    const outOjb = {
        conn,
        pc:conn.pc,
        dc:{send}
    };
    conn.pc.onicecandidate = (event:any)=>{
         if (event.candidate) { 
            outOjb.dc.send(JSON.stringify(event.candidate.toJSON()));
        }
    };
    const dc = outOjb.pc.createDataChannel(inputConfig.id,{ordered:false});
    conn.dc = dc;
    dc.onopen=()=>{
        outOjb.dc = dc;
        console.log("dc open");
        
        getConn(conn);

    };
    dc.onmessage=(e:any)=>{
        setRemoteRTCMsg(JSON.parse(e.data),outOjb);
    };
    outOjb.pc.onnegotiationneeded = ()=>{
        createOffer(outOjb.pc).then(sdp=>{
            outOjb.dc.send(JSON.stringify(sdp));
        });
    };
    return outOjb;
};
const appendRtcConn = (
    id:string,
    send:(ice:string)=>void,
    getConn:(_conn:connType)=>void
)=>{
    const conn = pool.createConnection(id);
    const obj:{conn: connType,pc:RTCPeerConnection,dc:{send(data:string):void}} = {
        conn,
        pc: conn.pc,
        dc:{send}};
    conn.pc.onicecandidate = (event:any)=>{
        if (event.candidate) { 
            obj.dc.send(JSON.stringify({c:true,...event.candidate.toJSON()}));
        }
    };
    obj.pc.ondatachannel = (e)=>{
        obj.dc = e.channel;
        console.log("dc open");
        e.channel.onmessage=(e)=>{
            if (typeof e.data ==="string")
                setRemoteRTCMsg(JSON.parse(e.data),obj);
        };
        conn.dc = e.channel;
        getConn(conn);
    };
    return obj;
};