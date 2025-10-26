import { 
    Execute_ExecuteManager, 
    Execute_SocketManager, 
    I18N,
    Record, 
    Task, 
    ExecuteProxy, 
    Project, 
    ExecuteState, 
    Job, 
    FeedBack, 
    Parameter, 
    ExecuteRecord, 
    Log, 
    Libraries, 
    AppConfig, 
    Preference, 
    NodeProxy, 
    ShellFolder, 
    Single, 
    ExecutePair, 
    RENDER_UPDATETICK, 
    BusAnalysis, 
    WebsocketPack, 
    Header, 
    DATA_FOLDER 
} from 'verteilen-core'
import { v6 as uuidv6 } from 'uuid'
import { Util_Server_Console, Util_Server_Console_Proxy } from "./console_handle"
import { BackendEvent } from "../../event"
import { messager, messager_log } from "../../debugger"
import { Util_Server_Log_Proxy } from "./log_handle"
import { TypeMap } from "../loader"
import * as fs from 'fs'
import * as ws from 'ws'
import * as path from 'path'
import * as os from 'os'

export type save_and_update = () => void

export class Util_Server {
    websocket_manager: Execute_SocketManager.WebsocketManager | undefined
    execute_manager: Array<ExecutePair> = []

    shellBind = new Map()
    libs:Libraries = {libs: []}
    logs: Log = {logs: []}

    backend: BackendEvent
    console:Util_Server_Console
    config:AppConfig | undefined
    updatehandle: any
    re: Array<any> = []

    constructor(backend:BackendEvent){
        this.backend = backend
        const n:NodeProxy = {
            shellReply: this.shellReply,
            folderReply: this.folderReply
        }
        this.websocket_manager = new Execute_SocketManager.WebsocketManager(this.NewConnection, this.DisConnection, this.Analysis, messager_log, n)
        this.console = new Util_Server_Console()
        this.updatehandle = setInterval(() => {
            this.re.push(...this.console_update())
        }, RENDER_UPDATETICK);
    }

    private NewConnection = (x:WebsocketPack) => {
        const p = {
            title: I18N.i18n.global.t('toast.connection-create-title'),
            type: 'success',
            message: `${I18N.i18n.global.t('toast.connection-create-des')}: ${x.websocket.url} \n${x.uuid}`
        }
        this.backend.Boradcasting("makeToast", p)
        this.execute_manager.forEach(y => {
            y.manager!.NewConnection(x)
        })
    }

    private DisConnection = (x:WebsocketPack) => {
        const p = {
            title: I18N.i18n.global.t('toast.connection-remove-title'),
            type: 'error',
            message: `${I18N.i18n.global.t('toast.connection-remove-des')}: ${x.websocket.url} \n${x.uuid}`
        }
        this.backend.Boradcasting("makeToast", p)
        this.execute_manager.forEach(y => {
            y.manager!.Disconnect(x)
        })
    }

    private Analysis = (d:BusAnalysis) => {
        this.execute_manager.forEach(x => x.manager!.Analysis(JSON.parse(JSON.stringify(d))))   
    }

    private shell_enter = (socket:ws.WebSocket, uuid: string, value:string) => {
        this.websocket_manager!.shell_enter(uuid, value)
    }

    private shell_open = (socket:ws.WebSocket, uuid: string) => {
        this.websocket_manager!.shell_open(uuid)
        if(this.shellBind.has(uuid)){
            this.shellBind.get(uuid).push(socket)
        }else{
            this.shellBind.set(uuid, [socket])
        }
    }

    private shell_close = (socket:ws.WebSocket, uuid: string) => {
        this.websocket_manager!.shell_close(uuid)
        if(this.shellBind.has(uuid)){
            const p:Array<ws.WebSocket> = this.shellBind.get(uuid)
            const index = p.findIndex(x => x == socket)
            if(index != -1) p.splice(index, 1)
            this.shellBind.set(uuid, p)
        }
    }

    private shell_folder = (socket:ws.WebSocket, uuid: string, path:string) => {
        this.websocket_manager!.shell_folder(uuid, path)
    }

    private resource_start = (socket:ws.WebSocket, uuid:string) => {
        const p = this.websocket_manager!.targets.find(x => x.uuid == uuid)
        const d:Header = { name: 'resource_start', data: 0 }
        p?.websocket.send(JSON.stringify(d))
    }

    private resource_end = (socket:ws.WebSocket, uuid:string) => {
        const p = this.websocket_manager!.targets.find(x => x.uuid == uuid)
        const d:Header = { name: 'resource_end', data: 0 }
        p?.websocket.send(JSON.stringify(d))
    }

    private node_list = (socket:ws.WebSocket) => {
        const h:Header = {
            name: "node_list-feedback",
            data: this.websocket_manager?.targets
        }
        socket.send(JSON.stringify(h))
    }

    private node_add = (socket:ws.WebSocket, url:string, id:string) => {
        const h:Header = {
            name: "node_add-feedback",
            data: this.websocket_manager?.server_start(url, id)
        }
        socket.send(JSON.stringify(h))
    }

    private node_update = (socket:ws.WebSocket) => {
        const h:Header = {
            name: "node_update-feedback",
            data: [this.websocket_manager?.server_update()]
        }
        socket.send(JSON.stringify(h))
    }

