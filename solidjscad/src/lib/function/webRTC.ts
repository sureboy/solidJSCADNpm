import type {connType} from "$lib/utils/webRTCPool";
const ConnList:Map<string,{conn:connType,map:Map<string,RTCDataChannel>}> = new Map()

const broadcastForwarding = (msg:{name:string,db:string,Exclude:string[]})=>{
    ConnList.forEach((v,k)=>{
        if (msg.Exclude.includes(k)){
            return
        }
        const s = v.map.get(msg.name)
        s?.send(msg.db)
        s?.send("close")
    })
}

