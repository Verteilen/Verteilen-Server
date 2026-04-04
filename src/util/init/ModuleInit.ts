import { Socket } from "socket.io"
import { Project_Module, MemoryData, TypeMap } from "verteilen-core"

export const ModuleInit = (socket:Socket, project:Project_Module, memory:()=>MemoryData) => {
    // Project
    socket.on("project_module:get_job_count", (uuid:string, token?:string | undefined) => project.ProjectJobCount(socket, uuid, token))
    socket.on("project_module:reorder_project_tasks", (uuid:string, uuids:Array<string>, token?:string | undefined) => project.ReOrderProjectTask(socket, uuid, uuids, token))
    socket.on("project_module:populate_project", (uuid:string, token?:string | undefined) => project.PopulateProject(socket, uuid, token))
    socket.on("project_module:populate_task", (uuid:string, token?:string | undefined) => project.PopulateTask(socket, uuid, token))
    socket.on("project_module:get_tasks", (uuid:string, token?:string | undefined) => project.GetProjectRelatedTask(socket, uuid, token))
    socket.on("project_module:get_jobs", (uuid:string, token?:string | undefined) => project.GetTaskRelatedJob(socket, uuid, token))
    socket.on("project_module:clone_projects", (token?:string | undefined, ...uuid:Array<string>) => project.CloneProjects(socket, uuid, token))
    socket.on("project_module:clone_tasks", (token?:string | undefined, ...uuid:Array<string>) => project.CloneTasks(socket, uuid, token))
    socket.on("project_module:clone_jobs", (token?:string | undefined, ...uuid:Array<string>) => project.CloneJobs(socket, uuid, token))
    socket.on("project_module:cascade_project", (uuid:string, bind:boolean, token?:string | undefined) => project.CascadeDeleteProject(socket, uuid, bind, token))
    socket.on("project_module:cascade_task", (uuid:string, token?:string | undefined) => project.CascadeDeleteTask(socket, uuid, true, token))
    socket.on("project_module:cascade_job", (uuid:string, token?:string | undefined) => project.CascadeDeleteJob(socket, uuid, true, token))
    // Debug
    socket.on("debug:dump", () => JSON.stringify(memory()))
}