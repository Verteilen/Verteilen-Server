import * as fs from "fs"
import * as path from "path"
import { Database } from 'verteilen-core'


export const ImportProject = () => {
    
}

export const ImportDatabase = (data:string):boolean => {
    const p:Database = JSON.parse(data)
    const pa = path.join(__dirname, 'data', 'database')
    if(!fs.existsSync(pa)) fs.mkdirSync(pa);
    fs.writeFileSync(path.join(pa, p.uuid), JSON.stringify(p, null, 2))
    return true
}