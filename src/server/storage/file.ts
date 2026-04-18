import { 
    RecordType, 
    MemoryData,
    DataHeader,
    Shareable,
} from "verteilen-core"
import { RecordIOLoader, RecordLoader } from "./base"
import { IOBase } from "../io/base"
import { _CreateRecordMemoryLoader, getArrayFromMemory } from "./memory"

const folder_root_helper = async (loader:IOBase, folder:string) => {
    const root = loader.join(loader.root, folder)
    if(!loader.exists(root)) await loader.mkdir(root);
    return root
}

/**
 * **Create the interface for record files storage**\
 * Generate a loader interface for register to server event
 * @param loader File loader interface
 * @param memory Memory loader interface
 * @param type Type of storage
 * @param folder Folder name
 * @param ext Store file extension
 * @returns Interface for calling
 */
const _CreateRecordIOLoader = <T extends DataHeader & Shareable>(loader:IOBase, memory:MemoryData, type:RecordType, folder:string, ext:string = ".json"):RecordIOLoader<T> => {
    const mem:RecordIOLoader<T> = _CreateRecordMemoryLoader(memory, type)
    return {
        init: async ():Promise<boolean> => {
            await folder_root_helper(loader, folder)
            return mem.init()
        },
        load_all: async (token?:string):Promise<Array<T>> => {
            const root = await folder_root_helper(loader, folder)
            const files = await loader.read_dir_file(root)
            const a:Array<Promise<T>> = []
            for(let f of files){
                a.push(new Promise<T>(async (resolve) => {
                    const te = await loader.read_string(loader.join(root, f))
                    resolve(JSON.parse(te) as T)
                })) 
            }
            const a1:Array<T> = (await Promise.all(a) as Array<T>)

            await mem.delete_all();
            for(let f of a1){
                await mem.save(f.uuid, f, token)
            }
            return a1
        },
        delete_all: async (token?:string):Promise<Array<T>> => {
            const root = loader.join(loader.root, folder)
            // Memory action
            const c = await mem.delete_all(token)
            // Get the removed uuids and delete from disk
            const kill_all = c.map(x => {
                return loader.rm(loader.join(root, x + ext))
            })
            await Promise.all(kill_all)
            return c
        },
        list_all: async (token?:string):Promise<Array<string>> => {
            const root = await folder_root_helper(loader, folder)
            const files = await loader.read_dir_file(root)
            return files.map(x => x.replace(ext, ''))
        },
        save: async (uuid:string, data:T, token?:string):Promise<boolean> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)
            const r = await mem.save(uuid, data, token)
            if(!r) return false

            const file = loader.join(root, uuid + ext)
            await loader.write_string(file, JSON.stringify(data, null, 2))
            return true
        },
        load: async (uuid:string, token?:string):Promise<T> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)
            
            const file = loader.join(root, uuid + ext)
            const str = await loader.read_string(file, { encoding: 'utf8', flag: 'r' })
            const r = mem.save(uuid, str)
            if(!r) throw new Error(`load memory failed: ${type} ${uuid}`)
            return str
        },
        delete: async (uuid:string, token?:string):Promise<boolean> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)

            const r = await mem.delete(uuid, token)
            if(!r) {
                console.error(`Delete memory failed: ${type} ${uuid}`)
                return false
            }

            const file = loader.join(root, uuid + ext)
            if(loader.exists(file)){
                await loader.rm(file)
            }
            return true
        }
    }
}

/**
 * **Create the interface for record files storage**\
 * Generate a loader interface for register to server event
 * @param loader loader IO loader interface
 * @param user should include user
 * @returns Interface for server calling
 */
export const CreateRecordFileLoader = (loader:IOBase, memory:MemoryData):RecordLoader => {
    return {
        project: _CreateRecordIOLoader(loader, memory, RecordType.PROJECT, "project"),
        task: _CreateRecordIOLoader(loader, memory, RecordType.TASK, "task"),
        job: _CreateRecordIOLoader(loader, memory, RecordType.JOB, "job"),
        database: _CreateRecordIOLoader(loader, memory, RecordType.DATABASE, "database"),
        node: _CreateRecordIOLoader(loader, memory, RecordType.NODE, "node"),
        log: _CreateRecordIOLoader(loader, memory, RecordType.LOG, "log"),
        lib: _CreateRecordIOLoader(loader, memory, RecordType.LIB, "lib"),
        user: _CreateRecordIOLoader(loader, memory, RecordType.USER, "user"),
    }
}