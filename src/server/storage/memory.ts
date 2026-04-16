import { 
    RecordType, 
    Shareable,
    DataHeader,
    MemoryData,
    ACLType,
    JWT,
    RecordTypePureText,
    Job,
    Project,
    Task,
    Database,
    Node,
    Log,
    Library,
    UserProfile,
} from "verteilen-core"
import { RecordIOLoader, RecordLoader } from "./base"
import { SERECT } from "../../interface/config"
import jwt from 'jsonwebtoken'

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

const getArrayFromMemory = (loader:MemoryData, type:RecordType):Array<Shareable & DataHeader> => {
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

/**
 * **Create the interface for record memory storage**\
 * Generate a loader interface for register to server event
 * @param loader Memory loader interface
 * @param type Type of storage
 * @returns Interface for calling
 */
export const _CreateRecordMemoryLoader = <T extends DataHeader & Shareable>(loader:MemoryData, type:RecordType):RecordIOLoader<T> => {
    return {
        init: async ():Promise<boolean> => {
            return true
        },
        load_all: async (token?:string):Promise<Array<T>> => {
            return new Promise<Array<T>>((resolve, reject) => {
                const arr = getArrayFromMemory(loader, type)
                const pub = permissionGetPublic(arr).map(x => x)
                const default_behaviour = (v:Array<DataHeader & Shareable>) => resolve(v as Array<T>)
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
        delete_all: async (token?:string):Promise<Array<T>> => {
            return new Promise<Array<T>>((resolve, reject) => {
                const arr = getArrayFromMemory(loader, type)
                const pub = permissionGetPublic(arr)
                const default_behaviour = (kill:Array<Shareable & DataHeader>) => {
                    const a:Array<T> = []
                    kill.forEach(x => {
                        const index = arr.findIndex(y => y.uuid == x.uuid)
                        const buffer = arr.splice(index, 1)
                        a.push(...buffer as Array<T>)
                    })
                    resolve(a)
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
                const arr = getArrayFromMemory(loader, type)
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
 * **Create the interface for record memory storage**\
 * Generate a loader interface for register to server event
 * @param loader loader memory loader interface
 * @returns Interface for server calling
 */
export const CreateRecordMemoryLoader = (loader:MemoryData):RecordLoader => {
    return {
        project: _CreateRecordMemoryLoader<Project>(loader, RecordType.PROJECT),
        task: _CreateRecordMemoryLoader<Task>(loader, RecordType.TASK),
        job: _CreateRecordMemoryLoader<Job>(loader, RecordType.JOB),
        database: _CreateRecordMemoryLoader<Database>(loader, RecordType.DATABASE),
        node: _CreateRecordMemoryLoader<Node>(loader, RecordType.NODE),
        log: _CreateRecordMemoryLoader<Log>(loader, RecordType.LOG),
        lib: _CreateRecordMemoryLoader<Library>(loader, RecordType.LIB),
        user: _CreateRecordMemoryLoader<UserProfile>(loader, RecordType.USER),
    }
}