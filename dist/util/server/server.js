"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util_Server = void 0;
const verteilen_core_1 = require("verteilen-core");
const uuid_1 = require("uuid");
const console_handle_1 = require("./console_handle");
const debugger_1 = require("../../debugger");
const log_handle_1 = require("./log_handle");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class Util_Server {
    constructor(backend) {
        this.execute_manager = [];
        this.shellBind = new Map();
        this.libs = { libs: [] };
        this.logs = { logs: [] };
        this.re = [];
        this.NewConnection = (x) => {
            const p = {
                title: verteilen_core_1.I18N.i18n.global.t('toast.connection-create-title'),
                type: 'success',
                message: `${verteilen_core_1.I18N.i18n.global.t('toast.connection-create-des')}: ${x.websocket.url} \n${x.uuid}`
            };
            this.backend.Boradcasting("makeToast", p);
            this.execute_manager.forEach(y => {
                y.manager.NewConnection(x);
            });
        };
        this.DisConnection = (x) => {
            const p = {
                title: verteilen_core_1.I18N.i18n.global.t('toast.connection-remove-title'),
                type: 'error',
                message: `${verteilen_core_1.I18N.i18n.global.t('toast.connection-remove-des')}: ${x.websocket.url} \n${x.uuid}`
            };
            this.backend.Boradcasting("makeToast", p);
            this.execute_manager.forEach(y => {
                y.manager.Disconnect(x);
            });
        };
        this.Analysis = (d) => {
            this.execute_manager.forEach(x => x.manager.Analysis(JSON.parse(JSON.stringify(d))));
        };
        this.shell_enter = (socket, uuid, value) => {
            this.websocket_manager.shell_enter(uuid, value);
        };
        this.shell_open = (socket, uuid) => {
            this.websocket_manager.shell_open(uuid);
            if (this.shellBind.has(uuid)) {
                this.shellBind.get(uuid).push(socket);
            }
            else {
                this.shellBind.set(uuid, [socket]);
            }
        };
        this.shell_close = (socket, uuid) => {
            this.websocket_manager.shell_close(uuid);
            if (this.shellBind.has(uuid)) {
                const p = this.shellBind.get(uuid);
                const index = p.findIndex(x => x == socket);
                if (index != -1)
                    p.splice(index, 1);
                this.shellBind.set(uuid, p);
            }
        };
        this.shell_folder = (socket, uuid, path) => {
            this.websocket_manager.shell_folder(uuid, path);
        };
        this.resource_start = (socket, uuid) => {
            const p = this.websocket_manager.targets.find(x => x.uuid == uuid);
            const d = { name: 'resource_start', data: 0 };
            p === null || p === void 0 ? void 0 : p.websocket.send(JSON.stringify(d));
        };
        this.resource_end = (socket, uuid) => {
            const p = this.websocket_manager.targets.find(x => x.uuid == uuid);
            const d = { name: 'resource_end', data: 0 };
            p === null || p === void 0 ? void 0 : p.websocket.send(JSON.stringify(d));
        };
        this.node_list = (socket) => {
            var _a;
            const h = {
                name: "node_list-feedback",
                data: (_a = this.websocket_manager) === null || _a === void 0 ? void 0 : _a.targets
            };
            socket.send(JSON.stringify(h));
        };
        this.node_add = (socket, url, id) => {
            var _a;
            const h = {
                name: "node_add-feedback",
                data: (_a = this.websocket_manager) === null || _a === void 0 ? void 0 : _a.server_start(url, id)
            };
            socket.send(JSON.stringify(h));
        };
        this.node_update = (socket) => {
            var _a;
            const h = {
                name: "node_update-feedback",
                data: [(_a = this.websocket_manager) === null || _a === void 0 ? void 0 : _a.server_update()]
            };
            socket.send(JSON.stringify(h));
        };
        this.node_delete = (socket, uuid, reason) => {
            var _a;
            (_a = this.websocket_manager) === null || _a === void 0 ? void 0 : _a.server_stop(uuid, reason);
        };
        this.console_list = (socket) => {
            const h = {
                name: "console_list-feedback",
                data: this.execute_manager.map(x => x.record)
            };
            socket.send(JSON.stringify(h));
        };
        this.console_record = (socket, uuid) => {
            var _a;
            const r = (_a = this.execute_manager.find(x => { var _a; return ((_a = x.record) === null || _a === void 0 ? void 0 : _a.uuid) == uuid; })) === null || _a === void 0 ? void 0 : _a.record;
            const h = {
                name: "console_record-feedback",
                data: JSON.stringify(r)
            };
            socket.send(JSON.stringify(h));
        };
        this.shellReply = (data, p) => {
            if (p == undefined)
                return;
            if (this.shellBind.has(p.uuid)) {
                const k = this.shellBind.get(p.uuid);
                k.forEach(x => {
                    const h = {
                        name: "shellReply", data: data
                    };
                    x.send(JSON.stringify(h));
                });
            }
        };
        this.folderReply = (data, p) => {
            if (p == undefined)
                return;
            if (this.shellBind.has(p.uuid)) {
                const k = this.shellBind.get(p.uuid);
                k.forEach(x => {
                    const h = {
                        name: "folderReply", data: data
                    };
                    x.send(JSON.stringify(h));
                });
            }
        };
        this.console_execute = (socket, uuid, type) => {
            const target = this.execute_manager.find(x => x.record.uuid == uuid);
            if (target == undefined)
                return;
            target.record.process_type = type;
            target.record.running = true;
            target.record.stop = false;
            target.manager.first = true;
        };
        this.console_stop = (socket, uuid) => {
            const target = this.execute_manager.find(x => x.record.uuid == uuid);
            if (target == undefined)
                return;
            target.record.stop = true;
            target.manager.Stop();
        };
        this.console_add = (socket, name, record, preference) => {
            record.projects.forEach(x => x.uuid = (0, uuid_1.v6)());
            const em = new verteilen_core_1.Execute_ExecuteManager.ExecuteManager(name, this.websocket_manager, debugger_1.messager, JSON.parse(JSON.stringify(record)));
            const er = Object.assign(Object.assign({}, record), { uuid: em.uuid, name: name, running: false, stop: true, process_type: -1, useCron: false, para: undefined, command: [], project: '', task: '', project_index: -1, task_index: -1, project_state: [], task_state: [], task_detail: [] });
            em.libs = this.libs;
            const p = { manager: em, record: er };
            const uscp = new console_handle_1.Util_Server_Console_Proxy(p);
            const uslp = new log_handle_1.Util_Server_Log_Proxy(p, this.logs, preference);
            em.proxy = this.CombineProxy([uscp.execute_proxy, uslp.execute_proxy]);
            const r = this.console.receivedPack(p, record);
            if (r)
                this.execute_manager.push(p);
            const h = {
                name: "console_add-feedback",
                data: r ? er : undefined
            };
            socket.send(JSON.stringify(h));
        };
        this.console_update = () => {
            const re = [];
            this.execute_manager.forEach(x => {
                if (x.record.running && !x.record.stop) {
                    try {
                        x.manager.Update();
                    }
                    catch (err) {
                        x.record.stop = true;
                        console.log(err);
                        re.push({
                            code: 400,
                            name: err.name,
                            message: err.message,
                            stack: err.stack
                        });
                    }
                }
                if (x.record.stop) {
                    if (x.manager.jobstack == 0) {
                        x.record.running = false;
                    }
                }
                if (x.record.command.length > 0) {
                    const p = x.record.command.shift();
                    if (p[0] == 'clean')
                        this.console_clean(undefined, x.record.uuid);
                    else if (p[0] == 'stop')
                        this.console_stop(undefined, x.record.uuid);
                    else if (p[0] == 'skip')
                        this.console_skip(undefined, x.record.uuid, p[1], p[2]);
                    else if (p[0] == 'execute')
                        this.console_execute(undefined, x.record.uuid, p[1]);
                }
            });
            const logss = this.logs.logs.filter(x => x.dirty && x.output);
            logss.forEach(x => {
                x.dirty = false;
                const filename = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, "log", `${x.uuid}.json`);
                fs.writeFileSync(filename, JSON.stringify(x, null, 4));
            });
            return re;
        };
        this.console_update_call = (socket) => {
            const p = this.re;
            this.re = [];
            const h = {
                name: "console_update-feedback",
                data: JSON.stringify(p)
            };
            socket.send(JSON.stringify(h));
        };
        this.console_clean = (socket, uuid) => {
            const target = this.execute_manager.find(x => x.record.uuid == uuid);
            if (target == undefined)
                return;
            target.manager.Clean();
            target.record.projects = [];
            target.record.project = "";
            target.record.task = "";
            target.record.project_index = -1;
            target.record.task_index = -1;
            target.record.project_state = [];
            target.record.task_state = [];
            target.record.task_detail = [];
            target.manager.Release();
            const index = this.execute_manager.findIndex(x => x.record.uuid == uuid);
            this.execute_manager.splice(index, 1);
        };
        this.console_skip = (socket, uuid, forward, type, state = verteilen_core_1.ExecuteState.FINISH) => {
            const target = this.execute_manager.find(x => x.record.uuid == uuid);
            if (target == undefined)
                return;
            if (type == 0) {
                // Project
                target.record.project_state[target.record.project_index].state = forward ? (state != undefined ? state : verteilen_core_1.ExecuteState.FINISH) : verteilen_core_1.ExecuteState.NONE;
                target.record.project_index += forward ? 1 : -1;
                if (target.record.project_index == target.record.projects.length) {
                    target.record.project_index = -1;
                    this.console_clean(socket, uuid);
                }
                else {
                    if (target.record.project_index < 0) {
                        target.record.project_index = 0;
                    }
                    target.record.task_state = target.record.projects[target.record.project_index].task.map(x => {
                        return {
                            uuid: x.uuid,
                            state: verteilen_core_1.ExecuteState.NONE
                        };
                    });
                    target.record.task_detail = [];
                    const p = target.record.projects[target.record.project_index];
                    const t = p.task[target.record.task_index];
                    const count = target.manager.get_task_state_count(t);
                    for (let i = 0; i < count; i++) {
                        target.record.task_detail.push({
                            index: i,
                            node: "",
                            message: [],
                            state: verteilen_core_1.ExecuteState.NONE
                        });
                    }
                    const index = forward ? target.manager.SkipProject() : target.manager.PreviousProject();
                    console.log("%s project, index: %d, next count: %d", forward ? "Skip" : "Previous", index, count);
                }
            }
            else if (type == 1) {
                const begining = target.record.task_state[0].state == verteilen_core_1.ExecuteState.NONE;
                // Task
                if (!begining && forward)
                    target.record.task_state[target.record.task_index].state = state != undefined ? state : verteilen_core_1.ExecuteState.FINISH;
                if (!forward)
                    target.record.task_state[target.record.task_index].state = verteilen_core_1.ExecuteState.NONE;
                target.record.task_index += forward ? 1 : -1;
                if (target.record.task_index == target.record.task_state.length) {
                    this.console_skip(socket, uuid, true, 0);
                }
                else {
                    if (!begining && forward)
                        target.record.task_state[target.record.task_index].state = state != undefined ? state : verteilen_core_1.ExecuteState.FINISH;
                    else if (!forward)
                        target.record.task_state[target.record.task_index].state = verteilen_core_1.ExecuteState.RUNNING;
                    target.record.task_detail = [];
                    const p = target.record.projects[target.record.project_index];
                    const t = p.task[target.record.task_index];
                    const count = target.manager.get_task_state_count(t);
                    for (let i = 0; i < count; i++) {
                        target.record.task_detail.push({
                            index: i,
                            node: "",
                            message: [],
                            state: verteilen_core_1.ExecuteState.NONE
                        });
                    }
                    const index = forward ? target.manager.SkipTask() : target.manager.PreviousTask();
                    console.log("Skip task, index: %d, next count: %d", index, count);
                }
            }
        };
        this.console_skip2 = (socket, uuid, v) => {
            const target = this.execute_manager.find(x => x.record.uuid == uuid);
            if (target == undefined)
                return;
            const index = target.manager.SkipSubTask(v);
            if (index < 0) {
                console.error("Skip step failed: ", index);
                return;
            }
            for (let i = 0; i < index; i++) {
                target.record.task_detail[i].state = verteilen_core_1.ExecuteState.FINISH;
            }
            console.log("Skip task", index);
        };
        this.EventInit = (typeMap) => {
            typeMap = Object.assign(typeMap, {
                'resource_start': this.resource_start,
                'resource_end': this.resource_end,
                'shell_enter': this.shell_enter,
                'shell_open': this.shell_open,
                'shell_close': this.shell_close,
                'shell_folder': this.shell_folder,
                'node_list': this.node_list,
                'node_add': this.node_add,
                'node_update': this.node_update,
                'node_delete': this.node_delete,
                'console_list': this.console_list,
                'console_record': this.console_record,
                'console_execute': this.console_execute,
                'console_stop': this.console_stop,
                'console_clean': this.console_clean,
                'console_skip': this.console_skip,
                'console_skip2': this.console_skip2,
                'console_add': this.console_add,
                'console_update': this.console_update_call,
            });
            return typeMap;
        };
        this.CombineProxy = (eps) => {
            const p = {
                executeProjectStart: (data) => { eps.forEach(x => x.executeProjectStart(JSON.parse(JSON.stringify(data)))); },
                executeProjectFinish: (data) => { eps.forEach(x => x.executeProjectFinish(JSON.parse(JSON.stringify(data)))); },
                executeTaskStart: (data) => { eps.forEach(x => x.executeTaskStart(JSON.parse(JSON.stringify(data)))); },
                executeTaskFinish: (data) => { eps.forEach(x => x.executeTaskFinish(JSON.parse(JSON.stringify(data)))); },
                executeSubtaskStart: (data) => { eps.forEach(x => x.executeSubtaskStart(JSON.parse(JSON.stringify(data)))); },
                executeSubtaskUpdate: (data) => { eps.forEach(x => x.executeSubtaskUpdate(JSON.parse(JSON.stringify(data)))); },
                executeSubtaskFinish: (data) => { eps.forEach(x => x.executeSubtaskFinish(JSON.parse(JSON.stringify(data)))); },
                executeJobStart: (data) => { eps.forEach(x => x.executeJobStart(JSON.parse(JSON.stringify(data)))); },
                executeJobFinish: (data) => { eps.forEach(x => x.executeJobFinish(JSON.parse(JSON.stringify(data)))); },
                feedbackMessage: (data) => { eps.forEach(x => x.feedbackMessage(JSON.parse(JSON.stringify(data)))); },
                updateParameter: (data) => { eps.forEach(x => x.updateParameter(JSON.parse(JSON.stringify(data)))); },
            };
            return p;
        };
        this.backend = backend;
        const n = {
            shellReply: this.shellReply,
            folderReply: this.folderReply
        };
        this.websocket_manager = new verteilen_core_1.Execute_SocketManager.WebsocketManager(this.NewConnection, this.DisConnection, this.Analysis, debugger_1.messager_log, n);
        this.console = new console_handle_1.Util_Server_Console();
        this.updatehandle = setInterval(() => {
            this.re.push(...this.console_update());
        }, verteilen_core_1.RENDER_UPDATETICK);
    }
}
exports.Util_Server = Util_Server;
