import express from 'express'
import path from 'path'
import bodyPreser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { Register_API } from './http/api'

export const EventInit = (app: express.Express, middle?:any) => {
    app.use(cookieParser())
    app.use(bodyPreser.json())
    app.use(bodyPreser.urlencoded())
    app.use(bodyPreser.urlencoded({ extended: true }))
    app.use(cors());
    console.log("current dir: ", process.cwd())

    const apiRoute = app.all('/api')
    Register_API(apiRoute);

    app.use(middle ? middle : express.static(path.join(__dirname, 'public')))
}