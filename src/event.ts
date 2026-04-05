import tcpPortUsed from 'tcp-port-used'
import * as ws from 'ws'
import * as path from "path"
import * as fs from "fs"
import * as os from "os"
import { Socket } from 'socket.io';
import { messager, messager_log } from "./debugger"
import { 
    ClientJobExecute, 
    ConsoleServerManager, 
    ClientJavascript, 
    DATA_FOLDER, 
    Header, 
    Job, 
    JobCategory, 
    JobType, 
    Libraries, 
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
    ServerDetail,
    CreateRecordIOLoader,
    AuthType,
} from 'verteilen-core'
import { Loader } from './util/init/Loader'
import { PluginInit } from './util/init/PluginInit'
import { DetailInit } from './util/init/DetailInit'
import { CreateIO } from './util/init/CreateIO'
import { ModuleInit } from './util/init/ModuleInit'
import { GetRootSelf } from './auth'

export class BackendEvent extends Server implements BackendAction {
    console:ConsoleServerManager

    preference: Preference = CreatePreference()

    setting: ServerSetting | undefined
    jsCall:ClientJavascript
    libs:Libraries = {libs: []}
    
    constructor(){
        super()
        this.io = CreateIO()
        this.loader = CreateRecordIOLoader(this.io, this.memory)
        const feedback:PluginFeedback = {
            socket: undefined
        }
        this.LoadFromDisk()
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
        socket.on('javascript', this.javascript)
        socket.on('message', this.message)
        socket.on('load_record_obsolete', this.load_record_obsolete)
        socket.on('save_preference', this.save_preference)
        socket.on('load_preference', this.load_preference)
        Loader(socket, this.current_loader.project, 'project')
        Loader(socket, this.current_loader.task, 'task')
        Loader(socket, this.current_loader.job, 'job')
        Loader(socket, this.current_loader.database, 'database')
        Loader(socket, this.current_loader.node, 'node')
        Loader(socket, this.current_loader.log, 'log')
        Loader(socket, this.current_loader.lib, 'lib')
        PluginInit(socket, this.plugin_loader!)
        DetailInit(socket, this.detail!)
        ModuleInit(socket, this.module_project, () => this.memory)
        return this.console.Add(socket);
    }
    /**
     * Remove manager frontend instance
     * @param socket 
     */
    DropConsoleConsole = (socket:Socket) => {
        this.console.Remove(socket)
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
    Startup = () => {
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        if(!fs.existsSync(pa)) fs.mkdirSync(pa, {recursive: true});
        const server_setting = path.join(pa_root, "server.json")
        if(fs.existsSync(server_setting)){
            this.setting = JSON.parse(fs.readFileSync(server_setting).toString());
            if(this.setting?.auth){
                if(this.setting.auth.auth_type == AuthType.SELF){
                    GetRootSelf().then(x => {
                        if(x == undefined){
                            messager_log("Root user does not create yet", "Startup")
                        }else{
                            messager_log(`Login with root using username: ${x[1]} `, "Setup")
                            messager_log(`Login with root using password: ${x[2]} `, "Setup")
                        }
                    })
                }
            }
        }else{
            messager_log("Server does not finish setup process yet", "Startup")
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
