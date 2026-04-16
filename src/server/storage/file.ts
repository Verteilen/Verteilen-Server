import { 
    RecordType, 
    MemoryData,
} from "verteilen-core"
import { RecordIOLoader, RecordLoader } from "./base"
import { IOBase } from "../io/base"
import { _CreateRecordMemoryLoader } from "./memory"

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
const _CreateRecordIOLoader = (loader:IOBase, memory:MemoryData, type:RecordType, folder:string, ext:string = ".json"):RecordIOLoader => {
    const mem = _CreateRecordMemoryLoader(memory, type)
    return {
        fetch_all: async ():Promise<Array<string>> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)

            const files = await loader.read_dir_file(root)
            const r:Array<Promise<string>> = files.map(x => 
                loader.read_string(loader.join(root, x), { encoding: 'utf8', flag: 'r' })
            )
            const p = await Promise.all(r)
            const saver = p.map(x => {
                const data = JSON.parse(x)
                return mem.save(data.uuid, x)
            })
            await Promise.all(saver)
            return mem.fetch_all()
        },
        load_all: async (token?:string):Promise<Array<string>> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)
            return mem.load_all(token)
        },
        delete_all: async (token?:string):Promise<Array<string>> => {
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
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)
            return mem.list_all(token)
        },
        save: async (uuid:string, data:string, token?:string):Promise<boolean> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)
            const r = await mem.save(uuid, data, token)
            if(!r) return false

            const file = loader.join(root, uuid + ext)
            await loader.write_string(file, data)
            return true
        },
        load: async (uuid:string, token?:string):Promise<string> => {
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