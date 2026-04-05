import { ExecuteState, ServerDetailEvent, Record } from "verteilen-core";
import { Socket } from 'socket.io';

export const DetailInit = (socket:Socket, detail:ServerDetailEvent) => {
    socket.on('resource_start', (uuid:string) => detail.resource_start(socket, uuid))
    socket.on('resource_end', (uuid:string) => detail.resource_end(socket, uuid))
    socket.on('plugin_info', (uuid:string) => detail.plugin_info(socket, uuid))
    // Shell
    socket.on('shell_enter', (uuid, value) => detail.shell_enter(socket, uuid, value))
    socket.on('shell_open', (uuid) => detail.shell_open(socket, uuid))
    socket.on('shell_close', (uuid) => detail.shell_close(socket, uuid))
    socket.on('shell_folder', (uuid, path) => detail.shell_folder(socket, uuid, path))
    // Node Events
    socket.on('node_list', () => detail.node_list(socket))
    socket.on('node_add', (url:string, id:string) => detail.node_add(socket, url, id))
    socket.on('node_update', () => detail.node_update(socket))
    socket.on('node_delete', (uuid:string, reason?:string) => detail.node_delete(socket, uuid, reason))
    // Console Events
    socket.on('console_list', () => detail.console_list(socket))
    socket.on('console_record', (uuid:string) => detail.console_record(socket, uuid))
    socket.on('console_execute', (uuid:string, type:number) => detail.console_execute(socket, uuid, type))
    socket.on('console_stop', (uuid:string) => detail.console_stop(socket, uuid))
    socket.on('console_clean', (uuid:string) => detail.console_clean(socket, uuid))
    socket.on('console_skip', (uuid:string, forward:boolean, type:number, state:ExecuteState) => detail.console_skip(socket, uuid, forward, type, state))
    socket.on('console_skip2', (uuid:string, type:number) => detail.console_skip2(socket, uuid, type))
    socket.on('console_add', (name:string, record:Record) => detail.console_add(socket, name, record, undefined))
    socket.on('console_update', () => detail.console_update())
}