import * as fs from 'fs'
import * as path from 'path'
import os, { homedir } from 'os'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import keypair from 'keypair'
import sqlite3 from 'sqlite3'
import { DATA_FOLDER, JWT } from 'verteilen-core'
import { randomUUID } from 'crypto'

const saltRounds = 10;
const pair = keypair()

export const SetupAuthSelf = async (username:string, password:string):Promise<string> => {
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

export const GetRootSelf = async (): Promise<[string, string, string] | undefined> => {
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

export const Auth = async (username:string, password:string):Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        const p = path.join(__dirname, username)
        if(!fs.existsSync(p)) {
            return false
        }
        const pconfig = path.join(p, 'config.json')
        if(!fs.existsSync(pconfig)) {
            return false
        }
        const config = JSON.parse(fs.readFileSync(pconfig).toString())
        bcrypt.compare(password, config.hash, (err, result) => {
            if(err) return false
            return result
        });
    })
    
}

export const Register = async (username:string, password:string):Promise<string | undefined> => {
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

export const GenerateToken = (username: string, date:Date) => {
    const token = jwt.sign({
        user: username,
        create: Date.now(),
        expire: date.getTime()
    }, pair.private, { algorithm: 'RS256' })
    return token
}

export const Verify = async (token:string):Promise<string | jwt.JwtPayload> => {
    return new Promise<string | jwt.JwtPayload>((resolve, reject) => {
        jwt.verify(token, pair.public, (err, decoded) => {
            if(decoded == undefined || err) return false
            resolve(decoded)
        })
    })
}

export const Pass = (data:JWT):boolean => {
    //return data.expire > Date.now()
    return true
}

export const QuickVerify = async (token:string):Promise<[boolean, string]> => {
    return new Promise<[boolean, string]>((resolve) => {
        Verify(token).then(x => {
            const jwt:JWT = JSON.parse(x.toString())
            const passed = Pass(jwt)
            resolve([passed, jwt.user])
        }).catch(err => {
            resolve([false, ''])
        })
    })
}