/**
 * **Server Use Interface**\
 * FOr backend server action
 */
export interface RecordIOLoader {
    fetch_all: () => Promise<Array<string>>
    load_all: (token?:string) => Promise<Array<string>>
    delete_all: (token?:string) => Promise<Array<string>>
    list_all: (token?:string) => Promise<Array<string>>
    save: (uuid:string, data:string, token?:string) => Promise<boolean>
    load: (uuid:string, token?:string) => Promise<string>
    delete: (uuid:string, token?:string) => Promise<boolean>
}
/**
 * **IO Function Interface**\
 * Use for access the file store function
 */
export interface RecordIOBase {
    root: string
    join: (...paths:Array<string>) => string
    read_dir: (path:string) => Promise<Array<string>>
    read_dir_dir: (path:string) => Promise<Array<string>>
    read_dir_file: (path:string) => Promise<Array<string>>
    read_string: (path:string, options?:any) => Promise<string>
    write_string: (path:string, content:string) => Promise<void>
    exists: (path:string) => boolean
    mkdir: (path:string) => Promise<void>
    rm: (path:string) => Promise<void>
    cp: (path:string, newpath:string) => Promise<void>
}
/**
 * **IO Loader Worker**\
 * Fetch data from storage space, could be disk or mongoDB
 */
export interface RecordLoader {
    project: RecordIOLoader
    task: RecordIOLoader
    job: RecordIOLoader
    database: RecordIOLoader
    node: RecordIOLoader
    log: RecordIOLoader
    lib: RecordIOLoader
    user: RecordIOLoader
}