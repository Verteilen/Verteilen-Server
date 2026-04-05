// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? Detail server implementation
//
import { v6 as uuidv6 } from 'uuid'
import { 
    BusAnalysis,
    ExecuteProxy, 
    ExecuteRecord, 
    ExecuteState, 
    FeedBack, 
    Header, 
    Job, 
    Messager, 
    NodeProxy, 
    Database, 
    Project, 
    Record, 
    RENDER_UPDATETICK, 
    ShellFolder, 
    Single, 
    Task, 
    SocketPack,
    ServerDetailEvent,
    BackendAction,
} from "verteilen-core"
import { PluginFeedback } from "./server"
import { RecordIOBase } from './io'
import { receivedPack, Console_Proxy } from './detail/console_handle'
import { Log_Proxy } from './detail/log_handle'
import { ExecuteManager } from '../script/execute_manager'
import { WebsocketManager } from '../script/socket_manager'
import { Socket } from 'socket.io'
import { ExecutePair } from '../interface/execute'

/**
 * **Server Inner-Work Handler**\
 * Include the core cluster logic here
 */
export class ServerDetail implements NodeProxy, ServerDetailEvent {
    execute_manager: Array<ExecutePair> = []
    websocket_manager: WebsocketManager | undefined

    shellBind = new Map()
    loader: RecordIOBase | undefined
    backend: BackendAction
    feedback: PluginFeedback
    message:Messager
    messager_log:Function
    updatehandle: any
    /**
     * **A simple message queue**\
     * message, trace message, error message return data, for update
     */
    re: Array<any> = []

    constructor(
        loader: RecordIOBase | undefined,
        backend:BackendAction, 
        feedback:PluginFeedback, 
        message:Messager,
        messager_log:Function)
    {
        this.loader = loader
        this.backend = backend
        this.feedback = feedback
        this.message = message
        this.messager_log = messager_log
        this.websocket_manager = new WebsocketManager(this.NewConnection, this.DisConnection, this.Analysis, messager_log, this.nodeEvents)
        // Internal update clock
        this.updatehandle = setInterval(() => {
            this.re.push(...this.console_update())
        }, RENDER_UPDATETICK);
    }

    /**
     * **Caller Reference**
     */
    public get events() : ServerDetailEvent { return this }
    /**
     * **Caller Reference**
     */
    public get nodeEvents() : NodeProxy { return this }
    
    //#region Socket Events
    NewConnection = (x:SocketPack) => {
        if(process.env.NODE_ENV == 'development') console.warn(`[Detail] New connection detected: ${x.url} \n${x.uuid}`)
        const p = {
            title: "New Connection Established",
            type: 'success',
            message: `${x.url} \n${x.uuid}`
        }
        if(this.feedback.socket && this.backend.Broadcasting){
            this.backend.Broadcasting('makeToast', p)
        }
        this.execute_manager.forEach(y => {
            y.manager!.NewConnection(x)
        })
    }
    DisConnection = (x:SocketPack) => {
        if(process.env.NODE_ENV == 'development') console.warn(`[Detail] Disconnect detected: ${x.url} \n${x.uuid}`)
        const p = {
            title: "Network Disconnected",
            type: 'error',
            message: `${x.url} \n${x.uuid}`
        }
        if(this.feedback.socket && this.backend.Broadcasting){
            this.backend.Broadcasting('makeToast', p)
        }
        this.execute_manager.forEach(y => {
            y.manager!.Disconnect(x)
        })
    }
    Analysis = (d:BusAnalysis) => {
        this.execute_manager.forEach(x => x.manager!.Analysis(JSON.parse(JSON.stringify(d))))   
    }
    //#endregion

    //#region Node Reply
    /**
     * **Shell Reply Message Event**\
     * Called by the client node
     * @param data Content
     * @param p Client node source
     */
    shellReply = (data:Single, p?:SocketPack) => {
        if(this.feedback.socket){
            if(p == undefined) return
            if(this.shellBind.has(p.uuid)){
                const k:Array<any> = this.shellBind.get(p.uuid)
                k.forEach(x => {
                    const h:Header = { name: "shellReply", data: data }
                    x.send(JSON.stringify(h))
                })
            }
        }
    }
    /**
     * **Shell Folder Location Event**\
     * Called by the client node
     * @param data Content
     * @param p Client node source
     */
    folderReply = (data:ShellFolder, p?:SocketPack) => {
        if(this.feedback.socket){
            if(p == undefined) return
            if(this.shellBind.has(p.uuid)){
                const k:Array<any> = this.shellBind.get(p.uuid)
                k.forEach(x => {
                    const h:Header = {
                        name: "folderReply", data: data
                    }
                    x.send(JSON.stringify(h))  
                })
            }
        }
    }
    //#endregion

