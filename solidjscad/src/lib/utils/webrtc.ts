import type {signalingStruct} from '#lib/utils/util.js';
import {pool} from "#lib/utils/webRTCPool.js"
export const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {urls: 'stun:stun.qq.com:3478'}, 
    ],
    //sdpSemantics: 'unified-plan'
};
 
const pushAnswer = (answer:signalingStruct)=>{
    return new Promise<void>((resolve,reject)=>{
        fetch("/answer",{
            method:"POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body:JSON.stringify(answer)
        }).then(res=>{
            if (res.ok){
                resolve();
            }else{
                reject();
            }
        }).catch(reject);
    });
};
const getOffer =()=> {
    return new Promise<signalingStruct>((resolve,reject)=>{
        fetch("/offer").then(res=>{
            if (res.ok) { 
                res.json().then(resolve);
            }else{
                reject();
            }
        }).catch(reject);
    });
};
export async function handleOffer(
    sign:signalingStruct,
    peerConnection: RTCPeerConnection,
    Answer:(Answer:signalingStruct)=>void,
    backDatachannel:(dataChannel: RTCDataChannel)=>void,
    //track?:(track:RTCTrackEvent)=>void
) { 
 
    await peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:sign.offer,type:"offer"}));
 
    sign.ICEList.forEach(ice=>{
        peerConnection.addIceCandidate(ice);
    }); 
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('本地 Answer 已创建');

    // 通过信令服务器发送 Answer
    const msgAnswer:signalingStruct = {   answer: answer.sdp,ICEList:[] ,id:sign.id};
  
    let isSend = false;
    const t = setTimeout(()=>{
        //if (!isSend){
        Answer(msgAnswer);
        isSend = true;
    },5000);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            msgAnswer.ICEList.push (event.candidate);
            console.log('ICE Candidate 已发送',event.candidate);
        }else{ 
            if (!isSend){
                Answer(msgAnswer); 
                clearTimeout(t);
            }
            return;
        }
    }; 
    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel; 
        console.log("webrtc conn ok");
        backDatachannel(dataChannel); 
    };
    //return peerConnection;
}

export const connWebRTC =()=>{
    return new Promise<{dataChannel:RTCDataChannel,peerConnection:RTCPeerConnection,signaling: signalingStruct}>((resolve,reject)=>{
        getOffer().then(signaling=>{
            const peerConnection = new RTCPeerConnection(configuration);
            handleOffer(
                signaling,
                peerConnection,(answer)=>{
                    pushAnswer(answer).catch(reject);
            },dataChannel=>{
                resolve({dataChannel,peerConnection,signaling});                 
            }).catch(reject);
        }).catch(reject);
    }); 
};
 
export const createRtcTrack = (
    //id:string,
    getRTCIce:(candidate: RTCIceCandidateInit)=>void,
     )=>{ 
    const conn = pool.createConnection();
    //const StreamConnection = new RTCPeerConnection(configuration);  
    conn.pc.onicecandidate = event => { 
        if (event.candidate) { 
            getRTCIce(event.candidate.toJSON());
        }
    };  
 
    return conn.pc;
}; 
export const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
    //const StreamConnection = createMyWebRtc(dataChannel,closeHand)
    /*
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (capabilities) {
        // 从返回结果的 codecs 数组中查找 VP8
        const vp8Codec = capabilities.codecs.find(c => c.mimeType === 'video/VP8'); 
        if (vp8Codec) { 
            StreamConnection.getTransceivers().forEach(transceiver => {
                if (transceiver.sender && transceiver.sender.track?.kind === 'video') {
                    transceiver.setCodecPreferences([vp8Codec]);
                }
            });
        }
    }*/
    const sdp  = await StreamConnection.createOffer() ;
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp);
    return sdp;
 
};