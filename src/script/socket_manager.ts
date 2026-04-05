// ========================
//                           
//      Share Codebase     
//                           
// ========================
import { v6 as uuidv6 } from 'uuid';
import { Node, NodeLoad, NodeProxy, NodeTable, Plugin, ShellFolder, Single, SystemLoad, SocketPack } from "verteilen-core";
import { io, Socket } from 'socket.io-client'

/**
 * The node connection instance manager, Use by the cluster server
 */
export class WebsocketManager {
    targets:Array<SocketPack> = []
    newConnect:Function
    disconnect:Function
    onAnalysis:Function
    proxy:NodeProxy
    private messager_log:Function

    constructor(
        _newConnect:Function,
        _disconnect:Function,
        _onAnalysis:Function,
        _messager_log:Function,
        _proxy:NodeProxy){
        this.newConnect = _newConnect
        this.disconnect = _disconnect
        this.onAnalysis = _onAnalysis
        this.messager_log = _messager_log
        this.proxy = _proxy
        setInterval(this.update, 1000)
    }

    /**
     * Trying to connect a node by target URL
     * @param url target url
     * @returns The connection package
     */
    server_start = (url:string, uuid:string) => this.serverconnect(url, uuid)
    /**
     * Remove the package by UUID
     * @param uuid Key
     * @param reason Reason for disconnect
     */
    server_stop = (uuid:string, reason?:string) => this.removeByUUID(uuid, reason)
    /**
     * Manager update, it will does things below
     * * Retry connection
     * @returns Node table for display
     */
    server_update = ():Array<NodeTable> => this.sendUpdate()
    server_record = (ns:Array<Node>) => {
        ns.forEach(x => {
            this.serverconnect(x.url, x.uuid)
        })
    }

    shell_open = (uuid:string) => {
        const p = this.targets.find(x => x.uuid == uuid && x.socket.io._readyState == 'open')
        if (p == undefined){
            this.messager_log(`[Shell] Error cannot find the node by ID: ${uuid}`)
            return
        }
        p.socket.emit("open_shell", uuid)
    }

    /**
     * Open shell connection with target node
     * @param uuid node UUID
     * @param text input data
     */
    shell_enter = (uuid:string, text:string) => {
        const p = this.targets.find(x => x.uuid == uuid && x.socket.io._readyState == 'open')
        if (p == undefined){
            this.messager_log(`[Shell] Error cannot find the node by ID: ${uuid}`)
            return
        }
        p.socket.emit("enter_shell", uuid, text)
    }

    /**
     * Close shell connection with target node
     * @param uuid Node UUID
     * @returns 
     */
    shell_close = (uuid:string) => {
        const p = this.targets.find(x => x.uuid == uuid && x.socket.io._readyState == 'open')
        if (p == undefined){
            this.messager_log(`[Shell] Error cannot find the node by ID: ${uuid}`)
            return
        }
        p.socket.emit("close_shell", uuid)
    }

    /**
     * Check folder structure with target node
     * @param uuid Node UUID
     * @param path the folder path to check
     */
    shell_folder = (uuid:string, path:string) => {
        const p = this.targets.find(x => x.uuid == uuid && x.socket.io._readyState == 'open')
        if (p == undefined){
            this.messager_log(`[Shell] Error cannot find the node by ID: ${uuid}`)
            return
        }
        p.socket.emit("shell_folder", uuid, path)
    }

    /**
     * Trying to connect a node by target URL
     * @param Node target url
     * @param uuid generate UUID, New or retry connect base on value is defined or not
     * @returns The connection package
     */
    private serverconnect = (url:string, uuid?:string) => {
        if(this.targets.findIndex(x => x.url.slice(0, -1) == url) != -1) return
        if(this.targets.findIndex(x => x.uuid == uuid) != -1) return

        let client: Socket = io(url, {
            transports: ['websocket'],
            secure: true,
            rejectUnauthorized: false,
        })
        const t:SocketPack = { uuid: (uuid == undefined ? uuidv6() : uuid), url: url, socket: client, current_job: [] }
        this.targets.push(t)
        
        client.io.on('error', (err:any) => {
            this.messager_log(`[Socket] Connect failed ${url} ${err.message}`)
        })

        client.io.on('close', (reason, des) => {
            if(t.s != undefined){
                this.messager_log(`[Socket] Client close connection, ${des}, ${reason}`)
                this.disconnect(t)
            }
            t.s = undefined
            t.current_job = []
        })
        
        client.io.on('open', () => {
            this.messager_log('[Socket] New Connection !' + client.id)
            if(t.s == undefined){
                t.s = true
            }
            this.sendUpdate()
            this.newConnect(t)
        })

        this.analysis(client)
        return client
    }

