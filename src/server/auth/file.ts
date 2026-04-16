import { MemoryData, RecordType, Login, CodeError } from "verteilen-core"
import { RecordIOBase } from "../io"
import { AuthIOLoader, AuthLoader } from "./base"
import { v4 as uuidv4 } from 'uuid'

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
const _CreateRecordIOLoader = (loader:RecordIOBase, folder:string, ext:string = ".json"):AuthIOLoader => {
    return {
        init: async ():Promise<boolean> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root);
            return true
        },
        create: async (username: string, password: string):Promise<string> => {
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root);

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
            const root = loader.join(loader.root, folder)
            if(!loader.exists(root)) await loader.mkdir(root);

            const file = loader.join(root, uuid + ext)
            if(!loader.exists(file)) {
                throw new CodeError("user does not exist: " + uuid, 1)
            }
            return loader.rm(file)
        },
        pwd_change: async (username: string, password: string): Promise<string> => {
            
        },
        login: async (username: string, password: string): Promise<string> => {
            
        },
        verify: async (token: string): Promise<string> => {

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
export const CreateAuthRecordIOLoader = (loader:RecordIOBase):AuthLoader => {
    return {
        auth: _CreateRecordIOLoader(loader, "auth"),
    }
}