// ========================
//                           
//      Share Codebase     
//                           
// ========================
import { PluginPageData, MemoryData } from "verteilen-core";
import { ServerAdmin } from "./admin";
import { ServerDetail } from "./detail";
import { CreateRecordMemoryLoader_Browser, RecordIOBase, RecordLoader } from "./io";
import { Project_Module } from "./module/project";
import { PluginLoader } from "./plugin";
import { ConsoleServerManager } from "../script/console_server_manager";

export type Caller_Electron_Send = (channel: string, ...args: any[]) => void
export interface Caller_Electron {
    send: Caller_Electron_Send
}
export type Caller_Socket = (data: any) => void
export type TypeMap = { [key:string]:Function }

/**
 * **Backend Feedback**\
 * The config that which {@link ServerDetail} require to use\
 * Depends on what input value it have, it could have different type of response
 */
export interface PluginFeedback {
    /**
     * WebServer feedback
     */
    socket:Caller_Socket | undefined
}

export class ServerBase {
    manager:ConsoleServerManager | undefined = undefined
    memory: MemoryData = {
        projects: [],
        tasks: [],
        jobs: [],
        database: [],
        nodes: [],
        logs: [],
        libs: [],
        user: [],
    }
    plugin: PluginPageData = {
        plugins: [],
    }
    io:RecordIOBase | undefined = undefined
    loader:RecordLoader | undefined = undefined
    memory_loader:RecordLoader
    plugin_loader: PluginLoader | undefined = undefined
    detail: ServerDetail | undefined
    admin: ServerAdmin | undefined = undefined
    
    module_project: Project_Module

    constructor() {
        this.memory_loader = CreateRecordMemoryLoader_Browser(this.memory)
        this.module_project = new Project_Module(this)
    }

    public get current_loader() : RecordLoader {
        if(this.loader) return this.loader
        return this.memory_loader
    }

    /**
     * **Data: Memory**\
     * Load every type of data from disk, store them into memory
     */
    LoadFromDisk = ():Promise<Array<Array<string>>> => {
        const ts = [
            this.current_loader.project.fetch_all(),
            this.current_loader.task.fetch_all(),
            this.current_loader.job.fetch_all(),
            this.current_loader.database.fetch_all(),
            this.current_loader.node.fetch_all(),
            this.current_loader.log.fetch_all(),
            this.current_loader.lib.fetch_all(),
            this.current_loader.user.fetch_all(),
        ]
        return Promise.all(ts)
    }
    /**
     * **Broadcast To Console**\
     * Send messages to all console server
     * @param name channel
     * @param data raw data
     */
    Boradcasting = (name:string, data:any) => {
        this.manager?.admins.forEach(x => {
            x.socket.emit(name, data)
        })
    }
}