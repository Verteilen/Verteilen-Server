import { RecordIOLoader, TypeMap } from "verteilen-core";

export const Loader = (typemap:TypeMap, loader:RecordIOLoader, key:string) => {
    typemap[`load_all_${key}`] = (token?:string) => loader.load_all(token)
    typemap[`delete_all_${key}`] = (token?:string) => loader.delete_all(token)
    typemap[`list_all_${key}`] = (token?:string) => loader.list_all(token)
    typemap[`save_${key}`] = (uuid:string, data:string, token?:string) => loader.save(uuid, data, token)
    typemap[`delete_${key}`] = (uuid:string, token?:string) => loader.delete(uuid, token)
    typemap[`delete_all_${key}`] = (token?:string) => loader.delete_all(token)
    typemap[`load_${key}`] = (uuid:string, token?:string) => loader.load(uuid, token)
}