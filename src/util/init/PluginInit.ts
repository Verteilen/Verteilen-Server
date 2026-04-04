import { PluginLoader, TypeMap } from "verteilen-core";

export const PluginInit = (typemap:TypeMap, loader:PluginLoader) => {
    loader.get_plugins()
    typemap['get_plugin'] = async (cache:boolean = true) => cache ? loader.get_plugins() : loader.load_all()
    typemap['import_plugin'] = async (name:string, url:string, token:string) => loader.import_plugin(name, url, token)
    typemap['delete_plugin'] = async (name:string) => loader.delete_plugin(name)
    typemap['get_project'] = async (name:string, group:string, filename:string) => loader.get_project(name, group, filename)
    typemap['get_database'] = async (name:string, group:string, filename:string) => loader.get_database(name, group, filename)
    typemap['plugin_download'] = (uuid:string, plugin:string, tokens:string) => loader.plugin_download(uuid, plugin, tokens)
    typemap['plugin_remove'] = (uuid:string, plugin:string) => loader.plugin_remove(uuid, plugin)
}