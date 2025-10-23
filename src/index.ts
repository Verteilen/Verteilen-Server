import * as ws from 'ws'
import * as fs from 'fs'
import * as pem from 'pem'
import * as os from 'os'
import * as path from 'path'
import * as https from 'https'
import Chalk from 'chalk'
import express from 'express'
import { backendEvent } from './event'
import { 
    DATA_FOLDER, 
    Header, 
    WebPORT 
} from 'verteilen-core'
import { EventInit } from './event_http'
import { checker } from './worker_download'

let wsServer: ws.Server | undefined = undefined
let app:express.Express | undefined = undefined
let httpss:https.Server<any> | undefined = undefined
let wss:https.Server<any> | undefined = undefined

const webport = backendEvent.PortAvailable(WebPORT)

const get_pem = (express:boolean):Promise<[string, string]> => {
    return new Promise<[string, string]>((resolve) => {
        const pemFolder = path.join(os.homedir(), DATA_FOLDER, 'pem')
        if(!fs.existsSync(pemFolder)) fs.mkdirSync(pemFolder, { recursive: true })
        const clientKey = path.join(pemFolder, express ? "express_clientkey.pem" : "console_clientkey.pem")
        const certificate = path.join(pemFolder, express ? "express_certificate.pem" : "console_certificate.pem")
        if(!fs.existsSync(clientKey) || !fs.existsSync(certificate)){
            pem.createCertificate({selfSigned: true}, (err, keys) => {
                fs.writeFileSync(clientKey, keys.clientKey, { encoding: 'utf8' })
                fs.writeFileSync(certificate, keys.certificate, { encoding: 'utf8' })
                resolve([keys.clientKey, keys.certificate])
            })
        }else{
            resolve([fs.readFileSync(clientKey, 'utf8').toString(), fs.readFileSync(certificate, 'utf8').toString()])
        }
    })
}

export const main = async (middle?:any):Promise<[express.Express | undefined, ws.Server | undefined]> => {
    await checker()
    return new Promise<[express.Express | undefined, ws.Server | undefined]>(async (resolve) => {
        const p = await webport
        {
            
            const pems = await get_pem(true)
            app = express()
            httpss = https.createServer({ key: pems[0], cert: pems[1], minVersion: 'TLSv1.2', maxVersion: 'TLSv1.3' }, app)
            EventInit(app, middle)
            httpss.listen(p, () => {
                console.log(Chalk.greenBright(`https server run at ${p}`))
            })
            backendEvent.Root(p)
        }
        {
            //wsServer = new ws.Server({port: p})
            wsServer = new ws.Server({server: httpss})
            console.log(Chalk.greenBright(`websocket server run at ${p}`))
            wsServer.on('connection', (ws) => {
                //const p = new eventInit(ws)
                ws.on('message', (data) => {
                    const d:Header = JSON.parse(data.toString())
                    backendEvent.ConsoleAnalysis(ws, d)
                })
                ws.on('open', () => {
                    backendEvent.NewConsoleConsole(ws)
                })
                ws.on('close', () => {
                    backendEvent.DropConsoleConsole(ws)
                })
            })
        }
        resolve([app, wsServer])
    })
}

if (require.main === module) {
    main();
}