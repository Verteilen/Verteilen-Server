import { MongoClient } from "mongodb"
import { 
    RecordType, 
    Shareable,
    ACLType,
    JWT,
    DataHeader,
    MONGODB_NAME,
    RecordTypePureText,
    MemoryData,
} from "verteilen-core"
import jwt from 'jsonwebtoken'
import { RecordIOBase, RecordIOLoader, RecordLoader } from "./base"
import { SERECT } from "../../interface/config"

/**
 * Check if user have permission to access the container
 * @param x Target Container
 * @param uuid User UUID
 * @returns Access right
 */
const permissionHelper = (x:Shareable & DataHeader, uuid:string):boolean => {
    const ispublic = x.owner == undefined || x.acl == ACLType.PUBLIC
    if(ispublic) return true
    const isowner = x.owner == uuid
    if(isowner) return true
    const canbeshared = x.acl != ACLType.PRIVATE
    if(!canbeshared) return false
    if(!x.shared) return false
    const target = x.shared.find(x => x.user == uuid)
    if(target == undefined) return false
    return true
}
/**
 * Filter out the public container out
 * @param v The list of container
 * @returns Result of filter
 */
const permissionGetPublic = (v:Array<Shareable & DataHeader>):Array<Shareable & DataHeader> => {
    return v.filter(x => x.owner == undefined || x.acl == ACLType.PUBLIC)
}
/**
 * Record transfer to Project folder process
 * @param loader 
 * @param type 
 * @param folder 
 * @returns 
 */
