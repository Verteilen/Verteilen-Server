import { Socket } from "socket.io";
import { PluginLoader } from "../../server/plugin";

export const PluginInit = (socket:Socket, loader:PluginLoader) => {
    loader.get_plugins(socket)
    socket.on('get_plugin', (cache:boolean = true) => cache ? loader.get_plugins(socket) : loader.load_all())
    socket.on('import_plugin', (name:string, url:string, token:string) => loader.import_plugin(socket, name, url, token))
    socket.on('delete_plugin', (name:string) => loader.delete_plugin(socket, name))
    socket.on('get_project', (name:string, group:string, filename:string) => loader.get_project(socket, name, group, filename))
    socket.on('get_database', (name:string, group:string, filename:string) => loader.get_database(socket, name, group, filename))
    socket.on('plugin_download', (uuid:string, plugin:string, tokens:string) => loader.plugin_download(socket, uuid, plugin, tokens))
    socket.on('plugin_remove', (uuid:string, plugin:string) => loader.plugin_remove(socket, uuid, plugin))
}