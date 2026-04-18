import { Database, DataHeader, Job, Library, ExecutionLog, Node, Project, Shareable, Task, UserProfile } from "verteilen-core"

/**
 * **Server Use Interface**\
 * For backend server action
 */
export interface RecordIOLoader<T extends DataHeader & Shareable> {
    /**
     * Init the data storage
     */
    init: () => Promise<boolean>
    /**
     * Loading all data from storage
     */
    load_all: (token?:string) => Promise<Array<T>>
    /**
     * Clear the database
     * @returns The data from deleting
     */
    delete_all: (token?:string) => Promise<Array<T>>
    /**
     * Fetch all the uuid from storage
     * @returns UUID list
     */
    list_all: (token?:string) => Promise<Array<string>>
    /**
     * Save data to storage
     * @param uuid Target uuid
     * @param data data instance
     * @returns Successfully
     */
    save: (uuid:string, data:T, token?:string) => Promise<boolean>
    /**
     * Loading data from storage
     * @param uuid Target uuid
     * @returns Data instance
     */
    load: (uuid:string, token?:string) => Promise<T>
    /**
     * Deleting data from storage
     * @param uuid Target uuid
     * @returns Successfully
     */
    delete: (uuid:string, token?:string) => Promise<boolean>
}
/**
 * **IO Loader Worker**\
 * Fetch data from storage space, could be disk or cloud
 */
export interface RecordLoader {
    project: RecordIOLoader<Project>
    task: RecordIOLoader<Task>
    job: RecordIOLoader<Job>
    database: RecordIOLoader<Database>
    node: RecordIOLoader<Node>
    log: RecordIOLoader<ExecutionLog>
    lib: RecordIOLoader<Library>
    user: RecordIOLoader<UserProfile>
}