    private node_delete = (socket:ws.WebSocket, uuid:string, reason?:string) => {
        this.websocket_manager?.server_stop(uuid, reason)
    }

    private console_list = (socket:ws.WebSocket) => {
        const h:Header = {
            name: "console_list-feedback",
            data: this.execute_manager.map(x => x.record)
        }
        socket.send(JSON.stringify(h))
    }

    private shellReply = (data:Single, p?:WebsocketPack) => {
        if(p == undefined) return
        if(this.shellBind.has(p.uuid)){
            const k:Array<ws.WebSocket> = this.shellBind.get(p.uuid)
            k.forEach(x => {
                const h:Header = {
                    name: "shellReply", data: data
                }
                x.send(JSON.stringify(h))
            })
        }
    }
    private folderReply = (data:ShellFolder, p?:WebsocketPack) => {
        if(p == undefined) return
        if(this.shellBind.has(p.uuid)){
            const k:Array<ws.WebSocket> = this.shellBind.get(p.uuid)
            k.forEach(x => {
                const h:Header = {
                    name: "folderReply", data: data
                }
                x.send(JSON.stringify(h))  
            })
        }
    }

    private console_record = (socket:ws.WebSocket, uuid:string) => {
        const r = this.execute_manager.find(x => x.record?.uuid == uuid)?.record
        const h:Header = {
            name: "console_record-feedback",
            data: JSON.stringify(r)
        }
        socket.send(JSON.stringify(h))
    }

    private console_execute = (socket:ws.WebSocket | undefined, uuid:string, type:number) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        target.record!.process_type = type
        target.record!.running = true
        target.record!.stop = false
        target.manager!.first = true
    }

    private console_stop = (socket:ws.WebSocket | undefined, uuid:string) => {
        const target = this.execute_manager.find(x => x.record!.uuid == uuid)
        if(target == undefined) return
        target.record!.stop = true
        target.manager!.Stop()
    }

    private console_add = (socket:ws.WebSocket, name:string, record:Record, preference:Preference) => {
        record.projects.forEach(x => x.uuid = uuidv6())
        const em:Execute_ExecuteManager.ExecuteManager = new Execute_ExecuteManager.ExecuteManager(
            name,
            this.websocket_manager!, 
            messager, 
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
        em.libs = this.libs
        const p:ExecutePair = { manager: em, record: er }
        const uscp:Util_Server_Console_Proxy = new Util_Server_Console_Proxy(p)
        const uslp:Util_Server_Log_Proxy = new Util_Server_Log_Proxy(p, this.logs, preference!)
        em.proxy = this.CombineProxy([uscp.execute_proxy, uslp.execute_proxy])
        const r = this.console.receivedPack(p, record)
        if(r) this.execute_manager.push(p)
        const h:Header = {
            name: "console_add-feedback",
            data: r ? er : undefined
        }
        socket.send(JSON.stringify(h))
    }

    private console_update = () => {
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
        const logss = this.logs.logs.filter(x => x.dirty && x.output)
        logss.forEach(x => {
            x.dirty = false
            const filename = path.join(os.homedir(), DATA_FOLDER, "log", `${x.uuid}.json`)
            fs.writeFileSync(filename, JSON.stringify(x, null, 4))
        })
        return re
    }

    private console_update_call = (socket:ws.WebSocket) => {
        const p = this.re
        this.re = []
        const h:Header = {
            name: "console_update-feedback",
            data: JSON.stringify(p)
        }
        socket.send(JSON.stringify(h))
    }

    private console_clean = (socket:ws.WebSocket | undefined, uuid:string) => {
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

    private console_skip = (socket:ws.WebSocket | undefined, uuid:string, forward:boolean, type:number, state:ExecuteState = ExecuteState.FINISH) => {
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
                target.record!.task_state = target.record!.projects[target.record!.project_index].task.map(x => {
                    return {
                        uuid: x.uuid,
                        state: ExecuteState.NONE
                    }
                })
                target.record!.task_detail = []
                const p = target.record!.projects[target.record!.project_index]
                const t = p.task[target.record!.task_index]
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
                const t = p.task[target.record!.task_index]
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

    private console_skip2 = (socket:ws.WebSocket, uuid:string, v:number) => {
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

    EventInit = (typeMap:TypeMap):TypeMap => {
        typeMap = Object.assign(typeMap, {
            'resource_start': this.resource_start,
            'resource_end': this.resource_end,
            'shell_enter': this.shell_enter,
            'shell_open': this.shell_open,
            'shell_close': this.shell_close,
            'shell_folder': this.shell_folder,
            'node_list': this.node_list,
            'node_add': this.node_add,
            'node_update': this.node_update,
            'node_delete': this.node_delete,
            'console_list': this.console_list,
            'console_record': this.console_record,
            'console_execute': this.console_execute,
            'console_stop': this.console_stop,
            'console_clean': this.console_clean,
            'console_skip': this.console_skip,
            'console_skip2': this.console_skip2,
            'console_add': this.console_add,
            'console_update': this.console_update_call,
        })
        return typeMap
    }

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
            updateParameter: (data:Parameter):void => { eps.forEach(x => x.updateParameter(JSON.parse(JSON.stringify(data)))) },
        }
        return p
    }
}