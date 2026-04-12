import * as fs from 'fs'
import path from 'path'
import os, { homedir } from 'os'
import express from 'express'
import { BackendType, DATA_FOLDER, ServerSetting } from 'verteilen-core'
import { backendEvent } from './../event'
import multer from 'multer'

export const Register_API = (app: express.Router) => {
    const storage = multer.memoryStorage()
    const upload = multer({ dest: 'public/upload', storage: storage })

    app.get('/login/:token', async (req, res) => {
        if(backendEvent.account_module == undefined){
            res.statusCode = 500
            res.send("Account module is not setup")
        }else{
            backendEvent.account_module.verify(req.params.token).then(t => {
                res.send(t)
            }).catch((err:Error) => {
                res.statusCode = 401
                res.send(err)
            })
        }
    })
    app.post('/login', async (req, res) => {
        if(backendEvent.account_module == undefined){
            res.statusCode = 500
            res.send("Account module is not setup")
        }else{
            const username = req.body.username
            const password = req.body.password
            backendEvent.account_module.login(username, password).then(t => {
                res.send(t)
            }).catch((err:Error) => {
                res.statusCode = 401
                res.send(err)
            })
        }
    })
    
    // The simple web response to let frontend know that backend exists
    app.post('/user', (req, res) => {
        const token = req.cookies.token
        if(token == undefined){
            res.sendStatus(403)
            return
        }
        backendEvent.ChangeProfile(token, req.body)
        res.sendStatus(200)
    })
    app.get('/user', (req, res) => {
        const token = req.cookies.token
        res.send(backendEvent.GetUserType(token))
    })
    app.get('/pic', (req, res) => {
        const token = req.cookies.token
        if(token == undefined){
            res.sendStatus(403)
            return
        }
        
        const p = path.join(homedir(), DATA_FOLDER, 'user', token, token + '.pic')
        if(fs.existsSync(p)) {
            res.sendFile(p)
        }else{
            res.sendStatus(404)
        }
    })
    app.post('/pic', upload.single('pic'), (req, res) => {
        const token = req.cookies.token
        if(token == undefined){
            res.sendStatus(403)
            return
        }
        if(req.file == undefined){
            res.sendStatus(204)
        }else{
            const p = path.join(os.homedir(), DATA_FOLDER, 'user', token)
            if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive: true})
            const n = path.join(p, token + '.pic')
            fs.writeFileSync(n, req.file.buffer)
            res.sendStatus(200)
        }
    })
    app.get('/test', (req, res) => {
        const target = path.join(os.homedir(), DATA_FOLDER, 'server.json')
        const p = fs.existsSync(target)
        let a:ServerSetting | null = null
        if(p){
            try{
                a = JSON.parse(fs.readFileSync(target).toString())
            }catch(err:any){
                console.error(err)
                res.sendStatus(500)
                return
            }
        }
        if(a != null){
            delete a?.auth.api_key
            delete a?.auth.db_username
            delete a?.auth.db_password
            delete a?.auth.db_url
            delete a?.content.api_key
            delete a?.content.db_username
            delete a?.content.db_password
            delete a?.content.db_url
        }
        res.send({
            type: BackendType.SERVER,
            setup: p,
            setting: a
        })
    })
}