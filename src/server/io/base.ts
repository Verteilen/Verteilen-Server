/**
 * **IO Function Interface**\
 * Use for access the file store function
 */
export interface IOBase {
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