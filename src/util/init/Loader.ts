import { Socket } from "socket.io";
import { RecordIOLoader } from "../../server/storage/base";
import { DataHeader, Shareable } from "verteilen-core";

export const Loader = <T extends DataHeader & Shareable>(socket:Socket, loader:RecordIOLoader<T>, key:string) => {
    socket.on(`load_all_${key}`, (token?:string) => loader.load_all(token))
    socket.on(`delete_all_${key}`, (token?:string) => loader.delete_all(token))
    socket.on(`list_all_${key}`, (token?:string) => loader.list_all(token))
    socket.on(`save_${key}`, (uuid:string, data:T, token?:string) => loader.save(uuid, data, token))
    socket.on(`delete_${key}`, (uuid:string, token?:string) => loader.delete(uuid, token))
    socket.on(`delete_all_${key}`, (token?:string) => loader.delete_all(token))
    socket.on(`load_${key}`, (uuid:string, token?:string) => loader.load(uuid, token))
}