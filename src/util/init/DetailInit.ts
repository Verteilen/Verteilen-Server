import { ServerDetailEvent, TypeMap } from "verteilen-core";
import { Socket } from 'socket.io';

export const DetailInit = (socket:Socket, typemap:TypeMap, detail:ServerDetailEvent) => {
    typemap['resource_start'] = (uuid:string) => detail.resource_start(socket, uuid)
    typemap['resource_end'] = (uuid:string) => detail.resource_end(socket, uuid)
    typemap['plugin_info'] = (uuid:string) => detail.plugin_info(socket, uuid)
    // Shell
    typemap['shell_enter'] = (uuid, value) => detail.shell_enter(socket, uuid, value)
    typemap['shell_open'] = (uuid) => detail.shell_open(socket, uuid)
    typemap['shell_close'] = (uuid) => detail.shell_close(socket, uuid)
    typemap['shell_folder'] = (uuid, path) => detail.shell_folder(socket, uuid, path)
    // Node Events
    typemap['node_list'] = () => detail.node_list(socket)
    typemap['node_add'] = (url:string, id:string) => detail.node_add(socket, url, id)
    typemap['node_update'] = () => detail.node_update(socket)
    typemap['node_delete'] = (uuid:string, reason?:string) => detail.node_delete(socket, uuid, reason)
    // Console Events
    typemap['console_list'] = () => detail.console_list(socket)
    typemap['console_record'] = (uuid:string) => detail.console_record(socket, uuid)
    typemap['console_execute'] = (uuid:string, type:number) => detail.console_execute(socket, uuid, type)
    typemap['console_stop'] = (uuid:string) => detail.console_stop(socket, uuid)
    typemap['console_clean'] = (uuid:string) => detail.console_clean(socket, uuid)
    typemap['console_skip'] = (uuid:string, forward:boolean, type:number, state:ExecuteState) => detail.console_skip(socket, uuid, forward, type, state)
    typemap['console_skip2'] = (uuid:string, type:number) => detail.console_skip2(socket, uuid, type)
    typemap['console_add'] = (name:string, record:Record) => detail.console_add(socket, name, record, undefined)
    typemap['console_update'] = () => detail.console_update()
}