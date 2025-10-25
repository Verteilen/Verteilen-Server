import * as fs from 'fs'
import os, { homedir } from 'os'
import express from 'express'
import path from 'path'
import multer from 'multer'
import bodyPreser from 'body-parser'
import cookieParser from 'cookie-parser'
import { DATA_FOLDER } from 'verteilen-core'
import { backendEvent } from './event'

export const EventInit = (app: express.Express, middle?:any) => {
    const storage = multer.memoryStorage()
    const upload = multer({ dest: 'public/upload', storage: storage })
    app.use(cookieParser())
    app.use(bodyPreser.json())
    app.use(bodyPreser.urlencoded())
    app.use(bodyPreser.urlencoded({ extended: true }))
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
    const apiRoute = app.route('/api')

    app.use(middle ? middle : express.static(path.join(__dirname, 'public')))
}