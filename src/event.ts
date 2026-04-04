import tcpPortUsed from 'tcp-port-used'
import * as ws from 'ws'
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import { Socket } from 'socket.io';
import { v6 as uuidv6 } from 'uuid'
import { messager, messager_log } from "./debugger"
import { 
    ClientJobExecute, 
    ConsoleServerManager, 
    ClientJavascript, 
    DATA_FOLDER, 
    GlobalPermission, 
    Header, 
    Job, 
    JobCategory, 
    JobType, 
    Libraries, 
    LocalPermission, 
    PermissionType, 
    PluginNode, 
    ServerSetting, 
    UserProfile, 
    UserProfileClient, 
    UserType, 
    CreateRootUser,
    CreateRootPermission,
    ConsoleServerContainer,
    Server,
    BackendAction,
    CreatePreference,
    Preference,
    TypeMap,
    CreatePluginLoader,
    PluginFeedback,
    ServerDetail
} from 'verteilen-core'
import { Util_Server } from "./util/server/server"
import { Loader } from './util/init/Loader'
import { PluginInit } from './util/init/PluginInit'
import { DetailInit } from './util/init/DetailInit'
import { CreateIO } from './util/init/CreateIO'

export class BackendEvent extends Server implements BackendAction {
    console:ConsoleServerManager

    preference: Preference = CreatePreference()

    setting: ServerSetting | undefined
    jsCall:ClientJavascript
    util: Util_Server = new Util_Server(this)
    libs:Libraries = {libs: []}
    
    constructor(){
        super()
        this.io = CreateIO()
        const feedback:PluginFeedback = {
            socket: undefined
        }
        this.plugin_loader = CreatePluginLoader(this.io!, this.plugin, (uuid:string) => this.detail!.websocket_manager?.targets.find(x => x.uuid == uuid), feedback)
        this.plugin_loader.load_all()

        this.detail = new ServerDetail(this.io, this, feedback, messager, console.log)
        
        this.jsCall = new ClientJavascript(messager, messager_log, () => undefined)
        this.console = new ConsoleServerManager(messager_log)
    }

    GetPreference = (uuid?: string):Preference => {
        return this.preference
    }

    /**
     * The new manager enter the hood
     * @param socket 
     */
    NewConsoleConsole = (socket:Socket) => {
        console.log(`New Connection ${socket.id}`)
        let typeMap:TypeMap = {
            'javascript': this.javascript,
            'message': this.message,
            'load_record_obsolete': this.load_record_obsolete,
            'save_preference': this.save_preference,
            'load_preference': this.load_preference,
        }
        typeMap = this.util.EventInit(typeMap)
        Loader(typeMap, this.current_loader.project, 'project')
        Loader(typeMap, this.current_loader.task, 'task')
        Loader(typeMap, this.current_loader.job, 'job')
        Loader(typeMap, this.current_loader.database, 'database')
        Loader(typeMap, this.current_loader.node, 'node')
        Loader(typeMap, this.current_loader.log, 'log')
        Loader(typeMap, this.current_loader.lib, 'lib')
        PluginInit(typeMap, this.plugin_loader!)
        DetailInit(socket, typeMap, this.detail!)
        return this.console.Add(socket, typeMap);
    }
    /**
     * Remove manager frontend instance
     * @param socket 
     */
    DropConsoleConsole = (socket:Socket) => {
        this.console.Remove(socket)
    }
    /**
     * Process the message coming from manager frontend
     * @param socket The socket instance
     * @param h Data Header
     */
    ConsoleAnalysis = (socket:Socket, h:Header) => {
        const index = this.console.admins.findIndex(x => x.socket.id == socket.id)
        let buffer: ConsoleServerContainer | undefined = undefined
        if(index != -1) {
            buffer = this.console.admins[index]
        } else {
            buffer = this.NewConsoleConsole(socket)
        }
        if(buffer!.typeMap[h.name] != undefined){
            if(h.data == undefined || h.data == null){
                buffer!.typeMap[h.name]()
            }else if(Array.isArray(h.data)){
                buffer!.typeMap[h.name](...h.data)
            }else{
                buffer!.typeMap[h.name](h.data)
            }
        }else{
            messager_log("[ConsoleAnalysis]", `Cannot find the match name in the typemap registery: "${h.name}"`)
        }
    }

    IsPass = (token:string) => {
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        return fs.existsSync(path.join(pa, token + '.json'))
    }

