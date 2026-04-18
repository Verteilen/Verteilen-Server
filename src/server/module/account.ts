// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? This script handle the account port of the server module
//  ? Such as login process
//
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import keypair from 'keypair'
import sqlite3 from 'sqlite3'
import { randomUUID } from 'crypto'
import { RecordLoader } from '../storage/base'
import { MemoryData, JWT, UserProfile, DATA_FOLDER } from 'verteilen-core'
import { EXPIRE, SERECT } from '../../interface/config'

const saltRounds = 10;
const pair = keypair()

export class Account_Module {
    loader:RecordLoader
    memory:MemoryData

    constructor(loader:RecordLoader, memory:MemoryData){
        this.loader = loader
        this.memory = memory
    }

    setup_auth_self = async (username:string, password:string):Promise<string> => {
        const db_file = path.join(os.homedir(), DATA_FOLDER, 'auth.db')
        if(fs.existsSync(db_file)) fs.rmSync(db_file);
        const db = new sqlite3.Database(db_file)
        const uuid = randomUUID().toString()
        db.serialize(() => {
            db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        op INTEGER
    )
            `, (err) => {
                if (err) {
                    console.error('Error creating table:', err.message);
                } else {
                    console.log('Table "users" created successfully with unique username.');
                }
            })
            .run(`
    INSERT INTO users (id, username, password, op) VALUES (?, ?, ?, 0)
            `, [uuid, username, password])
        })
        db.close();
        return uuid
    }

    get_root_self = async (): Promise<[string, string, string] | undefined> => {
        const db_file = path.join(os.homedir(), DATA_FOLDER, 'auth.db')
        if(!fs.existsSync(db_file)) return undefined
        const db = new sqlite3.Database(db_file)
        return new Promise<[string, string, string] | undefined>((resolve, reject) => {
            db.serialize(() => {
                db.get("SELECT id, username, password FROM users WHERE op = ?", [0], (err, row:any) => {
                    if(err) reject(err)
                    if(!row) return resolve(undefined)
                    resolve([row.id, row.username, row.password])
                })
            })
            db.close()
        })
    }
    
    verify = async (old:string):Promise<string> => {
        const data = await this.loader.user.load_all()
        const users:Array<UserProfile> = data.map(x => x)
        const payload:JWT = JSON.parse(jwt.verify(old, SERECT, { algorithms: ['RS256'] }).toString())
        const current = Date.now()
        if(current < payload.expire){ // Pass
            const target = users.find(x => x.uuid == payload.user)
            if(target != undefined){
                const payload:JWT = { 
                    user: target.uuid,
                    create: Date.now(),
                    expire: Date.now() + (7 * 24 * 60 * 60 * 1000)
                }
                const token = jwt.sign(JSON.stringify(payload), SERECT, { algorithm: 'RS256'})
                return token
            }else{
                throw new Error("login.failed")
            }
        }else{
            // Expire
            throw new Error("login.failed")
        }
    }

    register = async (username:string, password:string):Promise<string | undefined> => {
        return new Promise<string | undefined>((resolve, reject) => {
            bcrypt.genSalt(saltRounds, (err, salt) => {
                if(err) {
                    resolve(undefined)
                    return
                }
                bcrypt.hash(password, salt, (err, hash) => {
                    if(err) {
                        resolve(undefined)
                        return
                    }
                    const p = path.join(__dirname, username)
                    if(!fs.existsSync(p)) {
                        fs.mkdirSync(p)
                    }
                    const pconfig = path.join(p, 'config.json')
                    if(!fs.existsSync(pconfig)) {
                        fs.writeFileSync(pconfig, JSON.stringify({
                            hash: hash
                        }, null, 4))
                    }
                });
            });
        })
    }

    /**
     * If login failed, it will throw error
     * @param username Login Username Field
     * @param password Login Password Field
     * @returns Token string
     */
    login = async (username:string, password:string):Promise<string> => {
        const data = await this.loader.user.load_all()
        const users:Array<UserProfile> = data.map(x => x)
        const target = users.find(x => x.name == username && x.password == password)
        if(target != undefined){
            const payload:JWT = { 
                user: target.uuid,
                create: Date.now(),
                expire: Date.now() + EXPIRE
            }
            const token = jwt.sign(JSON.stringify(payload), SERECT, { algorithm: 'RS256'})
            return token
        }
        throw new Error("login.failed")
    }
}