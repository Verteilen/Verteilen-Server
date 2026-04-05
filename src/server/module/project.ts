// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? This script handle the project port of the server module
//  ? Such as:
//    * delete project trigger cascade chain reaction
//    * Populate the project to a single JSON object
//
import { Socket } from "socket.io"
import { MemoryData, Job, Project, Task } from "verteilen-core"
import { RecordLoader } from "../io"
import { ServerBase } from "../server"
import { v6 as uuidv6 } from 'uuid'

export class Project_Module {
    server:ServerBase

    constructor(memory:ServerBase) {
        this.server = memory
    }

    public get memory(): MemoryData { return this.server.memory }
    public get loader(): RecordLoader { return this.server.current_loader }

    async ProjectJobCount(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<void> {
        await this.loader.project.load(uuid, token)
        const p:Project | undefined = this.memory.projects.find(p=> p.uuid == uuid)
        if(!p) return
        const t:Array<Task> = p.tasks_uuid.map(t_uuid => this.memory.tasks.find(t => t.uuid == t_uuid)).filter(t => t != undefined)
        const counts = t.map(x => x.jobs_uuid.length)
        const v = counts.reduce((a,b) => a + b, 0)
        socket?.emit("project_module:get_job_count-feedback", v)
    }
    async ReOrderProjectTask(socket:Socket | undefined, uuid:string, uuids:Array<string>, token?: string | undefined):Promise<void> {
        await this.loader.project.load(uuid, token)
        const p:Project | undefined = this.memory.projects.find(p=> p.uuid == uuid)
        if(!p) return
        p.tasks_uuid = uuids
        this.loader.project.save(uuid, JSON.stringify(p, null, 4), token)
    }

    async PopulateProject(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<void> {
        const v = await this._PopulateProject(socket, uuid, token)
        socket?.emit("project_module:populate_project-feedback", v)
    }
    /**
     * Assign real data to instance
     * @param uuid Project UUID
     */
    async _PopulateProject(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<Project | undefined> {
        await this.loader.project.load(uuid, token)
        const p:Project | undefined = this.memory.projects.find(p=> p.uuid == uuid)
        if(!p) return
        const buffer:Project = Object.assign({}, p) as Project
        const ts = buffer.tasks_uuid.map(x => this.PopulateTask(socket, x, token))
        buffer.tasks = (await Promise.all(ts)).filter(x => x != undefined)
        return buffer
    }
    async PopulateTask(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<void> {
        const v = await this._PopulateTask(socket, uuid, token)
        socket?.emit("project_module:populate_task-feedback", v)
    }
    /**
     * Assign real data to instance
     * @param uuid Task UUID
     */
    async _PopulateTask(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<Task | undefined> {
        await this.loader.task.load(uuid, token)
        const p:Task | undefined = this.memory.tasks.find(p=> p.uuid == uuid)
        if(!p) return undefined
        const buffer:Task = Object.assign({}, p) as Task
        const js = buffer.jobs_uuid.map(async x => {
            await this.loader.job.load(uuid, token)
            return this.memory.jobs.find(t => t.uuid == x)
        })
        buffer.jobs = (await Promise.all(js)).filter(x => x != undefined)
        return buffer
    }
    /**
     * Get tasks from project related
     * @param uuid Project UUID
     * @returns Related Tasks
     */
    async GetProjectRelatedTask(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<void> {
        await this.loader.project.load(uuid, token)
        const p = this.memory.projects.find(x => x.uuid == uuid)
        if(!p) {
            socket?.emit("project_module:get_tasks-feedback", [])
            return
        }
        const r = p.tasks_uuid.map(x => {
            return this.loader.task.load(x, token)
        })
        await Promise.all(r)
        const tasks = p.tasks_uuid.map(x => this.memory.tasks.find(y => y.uuid == x)).filter(x => x != undefined)
        socket?.emit("project_module:get_tasks-feedback", tasks)
    }
    /**
     * Get jobs from task related
     * @param uuid Task UUID
     * @returns Related Jobs
     */
    async GetTaskRelatedJob(socket:Socket | undefined, uuid:string, token?: string | undefined):Promise<void> {
        await this.loader.task.load(uuid, token)
        const p = this.memory.tasks.find(x => x.uuid == uuid)
        if(!p) {
            socket?.emit("project_module:get_jobs-feedback", [])
            return
        }
        const r = p.jobs_uuid.map(x => {
            return this.loader.job.load(x, token)
        })
        await Promise.all(r)
        const jobs = p.jobs_uuid.map(x => this.memory.jobs.find(y => y.uuid == x)).filter(x => x != undefined)
        socket?.emit("project_module:get_jobs-feedback", jobs)
    }
    async CloneProjects(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<void> {
        const v = await this._CloneProjects(socket, uuids, token)
        socket?.emit("project_module:clone_projects-feedback", v);
    }
    /**
     * Clone Project Container
     * @param uuids project uuids
     * @returns The new uuids list
     */
    async _CloneProjects(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<Array<string>>{
        const p = uuids.map(x => this.loader.project.load(x, token))
        const ps = await Promise.all(p)
        const projects:Array<Project> = ps.map(x => JSON.parse(x))
        projects.forEach((x, i) => x.uuid = uuidv6({}, undefined, i))
        const jus = projects.map(x => this._CloneTasks(socket, x.tasks_uuid, token))
        const ju = await Promise.all(jus)
        projects.forEach((t, index) => {
            t.tasks_uuid = ju[index]
        })
        const js = projects.map(x => this.loader.project.save(x.uuid, JSON.stringify(x), token))
        await Promise.all(js)
        return projects.map(x => x.uuid)
    }
    async CloneTasks(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<void> {
        const v = await this._CloneTasks(socket, uuids, token)
        socket?.emit("project_module:clone_tasks-feedback", v)
    }
    /**
     * Clone Task Container
     * @param uuids task uuids
     * @returns The new uuids list
     */
    async _CloneTasks(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<Array<string>> {
        const p = uuids.map(x => this.loader.task.load(x, token))
        const ps = await Promise.all(p)
        const tasks:Array<Task> = ps.map(x => JSON.parse(x))
        tasks.forEach((x, i) => x.uuid = uuidv6({}, undefined, 2500 + i))
        const jus = tasks.map(x => this._CloneJobs(socket, x.jobs_uuid, token))
        const ju = await Promise.all(jus)
        tasks.forEach((t, index) => {
            t.jobs_uuid = ju[index]
        })
        const js = tasks.map(x => this.loader.task.save(x.uuid, JSON.stringify(x), token))
        await Promise.all(js)
        return tasks.map(x => x.uuid)
    }
    async CloneJobs(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<void> {
        const v = await this._CloneJobs(socket, uuids, token)
        socket?.emit("project_module:clone_jobs-feedback", v);
    }
    /**
     * Clone Job Container
     * @param uuids job uuids
     * @returns The new uuids list
     */
    async _CloneJobs(socket:Socket | undefined, uuids:Array<string>, token?: string | undefined):Promise<Array<string>>{
        const p = uuids.map(x => this.loader.job.load(x, token))
        const ps = await Promise.all(p)
        const jobs:Array<Job> = ps.map(x => JSON.parse(x))
        jobs.forEach((x, i) => x.uuid = uuidv6({}, undefined, 5000 + i))
        const js = jobs.map(x => this.loader.job.save(x.uuid, JSON.stringify(x), token))
        await Promise.all(js)
        return jobs.map(x => x.uuid)
    }
    /**
     * Delete project related data and project itself
     * @param uuid Project UUID
     */
    async CascadeDeleteProject(socket:Socket | undefined, uuid:string, bind:boolean, token?: string | undefined):Promise<void>{
        await this.loader.project.load(uuid, token)
        const p:Project = this.memory.projects.find(p=> p.uuid == uuid)!
        if(!p) return
        const ps = p.tasks_uuid.map(t_uuid => this.CascadeDeleteTask(socket, t_uuid, false, token))
        await Promise.all(ps)
        const del = await this.loader.project.delete(uuid, token)
        console.log("Delete project: ", del)
        const db = p.database_uuid
        if(bind) await this.Delete_Database_Idle(socket, db, token)
    }
    /**
     * Delete Task related data and project itself
     * @param uuid Task UUID
     */
    async CascadeDeleteTask(socket:Socket | undefined, uuid:string, project_change:boolean = true, token?: string | undefined):Promise<void>{
        await this.loader.task.load(uuid, token)
        const p:Task = this.memory.tasks.find(p=> p.uuid == uuid)!
        if(!p) return
        const ps = p.jobs_uuid.map(j_uuid => this.loader.job.delete(j_uuid, token))
        await Promise.all(ps)
        await this.loader.task.delete(uuid, token)
        // The project with task uuid includes
        if(!project_change) return
        const caller:Array<Promise<boolean>> = []
        const ps2 = this.memory.projects.filter(x => x.tasks_uuid.includes(uuid)).map(x => x.uuid)
        for(let u of ps2){
            const index = this.memory.projects.findIndex(x => x.uuid == u)
            if(index == -1) {
                if(process.env.NODE_ENV == 'development') console.error(`[Project:Module] Cascade:Task command, get projects index failed: ${u}`)
                continue
            }
            const buffer:Project = JSON.parse(JSON.stringify(this.memory.projects[index]))
            const task_index = buffer.tasks_uuid.findIndex(x => x == uuid)
            if(task_index == -1){
                if(process.env.NODE_ENV == 'development') console.error(`[Project:Module] Cascade:Task command, get projects task_index failed: ${u}`)
                continue
            }
            buffer.tasks_uuid.splice(task_index, 1)
            caller.push(this.loader.project.save(u, JSON.stringify(buffer, null, 4)))
        }
        await Promise.all(caller)
    }
    /**
     * Delete Task related data and project itself
     * @param uuid Task UUID
     */
    async CascadeDeleteJob(socket:Socket | undefined, uuid:string, task_change:boolean = true, token?: string | undefined):Promise<void>{
        await this.loader.job.delete(uuid, token)
        if(!task_change) return
        const caller:Array<Promise<boolean>> = []
        const ps2 = this.memory.tasks.filter(x => x.jobs_uuid.includes(uuid)).map(x => x.uuid)
        for(let u of ps2){
            const index:number = this.memory.tasks.findIndex(x => x.uuid == u)
            if(index == -1) {
                if(process.env.NODE_ENV == 'development') console.error(`[Project:Module] Cascade:Job command, get tasks index failed: ${u}`)
                continue
            }
            const buffer:Task = JSON.parse(JSON.stringify(this.memory.tasks[index]))
            const job_index:number = buffer.jobs_uuid.findIndex(x => x == uuid)
            if(job_index == -1) {
                if(process.env.NODE_ENV == 'development') console.error(`[Project:Module] Cascade:Job command, get tasks job_index failed: ${u}`)
                continue
            }
            buffer.jobs_uuid.splice(job_index, 1)
            caller.push(this.loader.task.save(u, JSON.stringify(buffer, null, 4)))
        }
        await Promise.all(caller)
    }
    /**
     * Delete idle database
     * @param uuid Database UUID
     */
    async Delete_Database_Idle(socket:Socket | undefined, uuid:string, token?: string | undefined){
        return this.loader.project.load_all(token).then(() => {
            const f = this.memory.projects.find(x => x.database_uuid == uuid)
            if(f == undefined){
                this.loader.database.delete(uuid, token)
            }
        })
    }
}