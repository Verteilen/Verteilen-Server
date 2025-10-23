import * as fs from "fs"
import * as path from "path"
import { Parameter } from 'verteilen-core'


export const ImportProject = () => {
    
}

export const ImportParameter = (data:string):boolean => {
    const p:Parameter = JSON.parse(data)
    const pa = path.join(__dirname, 'data', 'parameter')
    if(!fs.existsSync(pa)) fs.mkdirSync(pa);
    fs.writeFileSync(path.join(pa, p.uuid), JSON.stringify(p, null, 2))
    return true
}