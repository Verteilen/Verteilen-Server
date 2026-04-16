import { Database, DataHeader, Job, Library, Log, Node, Project, Shareable, Task, UserProfile } from "verteilen-core"

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
     * @param token User token
     */
    load_all: (token?:string) => Promise<Array<T>>
    delete_all: (token?:string) => Promise<Array<T>>
    list_all: (token?:string) => Promise<Array<T>>
    save: (uuid:string, data:T, token?:string) => Promise<boolean>
    load: (uuid:string, token?:string) => Promise<T>
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
    log: RecordIOLoader<Log>
    lib: RecordIOLoader<Library>
    user: RecordIOLoader<UserProfile>
}