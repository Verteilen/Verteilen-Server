// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? Handle server -> admin
//  ? This thing exist in computed server space
//
import { Socket } from 'socket.io';
import { v6 as uuidv6 } from 'uuid'

export interface ConsoleServerContainer {
    uuid: string
    socket:Socket
}

/**
 * Console server helper, cluster server side handle web client connection instances
 */
export class ConsoleServerManager {
    /**
     * Websocket instance for admin
     */
    admins: Array<ConsoleServerContainer> = []
    messager_log:Function

    constructor(_messager_log:Function){
        this.messager_log = _messager_log
    }
    /**
     * Adding a frontend socket to the list\
     * This include add auto delete event when socket disconnect
     * @param socket Target frontend
     * @param typeMap The event map
     * @returns The socket record
     */
    Add = (socket:Socket): ConsoleServerContainer => {
        const buffer:ConsoleServerContainer = {
            uuid: uuidv6(),
            socket: socket,
        }

        const target = this.admins.find(x => x.socket == socket)
        if(target != undefined){
            this.messager_log('[Source Analysis] Failed, Socket is already in record')
            return target;
        }

        socket.on('disconnect', (reason, des) => {
            const index = this.admins.findIndex(x => x.socket == socket)
            if(index != -1){
                this.admins.splice(index, 1)
            }
        })
        
        return buffer
    }
    /**
     * Manually remove the frontend socket
     * @param socket Target frontend
     */
    Remove = (socket:Socket): void => {
        const target = this.admins.findIndex(x => x.socket.id == socket.id)
        if(target != -1){
            this.admins.splice(target, 1);
        }else{
            this.messager_log('[Source Remove Analysis] Failed, Socket is not in record')
        }
    }
}