const obsoleteSupport = async (loader:RecordIOBase, type:RecordType, folder:string) => {
    if(type == RecordType.PROJECT){
        const path = loader.join(loader.root, "record")
        if(!loader.exists(path)) return
        const p = await loader.read_dir_file(path)
        const ps = p.filter(x => x.endsWith(".json")).map(x => {
            const path_r = loader.join(path, x)
            return loader.read_string(path_r)
        })
        const allRecordText:Array<string> = await Promise.all(ps)
        const allRecord:Array<any> = allRecordText.map(x => JSON.parse(x))

        const execute_project:Array<Promise<any>> = []
        const execute_task:Array<Promise<any>> = []
        const execute_job:Array<Promise<any>> = []
        for(let x of allRecord){
            const tasks:Array<any> = x.task
            x.tasks = []
            x.database_uuid = x.parameter_uuid
            x.tasks_uuid = tasks.map(y => y.uuid)
            delete x.parameter_uuid
            delete x.task

            for(let y of tasks){
                const jobs = y.jobs
                y.jobs = []
                y.jobs_uuid = jobs.map(z => z.uuid)

                for(let z of jobs){
                    z.id_args = []
                    const d3 = loader.join(loader.root, "job", `${z.uuid}.json`)
                    execute_job.push(loader.write_string(d3, JSON.stringify(z, null, 4)))
                }
                const d2 = loader.join(loader.root, "task", `${y.uuid}.json`)
                execute_task.push(loader.write_string(d2, JSON.stringify(y, null, 4)))
            }
            const d1 = loader.join(loader.root, "project", `${x.uuid}.json`)
            execute_project.push(loader.write_string(d1, JSON.stringify(x, null, 4)))
        }
        await Promise.all(execute_project)
        await Promise.all(execute_task)
        await Promise.all(execute_job)
        await loader.rm(path)
    }
    else if(type == RecordType.DATABASE){
        const path = loader.join(loader.root, "parameter")
        if(!loader.exists(path)) return
        const p = await loader.read_dir_file(path)
        const ps = p.filter(x => x.endsWith(".json")).map(x => {
            const path2 = loader.join(path, x)
            const path3 = loader.join(loader.root, folder, x)
            return loader.cp(path2, path3)
        })
        await Promise.all(ps)
        loader.rm(path)
    }
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
        load_all: async (token?:string):Promise<Array<string>> => {
            return new Promise<Array<string>>((resolve, reject) => {
                const arr = get_array(type)
                const pub = permissionGetPublic(arr).map(x => JSON.stringify(x))
                const default_behaviour = (v:Array<string>) => resolve(v)
                if(token == undefined){
                    if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} load_all command, successfully`)
                    default_behaviour(pub)
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} load_all command, token vaildation failed`)
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} load_all command, token decode null failed`)
                        default_behaviour(pub)
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    return arr.filter(x => permissionHelper(x, payload.user))
                        .map(x => JSON.stringify(x))
                })
            })
        },
        delete_all: async (token?:string):Promise<Array<string>> => {
            return new Promise<Array<string>>((resolve, reject) => {
                const arr = get_array(type)
                const pub = permissionGetPublic(arr)
                const default_behaviour = (kill:Array<Shareable & DataHeader>) => {
                    const r = kill.map(x => x.uuid)
                    kill.forEach(x => {
                        const index = arr.findIndex(y => y.uuid == x.uuid)
                        arr.slice(index, 1)
                    })
                    resolve(r)
                }
                if(token == undefined){
                    default_behaviour(pub)
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        default_behaviour(pub)
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    const targets = arr.filter(x => permissionHelper(x, payload.user))
                    default_behaviour(targets)
                })
            })
        },
        list_all: async (token?:string):Promise<Array<string>> => {
            return new Promise<Array<string>>((resolve, reject) => {
                const arr = get_array(type)
                const pub = permissionGetPublic(arr)
                const default_behaviour = () => {
                    resolve(pub.map(x => x.uuid))
                }

                if(token == undefined){
                    default_behaviour()
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        default_behaviour()
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    const targets = arr.filter(x => permissionHelper(x, payload.user))
                    resolve(targets.map(x => x.uuid))
                })
            })
        },
        save: async (uuid:string, data:string, token?:string):Promise<boolean> => {
            return new Promise<boolean>((resolve, reject) => {
                const buffer:Shareable & DataHeader = JSON.parse(data)
                const arr = get_array(type)
                const index = arr.findIndex(x => x.uuid == uuid)
                const exist = index == -1 ? undefined : arr[index]
                const ispublic = exist?.owner == undefined || exist?.acl == ACLType.PUBLIC
                if(ispublic){
                    if(!exist){
                        arr.push(buffer)
                        if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} save command, push successfully: ${uuid}`)
                    }else{
                        arr[index] = buffer
                        if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} save command, replace successfully: ${uuid}`)
                    }
                    resolve(true)
                    return
                }

                if(token == undefined){
                    if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} save command, token vaildation failed: ${uuid}`)
                    reject("Require Token")
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} save command, token serect vaildation failed: ${uuid}`)
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} save command, token decode null failed: ${uuid}`)
                        reject("Require Token")
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    if(permissionHelper(exist, payload.user)){
                        if(!exist){
                            arr.push(buffer)
                            if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} save command, payload decode push successfully: ${uuid}`)
                        }else{
                            arr[index] = buffer
                            if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} save command, payload decode replace successfully: ${uuid}`)
                        }
                        resolve(true)
                    }else{
                        if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} save command, user permission denied failed: ${uuid}`)
                        reject("Permission Denied")
                    }
                })
            })
        },
        load: async (uuid:string, token?:string):Promise<string> => {
            return new Promise<string>((resolve, reject) => {
                const arr = get_array(type)
                const index = arr.findIndex(x => uuid == x.uuid)
                const exist = index == -1 ? undefined : arr[index]
                if(exist == undefined){
                    reject("Item do not exists")
                    return
                }
                const ispublic = exist.owner == undefined || exist.acl == ACLType.PUBLIC
                if(ispublic){
                    resolve(JSON.stringify(exist))
                    return
                }

                if(token == undefined){
                    reject("Require Token")
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        reject("Require Token")
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    if(permissionHelper(exist, payload.user)){
                        resolve(JSON.stringify(exist))
                    }else{
                        reject("Permission Denied")
                    }
                })
            })
        },
        delete: async (uuid:string, token?:string):Promise<boolean> => {
            return new Promise<boolean>((resolve, reject) => {
                const arr = get_array(type)
                const index = arr.findIndex(x => uuid == x.uuid)
                const exist = index == -1 ? undefined : arr[index]
                const default_behaviour = () => {
                    arr.splice(index, 1)
                    resolve(true)
                }

                if(exist == undefined){
                    if(process.env.NODE_ENV == 'development') console.trace(`[IO2] Memory ${RecordTypePureText[type]} delete command, not exists failed: ${uuid}`)
                    resolve(false)
                    return
                }

                const ispublic = exist.owner == undefined || exist.acl == ACLType.PUBLIC
                if(ispublic){
                    if(process.env.NODE_ENV == 'development') console.log(`[IO2] Memory ${RecordTypePureText[type]} delete command, delete successfully: ${uuid}`)
                    default_behaviour()
                    return
                }

                if(token == undefined){
                    if(process.env.NODE_ENV == 'development') console.warn(`[IO2] Memory ${RecordTypePureText[type]} delete command, token vaildation failed: ${uuid}`)
                    reject("Require Token")
                    return
                }

                jwt.verify(token, SERECT, { complete: true }, (err, decode) => {
                    if(err){
                        reject(err.name)
                        return
                    }
                    if(decode == undefined){
                        reject("Require Token")
                        return
                    }
                    const payload:JWT = JSON.parse(decode.payload as string)
                    if(permissionHelper(exist, payload.user)){
                        default_behaviour()
                    }else{
                        reject("Permission Denied")
                    }
                })
            })
        }
    }
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
const _CreateRecordIOLoader = (loader:RecordIOBase, memory:MemoryData, type:RecordType, folder:string, ext:string = ".json"):RecordIOLoader => {
    const mem = _CreateRecordMemoryLoader(memory, type)
    return {
        fetch_all: async ():Promise<Array<string>> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root)

            await obsoleteSupport(loader, type, folder)
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
 * **Create the interface for record mongoDB storage**\
 * @param loader MongoDB loader client
 * @param memory Memory loader interface
 * @param type Type of storage
 * @param db Database name
 * @param collection Collection from database
 * @returns Interface for calling
 */
const _CreateRecordMongoLoader = (loader:MongoClient, memory:MemoryData, type:RecordType, db:string, collection:string):RecordIOLoader => {
    const mem = _CreateRecordMemoryLoader(memory, type)
    return {
        fetch_all: async (): Promise<Array<string>> => {
            const database = loader.db(db) 
            const col = database.collection(collection)
            const data = await col.find({}).toArray()
            const exec = data.map(x => {
                return mem.save(x.uuid, JSON.stringify(x))
            })
            await Promise.all(exec)
            return mem.fetch_all()
        },
        load_all: async (token?: string): Promise<Array<string>> => {
            return mem.load_all(token)
        },
        delete_all: async (token?: string): Promise<Array<string>> => {
            // Memory action
            const c = await mem.delete_all(token)
            const database = loader.db(db) 
            const col = database.collection(collection)
            // Get the removed uuids and delete from disk
            const exec = c.map(x => {
                return col.deleteOne({ uuid: x })
            })
            await Promise.all(exec)
            return c
        },
        list_all: async (token?: string): Promise<Array<string>> => {
            return mem.list_all(token)
        },
        save: async (uuid: string, data: string, token?: string): Promise<boolean> => {
            const r = await mem.save(uuid, data, token)
            if(!r) return false

            const database = loader.db(db) 
            const col = database.collection(collection)
            col.findOneAndUpdate({ uuid: uuid }, JSON.parse(data))
            return true
        },
        load: async (uuid: string, token?: string): Promise<string> => {
            return mem.load(uuid, token)
        },
        delete: async (uuid: string, token?: string): Promise<boolean> => {
            const r = await mem.delete(uuid, token)
            if(!r) return false

            const database = loader.db(db) 
            const col = database.collection(collection)
            await col.deleteOne({ uuid: uuid })
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
export const CreateRecordMemoryLoader = (loader:MemoryData):RecordLoader => {
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
/**
 * **Create the interface for record files storage**\
 * Generate a loader interface for register to server event
 * @param loader loader IO loader interface
 * @param user should include user
 * @returns Interface for server calling
 */
export const CreateRecordIOLoader = (loader:RecordIOBase, memory:MemoryData):RecordLoader => {
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
/**
 * **Create the interface for record mongoDB storage**\
 * @param url MongoDB URL
 * @param memory loader memory loader interface
 * @returns 
 */
export const CreateRecordMongoLoader = (url:string, memory:MemoryData):RecordLoader => {
    const loader:MongoClient = new MongoClient(url)
    return {
        project: _CreateRecordMongoLoader(loader, memory, RecordType.PROJECT, MONGODB_NAME, "project"),
        task: _CreateRecordMongoLoader(loader, memory, RecordType.TASK, MONGODB_NAME, "task"),
        job: _CreateRecordMongoLoader(loader, memory, RecordType.JOB, MONGODB_NAME, "job"),
        database: _CreateRecordMongoLoader(loader, memory, RecordType.DATABASE, MONGODB_NAME, "database"),
        node: _CreateRecordMongoLoader(loader, memory, RecordType.NODE, MONGODB_NAME, "node"),
        log: _CreateRecordMongoLoader(loader, memory, RecordType.LOG, MONGODB_NAME, "log"),
        lib: _CreateRecordMongoLoader(loader, memory, RecordType.LIB, MONGODB_NAME, "lib"),
        user: _CreateRecordMongoLoader(loader, memory, RecordType.USER, MONGODB_NAME, "user"),
    }
}