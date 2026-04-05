import * as fs from 'fs'
import os, { homedir } from 'os'
import express from 'express'
import path from 'path'
import multer from 'multer'
import bodyPreser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { AuthType, BackendType, CreateRootUser, DATA_FOLDER, ServerSetupRequire, UserProfile } from 'verteilen-core'
import { backendEvent } from './event'
import { SetupAuthSelf } from './auth'
import { messager_log } from './debugger'

export const EventInit = (app: express.Express, port:number, middle?:any) => {
    const storage = multer.memoryStorage()
    const upload = multer({ dest: 'public/upload', storage: storage })
    app.use(cookieParser())
    app.use(bodyPreser.json())
    app.use(bodyPreser.urlencoded())
    app.use(bodyPreser.urlencoded({ extended: true }))
    app.use(cors());
    console.log("current dir: ", process.cwd())
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
    app.get('/test', (req, res) => {
        const p = fs.existsSync(path.join(os.homedir(), DATA_FOLDER, 'server.json'))
        res.send({
            type: BackendType.SERVER,
            setup: p
        })
    })
    app.post("/setup", (req, res) => {
        const file = path.join(os.homedir(), DATA_FOLDER, 'server.json')
        const pa_root = path.join(os.homedir(), DATA_FOLDER)
        const pa = path.join(pa_root, 'user')
        const p = fs.existsSync(file)
        if(p){
            res.sendStatus(503)
            return
        }
        const data:ServerSetupRequire = req.body
        if(data.setting == undefined){
            res.sendStatus(400)
            return
        }
        fs.writeFileSync(file, JSON.stringify(data.setting, null, 4))
        backendEvent.setting = data.setting
        if(data.setting.auth.auth_type == AuthType.SELF){
            if(data.root == undefined){
                res.sendStatus(400)
                return
            }
            SetupAuthSelf(data.root.root_username, data.root.root_password).then(uuid => {
                res.sendStatus(200)
                const root:UserProfile = CreateRootUser()
                root.token = uuid
                root.name = data.root!.root_username
                fs.writeFileSync(path.join(pa, root.token + '.json'), JSON.stringify(root, null, 2))
                messager_log(`Login with root using username: ${data.root!.root_username} `, "Setup")
                messager_log(`Login with root using password: ${data.root!.root_password} `, "Setup")
            })
        }
        else if(data.setting.auth.auth_type == AuthType.EXTERNAL){
            
        }
        else if(data.setting.auth.auth_type == AuthType.SERVICE){
            
        }
        res.sendStatus(200)
    })
    const apiRoute = app.route('/api')

    app.use(middle ? middle : express.static(path.join(__dirname, 'public')))
}