    /**
     * The analysis method for the node connection instance
     * @param h Package
     * @param c Connection instance
     */
    private analysis = (socket:Socket) => {
        this.socket_analysis(socket)
        this.onAnalysis(socket)
    }

    private socket_analysis = (socket:Socket) => {
        socket.on('system_info', this.system_info)
        socket.on('shell_reply', this.shell_reply)
        socket.on('shell_folder_reply', this.shell_folder_reply)
        socket.on('node_info', this.node_info)
        socket.on('pong', this.pong)
        socket.on('plugin_info_reply', this.plugin_info_reply)
    }

    /**
     * Manager update, it will does things below
     * * Retry connection
     * @returns Node table for display
     */
    private sendUpdate = (): Array<NodeTable> => {
        let result:Array<NodeTable> = []
        const data:Array<Node> = []
        this.targets.forEach(x => {
            if(x.socket.io._readyState == 'closed'){
                data.push({cluster: false, uuid: x.uuid, url: x.url ?? ""})
            }
        })
        data.forEach(d => this.removeByUUID(d.uuid))
        data.forEach(d => {
            this.serverconnect(d.url, d.uuid)
        })

        result = this.targets.map(x => {
            return {
                s: false,
                cluster: false,
                uuid: x.uuid,
                state: x.socket.io._readyState,
                url: x.url,
                connection_rate: x.ms,
                system: x.information,
                plugins: x.plugins
            }
        })

        return result
    }

    /**
     * Remove the package by UUID
     * @param uuid Key
     * @param reason Reason for disconnect
     */
    private removeByUUID = (uuid:string, reason?:string) => {
        let index = this.targets.findIndex(x => x.uuid == uuid)
        if(index != -1) {
            if(this.targets[index].socket.io._readyState == 'open') {
                this.targets[index].socket.close()
            }
            this.targets.splice(index, 1)
        }
    }

    /**
     * Internal update, for checking the ping of every nodes
     */
    private update = () => {
        this.targets.forEach(x => {
            if(x.socket.io._readyState != 'open' || x.socket.id == undefined) return
            x.last = Date.now()
            x.socket.emit('ping', x.socket.id)
        })
    }


    /**
     * Recevied the shell text from client node
     */
    private shell_reply = (data:Single, w?:SocketPack) => {
        this.proxy?.shellReply(data, w)
    }
    /**
     * Recevied the folders from client node
     */
    private shell_folder_reply = (data:ShellFolder, w?:SocketPack) => {
        this.proxy?.folderReply(data, w)
    }
    /**
     * Get the system information and assign to the node object
     * @param info Data
     * @param source The node target
     */
    private system_info = (id:string, info:SystemLoad) => {
        const source = this.targets.find(x => x.socket.id == id)
        if(source == undefined) return
        source.information = info
    }
    /**
     * Get the node information and assign to the node object
     * @param info Data
     * @param source The node target
     */
    private node_info = (id:string, info:NodeLoad) => {
        const source = this.targets.find(x => x.socket.id == id)
        if(source == undefined) return
        source.load = info
    }

    /**
     * Get the bouncing back function call\
     * THis method will calculate the time different and assign the node object
     * @param info Dummy number, nothing important, can be ignore
     * @param source The node target
     */
    private pong = (id:string) => {
        const source = this.targets.find(x => x.socket.id == id)
        if(source == undefined || source.last == undefined) return
        source.ms = Date.now() - source.last
    }

    private plugin_info_reply = (id:string, data:Array<Plugin>) => {
        const source = this.targets.find(x => x.socket.id == id)
        if(source == undefined) return
        source.plugins = data
    }
}