    //#region For Backend
    resource_start = (socket:Socket | undefined, uuid:string) => {
        const p = this.websocket_manager!.targets.find(x => x.uuid == uuid)
        const d:Header = { name: 'resource_start', data: 0 }
        p?.socket.send(JSON.stringify(d))
    }

    resource_end = (socket:Socket | undefined, uuid:string) => {
        const p = this.websocket_manager!.targets.find(x => x.uuid == uuid)
        const d:Header = { name: 'resource_end', data: 0 }
        p?.socket.send(JSON.stringify(d))
    }

    plugin_info = (socket:Socket | undefined, uuid:string) => {
        const p = this.websocket_manager!.targets.find(x => x.uuid == uuid)
        const d:Header = { name: 'plugin_info', data: 0 }
        p?.socket.send(JSON.stringify(d))
    }

    //#region Shell
    shell_enter = (socket:Socket | undefined, uuid: string, value:string) => {
        this.websocket_manager!.shell_enter(uuid, value)
    }
    shell_open = (socket:Socket | undefined, uuid: string) => {
        this.websocket_manager!.shell_open(uuid)
        if(this.feedback.socket){
            if(this.shellBind.has(uuid)){
                this.shellBind.get(uuid).push(this.feedback.socket)
            }else{
                this.shellBind.set(uuid, [this.feedback.socket])
            }
        }
    }
    shell_close = (socket:Socket | undefined, uuid: string) => {
        this.websocket_manager!.shell_close(uuid)
        if(this.feedback.socket){
            if(this.shellBind.has(uuid)){
                const p:Array<any> = this.shellBind.get(uuid)
                const index = p.findIndex(x => x == this.feedback.socket)
                if(index != -1) p.splice(index, 1)
                this.shellBind.set(uuid, p)
            }
        }
    }
    shell_folder = (socket:Socket | undefined, uuid: string, path:string) => {
        this.websocket_manager!.shell_folder(uuid, path)
    }
    //#endregion

    //#region Node
    node_list = (socket:Socket | undefined) => {
        const p = this.websocket_manager?.targets
        if(this.feedback.socket != undefined){
            const h:Header = {
                name: "node_list-feedback",
                data: this.websocket_manager?.targets
            }
            this.feedback.socket(JSON.stringify(h))   
        }
        return p
    }
    node_add = (socket:Socket | undefined, url:string, uuid:string) => {
        const p = this.websocket_manager!.server_start(url, uuid)
        if(this.feedback.socket != undefined){
            const h:Header = {
                name: "node_add-feedback",
                data: p
            }
            this.feedback.socket(JSON.stringify(h))
        }
    }
    node_update = (socket:Socket | undefined) => {
        const p = this.websocket_manager?.server_update()
        if(this.feedback.socket != undefined){
            const h:Header = {
                name: "node_update-feedback",
                data: [p]
            }
            this.feedback.socket(JSON.stringify(h))
        }
        return p
    }
    node_delete = (socket:Socket | undefined, uuid:string, reason?:string) => {
        this.websocket_manager!.server_stop(uuid, reason)
    }
    //#endregion

