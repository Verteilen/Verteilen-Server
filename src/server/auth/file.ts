import jwt from 'jsonwebtoken'
import { Login, CodeError, JWT } from "verteilen-core"
import { IOBase } from "../io"
import { AuthIOLoader, AuthLoader } from "./base"
import { v4 as uuidv4 } from 'uuid'
import { EXPIRE, SERECT } from '../../interface/config'

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
const _CreateRecordIOLoader = (loader:IOBase, folder:string, ext:string = ".json"):AuthIOLoader => {
    return {
        init: async ():Promise<boolean> => {
            await folder_root_helper(loader, folder)
            return true
        },
        create: async (username: string, password: string):Promise<string> => {
            const root = await folder_root_helper(loader, folder)
            const allusers = await loader.read_dir_file(root)
            const get_data:Promise<string>[] = []
            for(let u of allusers){
                get_data.push(new Promise<string>(async (resolve) => {
                    const str = await loader.read_string(loader.join(root, u))
                    const a_data:Login = JSON.parse(str)
                    resolve(a_data.username)
                }))
            }
            const get_all_usernames = await Promise.all(get_data)
            if(get_all_usernames.includes(username)){
                throw new CodeError("Username already exists", 1)
            }

            let d:Login | undefined
            let uuid: string = ""
            let file:string | undefined
            let unique:boolean = true

            while(unique){
                uuid = uuidv4()
                d = {
                    uuid: uuid,
                    username: username,
                    password: password
                }
                file = loader.join(root, d.uuid + ext)
                unique = loader.exists(file)
            }
            loader.write_string(file!, JSON.stringify(d!, null, 4))
            return uuid
        },
        delete: async (uuid:string): Promise<void> => {
            const root = await folder_root_helper(loader, folder)

            const file = loader.join(root, uuid + ext)
            if(!loader.exists(file)) {
                throw new CodeError("user does not exist: " + uuid, 1)
            }
            return loader.rm(file)
        },
        pwd_change: async (username: string, password: string): Promise<string> => {
            const root = await folder_root_helper(loader, folder)
            const files = await loader.read_dir_file(root)
            for(let file of files){
                const filepath = loader.join(root, file)
                const str = await loader.read_string(filepath)
                const data:Login = JSON.parse(str)
                if(data.username == username){
                    data.password = password;
                    await loader.write_string(filepath, JSON.stringify(data, null, 4))
                    return data.uuid
                }
            }
            throw new CodeError("Cannot find username: " + username, 1)
        },
        login: async (username: string, password: string): Promise<string> => {
            const root = await folder_root_helper(loader, folder)
            const files = await loader.read_dir_file(root)
            for(let file of files){
                const filepath = loader.join(root, file)
                const str = await loader.read_string(filepath)
                const data:Login = JSON.parse(str)
                if(data.username == username){
                    if(data.password == password){
                        const payload:JWT = { 
                            user: data.uuid,
                            create: Date.now(),
                            expire: Date.now() + EXPIRE
                        }
                        const token = jwt.sign(JSON.stringify(payload), SERECT, { algorithm: 'RS256'})
                        return token;
                    }else{
                        throw new CodeError("Password wrong", 1)
                    }
                }
            }
            throw new CodeError("Cannot find username", 2)
        },
        verify: async (token: string): Promise<string> => {
            const root = await folder_root_helper(loader, folder)
            const payload:JWT = JSON.parse(jwt.verify(token, SERECT, { algorithms: ['RS256'] }).toString())
            if(Date.now() < payload.expire){ // Pass
                const files = await loader.read_dir_file(root)
                for(let file of files){
                    const filepath = loader.join(root, file)
                    const str = await loader.read_string(filepath)
                    const data:Login = JSON.parse(str)
                    if(data.uuid == payload.user){
                        payload.create = Date.now()
                        payload.expire = Date.now() + EXPIRE
                        const a = jwt.sign(JSON.stringify(payload), SERECT, { algorithm: 'RS256'})
                        return a
                    }
                }
                throw new CodeError("Cannot find user by UUID from JWT", 2)
            }else{
                // Expire
                throw new CodeError("Token expire", 1)
            }
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
export const CreateAuthRecordIOLoader = (loader:IOBase):AuthLoader => {
    return {
        auth: _CreateRecordIOLoader(loader, "auth"),
    }
}