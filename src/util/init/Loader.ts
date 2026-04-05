import { Socket } from "socket.io";
import { RecordIOLoader } from "../../server/io";

export const Loader = (socket:Socket, loader:RecordIOLoader, key:string) => {
    socket.on(`load_all_${key}`, (token?:string) => loader.load_all(token))
    socket.on(`delete_all_${key}`, (token?:string) => loader.delete_all(token))
    socket.on(`list_all_${key}`, (token?:string) => loader.list_all(token))
    socket.on(`save_${key}`, (uuid:string, data:string, token?:string) => loader.save(uuid, data, token))
    socket.on(`delete_${key}`, (uuid:string, token?:string) => loader.delete(uuid, token))
    socket.on(`delete_all_${key}`, (token?:string) => loader.delete_all(token))
    socket.on(`load_${key}`, (uuid:string, token?:string) => loader.load(uuid, token))
}