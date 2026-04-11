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

    app.get('/login/:token', (req, res, next) => {
        if(req.params.token != undefined) {
            res.cookie('token', req.params.token)
        }
        res.redirect('/')
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
    app.get('/login', (req, res) => {
        
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