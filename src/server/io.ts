// ========================
//                           
//      Share Codebase     
//                           
// ========================
import { 
    RecordType, 
    Shareable,
    DataHeader,
    MemoryData,
} from "verteilen-core"

/**
 * **Server Use Interface**\
 * FOr backend server action
 */
export interface RecordIOLoader {
    fetch_all: () => Promise<Array<string>>
    load_all: (token?:string) => Promise<Array<string>>
    delete_all: (token?:string) => Promise<Array<string>>
    list_all: (token?:string) => Promise<Array<string>>
    save: (uuid:string, data:string, token?:string) => Promise<boolean>
    load: (uuid:string, token?:string) => Promise<string>
    delete: (uuid:string, token?:string) => Promise<boolean>
}
/**
 * **IO Function Interface**\
 * Use for access the file store function
 */
export interface RecordIOBase {
    root: string
    join: (...paths:Array<string>) => string
    read_dir: (path:string) => Promise<Array<string>>
    read_dir_dir: (path:string) => Promise<Array<string>>
    read_dir_file: (path:string) => Promise<Array<string>>
    read_string: (path:string, options?:any) => Promise<string>
    write_string: (path:string, content:string) => Promise<void>
    exists: (path:string) => boolean
    mkdir: (path:string) => Promise<void>
    rm: (path:string) => Promise<void>
    cp: (path:string, newpath:string) => Promise<void>
}
/**
 * **IO Loader Worker**\
 * Fetch data from storage space, could be disk or mongoDB
 */
export interface RecordLoader {
    project: RecordIOLoader
    task: RecordIOLoader
    job: RecordIOLoader
    database: RecordIOLoader
    node: RecordIOLoader
    log: RecordIOLoader
    lib: RecordIOLoader
    user: RecordIOLoader
}

/**
 * **Create the interface for record memory storage**\
 * Generate a loader interface for register to server event
 * @param loader Memory loader interface
 * @param type Type of storage
 * @returns Interface for calling
 */
const _CreateRecordMemoryLoader = (loader:MemoryData, type:RecordType):RecordIOLoader => {
    const get_array = (type:RecordType):Array<Shareable & DataHeader> => {
        switch(type){
            default:
            case RecordType.PROJECT: return loader.projects
            case RecordType.TASK: return loader.tasks
            case RecordType.JOB: return loader.jobs
            case RecordType.DATABASE: return loader.database
            case RecordType.NODE: return loader.nodes
            case RecordType.LOG: return loader.logs
            case RecordType.LIB: return loader.libs
            case RecordType.USER: return loader.user
        }
    }
    return {
        fetch_all: async ():Promise<Array<string>> => {
            const arr = get_array(type)
            return arr.map(x => JSON.stringify(x))
        },
        load_all: async ():Promise<Array<string>> => {
            const arr = get_array(type)
            return arr.map(x => JSON.stringify(x))
        },
        delete_all: async ():Promise<Array<string>> => {
            const arr = get_array(type)
            const p = arr.splice(0, arr.length)
            return p.map(x => x.uuid)
        },
        list_all: async ():Promise<Array<string>> => {
            const arr = get_array(type)
            return arr.map(x => x.uuid)
        },
        save: async (uuid:string, data:string):Promise<boolean> => {
            const arr = get_array(type)
            const index = arr.findIndex(x => x.uuid == uuid)
            if(index != -1) arr[index] = JSON.parse(data)
            else arr.push(JSON.parse(data))
            return true
        },
        load: async (uuid:string):Promise<string> => {
            const arr = get_array(type)
            const p = arr.find(x => x.uuid == uuid)
            if(p == undefined) throw new Error("Item do not exists")
            return JSON.stringify(p)
        },
        delete: async (uuid:string):Promise<boolean> => {
            const arr = get_array(type)
            const index = arr.findIndex(x => x.uuid == uuid)
            if(index != -1) arr.splice(index, 1)
            return true
        }
    }
}


/**
 * **Create the interface for record memory storage**\
 * Generate a loader interface for register to server event
 * @param loader loader memory loader interface
 * @returns Interface for server calling
 */
export const CreateRecordMemoryLoader_Browser = (loader:MemoryData):RecordLoader => {
    return {
        project: _CreateRecordMemoryLoader(loader, RecordType.PROJECT),
        task: _CreateRecordMemoryLoader(loader, RecordType.TASK),
        job: _CreateRecordMemoryLoader(loader, RecordType.JOB),
        database: _CreateRecordMemoryLoader(loader, RecordType.DATABASE),
        node: _CreateRecordMemoryLoader(loader, RecordType.NODE),
        log: _CreateRecordMemoryLoader(loader, RecordType.LOG),
        lib: _CreateRecordMemoryLoader(loader, RecordType.LIB),
        user: _CreateRecordMemoryLoader(loader, RecordType.USER),
    }
}