    //#region Console
    console_list = (socket:Socket | undefined) => {
        if(this.feedback.socket != undefined){
            const h:Header = {
                name: "console_list-feedback",
                data: this.execute_manager.map(x => x.record)
            }
            this.feedback.socket(JSON.stringify(h))
        }
        return undefined;
    }
    console_record = (socket:Socket | undefined, uuid:string) => {
        const r = this.execute_manager.find(x => x.record?.uuid == uuid)?.record
        if(socket != undefined){
            const h:Header = {
                name: "console_record-feedback",
                data: JSON.stringify(r)
            }
            socket.send(JSON.stringify(h))
        }
        return JSON.stringify(r)
    }
    console_execute = (socket:Socket | undefined, uuid:string, type:number) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        target.record!.process_type = type
        target.record!.running = true
        target.record!.stop = false
        target.manager!.first = true
    }
    console_stop = (socket:Socket | undefined, uuid:string) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        target.record!.stop = true
        target.manager!.Stop()
    }
    console_add = (socket:Socket | undefined, name:string, record:Record, uuid:string | undefined) => {
        record.projects.forEach(x => x.uuid = uuidv6())
        const em:ExecuteManager = new ExecuteManager(
            name,
            this.websocket_manager!, 
            this.message, 
            JSON.parse(JSON.stringify(record)),
        )
        const er:ExecuteRecord = {
            ...record,
            uuid: em.uuid,
            name: name,
            running: false,
            stop: true,
            process_type: -1,
            useCron: false,
            para: undefined,
            command: [],
            project: '',
            task: '',
            project_index: -1,
            task_index: -1,
            project_state: [],
            task_state: [],
            task_detail: [],
        }
        em.libs = { libs: this.backend.memory.libs }
        
        const p:ExecutePair = { manager: em, record: er }
        const uscp:Console_Proxy = new Console_Proxy(p)
        const uslp:Log_Proxy = new Log_Proxy(p, { logs: this.backend.memory.logs }, this.backend.GetPreference(uuid)!)
        em.proxy = this.CombineProxy([uscp.execute_proxy, uslp.execute_proxy])
        const r = receivedPack(p, record)
        if(r) this.execute_manager.push(p)
        
        if(socket != undefined){
            const h:Header = {
                name: "console_add-feedback",
                data: r ? er : undefined
            }
            socket.send(JSON.stringify(h))
        }
    }
    console_update_call = () => {
        const p = this.re
        this.re = []
        if(this.feedback.socket){
            const h:Header = {
                name: "console_update-feedback",
                data: JSON.stringify(p)
            }
            this.feedback.socket(JSON.stringify(h))
        }
    }
    console_clean = (socket:Socket | undefined, uuid:string) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        target.manager!.Clean()
        target.record!.projects = []
        target.record!.project = ""
        target.record!.task = ""
        target.record!.project_index = -1
        target.record!.task_index = -1
        target.record!.project_state = []
        target.record!.task_state = []
        target.record!.task_detail = []
        target.manager!.Release()
        const index = this.execute_manager.findIndex(x => x.record!.uuid == uuid)
        this.execute_manager.splice(index, 1)
    }
    console_skip = (socket:Socket | undefined, uuid:string, forward:boolean, type:number, state:ExecuteState = ExecuteState.FINISH) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        if(type == 0){
            // Project
            target.record!.project_state[target.record!.project_index].state = forward ? (state != undefined ? state : ExecuteState.FINISH) : ExecuteState.NONE
            target.record!.project_index += forward ? 1 : -1
            if(target.record!.project_index == target.record!.projects.length) {
                target.record!.project_index = -1
                this.console_clean(socket, uuid)
            }
            else {
                if(target.record!.project_index < 0){
                    target.record!.project_index = 0
                }
                target.record!.task_state = target.record!.projects[target.record!.project_index].tasks.map(x => {
                    return {
                        uuid: x.uuid,
                        state: ExecuteState.NONE
                    }
                })
                target.record!.task_detail = []
                const p = target.record!.projects[target.record!.project_index]
                const t = p.tasks[target.record!.task_index]
                const count = target.manager!.get_task_state_count(t)
                for(let i = 0; i < count; i++){
                    target.record!.task_detail.push({
                        index: i,
                        node: "",
                        message: [],
                        state: ExecuteState.NONE
                    })
                }
                const index = forward ? target.manager!.SkipProject() : target.manager!.PreviousProject()
                console.log("%s project, index: %d, next count: %d", forward ? "Skip" : "Previous", index, count)
            }
        }else if (type == 1){
            const begining = target.record!.task_state[0].state == ExecuteState.NONE
            // Task
            if(!begining && forward) target.record!.task_state[target.record!.task_index].state = state != undefined ? state : ExecuteState.FINISH
            if(!forward) target.record!.task_state[target.record!.task_index].state = ExecuteState.NONE
            target.record!.task_index += forward ? 1 : -1
            if(target.record!.task_index == target.record!.task_state.length) {
                this.console_skip(socket, uuid, true, 0)
            }else{
                if(!begining && forward) target.record!.task_state[target.record!.task_index].state = state != undefined ? state : ExecuteState.FINISH
                else if (!forward) target.record!.task_state[target.record!.task_index].state = ExecuteState.RUNNING
                target.record!.task_detail = []
                const p = target.record!.projects[target.record!.project_index]
                const t = p.tasks[target.record!.task_index]
                const count = target.manager!.get_task_state_count(t)
                for(let i = 0; i < count; i++){
                    target.record!.task_detail.push({
                        index: i,
                        node: "",
                        message: [],
                        state: ExecuteState.NONE
                    })
                }
                const index = forward ? target.manager!.SkipTask() : target.manager!.PreviousTask()
                console.log("Skip task, index: %d, next count: %d", index, count)
            }
        }
    }
    console_skip2 = (socket:Socket | undefined, uuid:string, v:number) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        const index = target.manager!.SkipSubTask(v)
        if(index < 0) {
            console.error("Skip step failed: ", index)
            return
        }
        for(let i = 0; i < index; i++){
            target.record!.task_detail[i].state = ExecuteState.FINISH
        }
        console.log("Skip task", index)
    }
    console_update = () => {
        const re:Array<any> = []
        this.execute_manager.forEach(x => {
            if(x.record!.running && !x.record!.stop){
                try {
                    x.manager!.Update()
                }catch(err:any){
                    x.record!.stop = true
                    console.log(err)
                    re.push({
                        code: 400,
                        name: err.name,
                        message: err.message,
                        stack: err.stack
                    })
                }
            }
            if(x.record!.stop){
                if(x.manager!.jobstack == 0){
                    x.record!.running = false
                }
            }
            if(x.record!.command.length > 0){
                const p:Array<any> = x.record!.command.shift()!
                if(p[0] == 'clean') this.console_clean(undefined, x.record!.uuid)
                else if (p[0] == 'stop') this.console_stop(undefined, x.record!.uuid)
                else if (p[0] == 'skip') this.console_skip(undefined, x.record!.uuid, p[1], p[2])
                else if (p[0] == 'execute') this.console_execute(undefined, x.record!.uuid, p[1])
            }
        })
        if(this.loader != undefined){
            const logss = this.backend.memory.logs.filter(x => x.dirty && x.output)
            for(var x of logss){
                x.dirty = false
                const filename = this.loader.join(this.loader.root, "log", `${x.uuid}.json`)
                this.loader.write_string(filename, JSON.stringify(x, null, 4))
            }
        }
        return re
    }
    //#endregion

    //#endregion
    CombineProxy = (eps:Array<ExecuteProxy>) => {
        const p:ExecuteProxy = {
            executeProjectStart: (data:[Project, number]):void => { eps.forEach(x => x.executeProjectStart(JSON.parse(JSON.stringify(data)))) },
            executeProjectFinish: (data:[Project, number]):void => { eps.forEach(x => x.executeProjectFinish(JSON.parse(JSON.stringify(data)))) },
            executeTaskStart: (data:[Task, number]):void => { eps.forEach(x => x.executeTaskStart(JSON.parse(JSON.stringify(data)))) },
            executeTaskFinish: (data:Task):void => { eps.forEach(x => x.executeTaskFinish(JSON.parse(JSON.stringify(data)))) },
            executeSubtaskStart: (data:[Task, number, string]):void => { eps.forEach(x => x.executeSubtaskStart(JSON.parse(JSON.stringify(data)))) },
            executeSubtaskUpdate: (data:[Task, number, string, ExecuteState]):void => { eps.forEach(x => x.executeSubtaskUpdate(JSON.parse(JSON.stringify(data)))) },
            executeSubtaskFinish: (data:[Task, number, string]):void => { eps.forEach(x => x.executeSubtaskFinish(JSON.parse(JSON.stringify(data)))) },
            executeJobStart: (data:[Job, number, string]):void => { eps.forEach(x => x.executeJobStart(JSON.parse(JSON.stringify(data)))) },
            executeJobFinish: (data:[Job, number, string, number]):void => { eps.forEach(x => x.executeJobFinish(JSON.parse(JSON.stringify(data)))) },
            feedbackMessage: (data:FeedBack):void => { eps.forEach(x => x.feedbackMessage(JSON.parse(JSON.stringify(data)))) },
            updateDatabase: (data:Database):void => { eps.forEach(x => x.updateDatabase(JSON.parse(JSON.stringify(data)))) },
        }
        return p
    }
}