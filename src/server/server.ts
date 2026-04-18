import { PluginPageData, MemoryData } from "verteilen-core";
import { ServerAdmin } from "./admin";
import { ServerDetail } from "./detail";
import { CreateRecordMemoryLoader } from "./storage/memory";
import { Project_Module } from "./module/project";
import { PluginLoader } from "./plugin";
import { ConsoleServerManager } from "../script/console_server_manager";
import { RecordLoader } from "./storage/base";
import { AuthLoader } from "./auth/base";
import { CreateIO, IOBase } from "./io";

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
    /**
     * A simple object communicate with server disk storage
     */
    io:IOBase
    /**
     * Disk or cloud loader for the database
     */
    loader:RecordLoader | undefined = undefined
    uloader:AuthLoader | undefined = undefined
    /**
     * In memory loader for the database
     */
    memory_loader:RecordLoader
    plugin_loader: PluginLoader | undefined = undefined
    detail: ServerDetail | undefined
    admin: ServerAdmin | undefined = undefined
    
    module_project: Project_Module

    constructor() {
        this.io = CreateIO()
        this.memory_loader = CreateRecordMemoryLoader(this.memory)
        this.module_project = new Project_Module(this)
    }

    public get current_loader() : RecordLoader {
        if(this.loader) return this.loader
        return this.memory_loader
    }

    public get current_uloader() : AuthLoader | undefined {
        return this.uloader
    }

    /**
     * **Data: Memory**\
     * Load every type of data from disk, store them into memory
     */
    LoadFromDisk = ():Promise<Array<boolean>> => {
        const ts = [
            this.current_loader.project.init(),
            this.current_loader.task.init(),
            this.current_loader.job.init(),
            this.current_loader.database.init(),
            this.current_loader.node.init(),
            this.current_loader.log.init(),
            this.current_loader.lib.init(),
            this.current_loader.user.init(),
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