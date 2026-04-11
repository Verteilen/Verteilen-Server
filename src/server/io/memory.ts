import { 
    RecordType, 
    Shareable,
    DataHeader,
    MemoryData,
} from "verteilen-core"
import { RecordIOLoader, RecordLoader } from "./base"

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
        load_all: async (token?:string):Promise<Array<string>> => {
            const arr = get_array(type)
            return arr.map(x => JSON.stringify(x))
        },
        delete_all: async (token?:string):Promise<Array<string>> => {
            const arr = get_array(type)
            const p = arr.splice(0, arr.length)
            return p.map(x => x.uuid)
        },
        list_all: async (token?:string):Promise<Array<string>> => {
            const arr = get_array(type)
            return arr.map(x => x.uuid)
        },
        save: async (uuid:string, data:string, token?:string):Promise<boolean> => {
            const arr = get_array(type)
            const index = arr.findIndex(x => x.uuid == uuid)
            if(index != -1) arr[index] = JSON.parse(data)
            else arr.push(JSON.parse(data))
            return true
        },
        load: async (uuid:string, token?:string):Promise<string> => {
            const arr = get_array(type)
            const p = arr.find(x => x.uuid == uuid)
            if(p == undefined) throw new Error("Item do not exists")
            return JSON.stringify(p)
        },
        delete: async (uuid:string, token?:string):Promise<boolean> => {
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