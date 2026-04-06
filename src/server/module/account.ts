// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? This script handle the account port of the server module
//  ? Such as login process
//
import jwt from 'jsonwebtoken'
import { RecordLoader } from '../io'
import { MemoryData, JWT, UserProfile } from 'verteilen-core'

export class Account_Module {
    loader:RecordLoader
    memory:MemoryData

    constructor(loader:RecordLoader, memory:MemoryData){
        this.loader = loader
        this.memory = memory
    }
    
    /**
     * If login failed, it will throw error
     * @param username Login Username Field
     * @param password Login Password Field
     * @returns Token string
     */
    login = async (username:string, password:string):Promise<string> => {
        const data = await this.loader.user.load_all()
        const users:Array<UserProfile> = data.map(x => JSON.parse(x))
        const target = users.find(x => x.name == username && x.password == password)
        if(target != undefined){
            const payload:JWT = { 
                user: target.uuid,
                create: Date.now()
            }
            const token = jwt.sign(JSON.stringify(payload), SERECT, { algorithm: 'RS256', expiresIn: '7d' })
            return token
        }
        throw new Error("login.failed")
    }
}