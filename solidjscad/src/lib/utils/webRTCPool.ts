
export const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {urls: 'stun:stun.qq.com:3478'}, 
    ],
    //sdpSemantics: 'unified-plan'
};
type ConnectionId = string;
export type connType = {pc:RTCPeerConnection,dc?:RTCDataChannel,id:string,onClose?:()=>void}

class ConnectionPool {
    // 核心存储：用一个Map来管理所有连接
    private connections: Map<ConnectionId, connType> = new Map();
    //private connectionsTime: Map<ConnectionId, number> = new Map();
    private iceServers: RTCIceServer[];
    /*
    public routerSignaling = 
    new Map<string,
    {
        remoteDataChannel?:RTCDataChannel,
        localDataChannel:RTCDataChannel,
        msg:any[]}>();*/

    constructor(iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        {urls: 'stun:stun.qq.com:3478'},   
    ]) {
        this.iceServers = iceServers;
    }

    // 1. 创建新连接，并分配一个唯一的ID
    public createConnection(connectionId?: string): connType {
        // 如果未指定ID，则自动生成一个UUID
        const id = connectionId ?? Date.now().toString(32).slice(4);
        
        // 如果该ID已存在，则先关闭并删除旧连接，避免冲突
        if (this.connections.has(id)) {
            console.warn(`连接 ${id} 已存在，正在关闭旧连接`);
            this.closeConnection(id);
        }

        // 创建新的RTCPeerConnection实例
        const pc = new RTCPeerConnection({
            iceServers: this.iceServers,
        });
        //const dc = pc.createDataChannel(id,{ordered:false,protocol:"json"});
        // 存储到Map中
        const conn:connType = {id,pc};
        this.connections.set(id, conn);
        console.log(`连接 ${id} 已创建，当前活跃连接数: ${this.connections.size}`);

        // 可选：监听连接关闭事件，以便从池中自动移除
        pc.onconnectionstatechange = () => {
            console.log(pc.connectionState);
            if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
                this.closeConnection(id);
                conn.onClose?.();
                //window.location.reload();

            }
        };
        pc.oniceconnectionstatechange = (ev) => console.log(`❄️ ICE 状态: ${pc.iceConnectionState}`,ev);

        return conn;
    }

    // 2. 通过ID获取一个RTCPeerConnection
    public getConnection(id: ConnectionId):connType | null {
        const pc = this.connections.get(id);
        if (!pc) {
            console.warn(`未找到连接: ${id}`);
            return null;
        }
        return pc;
    }

    // 3. 关闭并删除一个连接
    public async closeConnection(id: ConnectionId): Promise<void> {
        const pc = this.connections.get(id);
        if (pc) {
            // 调用原生方法关闭连接，释放底层资源
            //pc.dc.close();
            pc.pc.close();
            this.connections.delete(id);
            /*
            const div = document.getElementById(id);
            if (div){
                div.remove();
            }*/
            //this.routerSignaling.delete(id);
            console.log(`连接 ${id} 已关闭并移除，当前活跃连接数: ${this.connections.size}`);
        } else {
            console.warn(`尝试关闭不存在的连接: ${id}`);
        }
    }

    // 4. 可选：获取所有活跃连接的ID列表
    public getAllConnectionIds(): ConnectionId[] {
        return Array.from(this.connections.keys());
    }

    // 5. 可选：获取当前连接总数
    public getConnectionCount(): number {
        return this.connections.size;
    }
 
}
export const pool =new ConnectionPool(configuration.iceServers);