    //#region Manager Side
    private javascript = (socket:ws.WebSocket, content:string, database:string | undefined) => {
        const javascript_messager_feedback = (msg:string, tag?:string) => {
            messager(msg, tag)
            const d:Header = {
                name: 'javascript-feedback',
                data: msg
            }
            socket.send(JSON.stringify(d))
        }

        const d:Job = {
            uuid: 'javascript',
            title: "execute javascript",
            description: "",
            category: JobCategory.Execution,
            type: JobType.JAVASCRIPT,
            script: content,
            id_args: [],
            string_args: [],
            number_args: [],
            boolean_args: []
        }
        const p:PluginNode = { plugins: [] }
        const worker = new ClientJobExecute(javascript_messager_feedback, javascript_messager_feedback, d, undefined)
        worker.database = database ? JSON.parse(database) : undefined
        worker.execute().then(x => {
            javascript_messager_feedback(x, "Finish")
        })
    }
    private message = (socket:ws.WebSocket, message:string, tag?:string) => {
        console.log(`${ tag == undefined ? '[Electron Backend]' : '[' + tag + ']' } ${message}`);
    }
    private load_record_obsolete = (socket:ws.WebSocket, dummy: number) => {
        if(!fs.existsSync('record.json')) return undefined
        const data = fs.readFileSync('record.json').toString()
        fs.rmSync('record.json')
        const d:Header = {
            name: "load_record_obsolete-feedback",
            data: data
        }
        socket.send(JSON.stringify(d))
    }
    private save_preference = (socket:ws.WebSocket, preference:string, token?:string) => {
        const pa = path.join(os.homedir(), DATA_FOLDER, "user")
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true})
        if(token != undefined){
            const target = path.join(pa, token + '.json')
            const p:UserProfile = JSON.parse(fs.readFileSync(target).toString())
            p.preference = JSON.parse(preference)
            fs.writeFileSync(target, JSON.stringify(p, null, 4))
        }
    }
    private load_preference = (socket:ws.WebSocket, token?:string) => {
        const pa = path.join(os.homedir(), DATA_FOLDER, "user")
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true})
        if(token != undefined){
            const file = path.join(pa, token + '.json')
            if(fs.existsSync(file)){
                const p:UserProfile = JSON.parse(fs.readFileSync(file).toString())
                const d:Header = { name: "load_preference-feedback", data: JSON.stringify(p.preference) }
                socket.send(JSON.stringify(d))
            }
        }
    }

    /**
     * Prevent use port which it's already use by other program
     * @param start Port start number
     * @returns The available port
     */
    PortAvailable = async (start:number) => {
        let port_result = start
        let canbeuse = false
        while(!canbeuse){
            await tcpPortUsed.check(port_result).then(x => {
                canbeuse = !x
            }).catch(err => {
                canbeuse = true
            })
            if(!canbeuse) port_result += 1
        }
        return port_result
    }
    //#endregion

    //#region Server
    Root = (port:number) => {
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true});
        const c = fs.readdirSync(pa).length
        if(c == 0){
            const root:UserProfile = CreateRootUser()
            fs.writeFileSync(path.join(pa, root.token + '.json'), JSON.stringify(root, null, 2))
            console.log(`Login with root using: ${root.token} `)
            console.log(`Login with root using: https://127.0.0.1:${port}/login/${root.token} `)
        }else{
            const files = fs.readdirSync(pa).filter(x => x.endsWith('.json'))
            for(let file of files){
                const user:UserProfile = JSON.parse(fs.readFileSync(path.join(pa, file)).toString())
                if(user.type == UserType.ROOT){
                    console.log(`Login with root using: ${user.token} `)
                    console.log(`Login with root using: https://127.0.0.1:${port}/login/${user.token} `)
                }
            }
        }
        const server_setting = path.join(pa_root, "server.json")
        if(!fs.existsSync(server_setting)){
            this.setting = {
                open_guest: false
            }
            fs.writeFileSync(server_setting, JSON.stringify(this.setting, null, 2))
        }else{
            this.setting = JSON.parse(fs.readFileSync(server_setting).toString());
        }
    }

    GetUserType = (token?:string):UserProfileClient => {
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true});
        if(token != undefined){
            const target_path = path.join(pa, token + '.json')
            const p:UserProfile = JSON.parse(fs.readFileSync(target_path).toString())
            if(p.token == token){
                return {
                    name: p.name,
                    type: p.type,
                    picture_url: false,
                    description: p.description,
                    permission: p.type == UserType.ROOT ? CreateRootPermission() : p.global_permission
                }
            }
        }
        return {
            name: "GUEST",
            picture_url: false,
            type: UserType.GUEST
        }
    }

    ChangeProfile = (token:string | undefined, data:any) => {
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true});
        if(token != undefined){
            const target_path = path.join(pa, token + '.json')
            const p:UserProfile = JSON.parse(fs.readFileSync(target_path).toString())
            if(p.token == token){
                if(data.name != undefined){
                    p.name = data.name
                }
                if(data.description != undefined){
                    p.description = data.description
                }
                fs.writeFileSync(target_path, JSON.stringify(p, null, 2))
                console.log("Update")
            }
        }else{
            console.log("token is null")
        }
    }
    //#endregion
}


export const backendEvent = new BackendEvent()
