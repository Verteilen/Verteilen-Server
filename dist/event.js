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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendEvent = exports.BackendEvent = void 0;
const tcp_port_used_1 = __importDefault(require("tcp-port-used"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const uuid_1 = require("uuid");
const debugger_1 = require("./debugger");
const verteilen_core_1 = require("verteilen-core");
const loader_1 = require("./util/loader");
const server_1 = require("./util/server/server");
const plugin_1 = require("./util/plugin");
class BackendEvent {
    constructor() {
        this.manager = [];
        this.util = new server_1.Util_Server(this);
        this.libs = { libs: [] };
        // The new manager enter the hood
        this.NewConsoleConsole = (socket) => {
            console.log(`New Connection ${socket.url}`);
            let typeMap = {
                'javascript': this.javascript,
                'message': this.message,
                'load_record_obsolete': this.load_record_obsolete,
                'save_preference': this.save_preference,
                'load_preference': this.load_preference,
            };
            typeMap = this.util.EventInit(typeMap);
            (0, loader_1.Loader)(typeMap, 'record', 'record', verteilen_core_1.PermissionType.PROJECT);
            (0, loader_1.Loader)(typeMap, 'parameter', 'parameter', verteilen_core_1.PermissionType.PARAMETER);
            (0, loader_1.Loader)(typeMap, 'node', 'node', verteilen_core_1.PermissionType.NODE);
            (0, loader_1.Loader)(typeMap, 'log', 'log', verteilen_core_1.PermissionType.LOG);
            (0, loader_1.Loader)(typeMap, 'lib', 'lib', verteilen_core_1.PermissionType.LIB, '');
            (0, loader_1.Loader)(typeMap, 'user', 'user', verteilen_core_1.PermissionType.ROOT);
            (0, plugin_1.PluginInit)(typeMap, this);
            const n = new verteilen_core_1.Execute_ConsoleServerManager.ConsoleServerManager(socket, debugger_1.messager_log, typeMap);
            this.manager.push(n);
            return n;
        };
        this.DropConsoleConsole = (socket) => {
            const index = this.manager.findIndex(x => x.ws == socket);
            if (index != -1)
                this.manager.splice(index, 1);
        };
        this.ConsoleAnalysis = (socket, h) => {
            const index = this.manager.findIndex(x => x.ws == socket);
            if (index != -1) {
                this.manager[index].Analysis(h);
            }
            else {
                const n = this.NewConsoleConsole(socket);
                n.Analysis(h);
            }
        };
        this.IsPass = (token) => {
            const pa_root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER);
            const pa = path.join(pa_root, 'user');
            return fs.existsSync(path.join(pa, token + '.json'));
        };
        //#region Manager Side
        this.javascript = (socket, content, parameter) => {
            const javascript_messager_feedback = (msg, tag) => {
                (0, debugger_1.messager)(msg, tag);
                const d = {
                    name: 'javascript-feedback',
                    data: msg
                };
                socket.send(JSON.stringify(d));
            };
            const d = {
                uuid: 'javascript',
                category: verteilen_core_1.JobCategory.Execution,
                type: verteilen_core_1.JobType.JAVASCRIPT,
                script: content,
                string_args: [],
                number_args: [],
                boolean_args: []
            };
            const p = { plugins: [] };
            const worker = new verteilen_core_1.ClientJobExecute.ClientJobExecute(javascript_messager_feedback, javascript_messager_feedback, d, undefined, p);
            worker.parameter = parameter ? JSON.parse(parameter) : undefined;
            worker.execute().then(x => {
                javascript_messager_feedback(x, "Finish");
            });
        };
        this.message = (socket, message, tag) => {
            console.log(`${tag == undefined ? '[Electron Backend]' : '[' + tag + ']'} ${message}`);
        };
        this.load_record_obsolete = (socket, dummy) => {
            if (!fs.existsSync('record.json'))
                return undefined;
            const data = fs.readFileSync('record.json').toString();
            fs.rmSync('record.json');
            const d = {
                name: "load_record_obsolete-feedback",
                data: data
            };
            socket.send(JSON.stringify(d));
        };
        this.save_preference = (socket, preference, token) => {
            const pa = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, "user");
            if (!fs.existsSync(pa))
                fs.mkdirSync(pa, { recursive: true });
            if (token != undefined) {
                const target = path.join(pa, token + '.json');
                const p = JSON.parse(fs.readFileSync(target).toString());
                p.preference = JSON.parse(preference);
                fs.writeFileSync(target, JSON.stringify(p, null, 4));
            }
        };
        this.load_preference = (socket, token) => {
            const pa = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, "user");
            if (!fs.existsSync(pa))
                fs.mkdirSync(pa, { recursive: true });
            if (token != undefined) {
                const file = path.join(pa, token + '.json');
                if (fs.existsSync(file)) {
                    const p = JSON.parse(fs.readFileSync(file).toString());
                    const d = { name: "load_preference-feedback", data: JSON.stringify(p.preference) };
                    socket.send(JSON.stringify(d));
                }
            }
        };
        this.PortAvailable = (start) => __awaiter(this, void 0, void 0, function* () {
            let port_result = start;
            let canbeuse = false;
            while (!canbeuse) {
                yield tcp_port_used_1.default.check(port_result).then(x => {
                    canbeuse = !x;
                }).catch(err => {
                    canbeuse = true;
                });
                if (!canbeuse)
                    port_result += 1;
            }
            return port_result;
        });
        this.Boradcasting = (name, data) => {
            const d = {
                name: name,
                data: data
            };
            this.manager.forEach(x => {
                x.ws.send(JSON.stringify(d));
            });
        };
        //#endregion
        //#region Server
        this.Root = (port) => {
            const pa_root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER);
            const pa = path.join(pa_root, 'user');
            if (!fs.existsSync(pa))
                fs.mkdirSync(pa, { recursive: true });
            const c = fs.readdirSync(pa).length;
            if (c == 0) {
                const root = {
                    token: (0, uuid_1.v6)(),
                    type: verteilen_core_1.UserType.ROOT,
                    preference: {
                        lan: 'en',
                        log: true,
                        font: 18,
                        theme: "dark",
                        notification: false,
                        plugin_token: [],
                        animation: true,
                    },
                    name: "root",
                    description: "Root User",
                    permission: this.RootPermission()
                };
                fs.writeFileSync(path.join(pa, root.token + '.json'), JSON.stringify(root, null, 2));
                console.log(`Login with root using: ${root.token} `);
                console.log(`Login with root using: https://127.0.0.1:${port}/login/${root.token} `);
            }
            else {
                const files = fs.readdirSync(pa).filter(x => x.endsWith('.json'));
                for (let file of files) {
                    const user = JSON.parse(fs.readFileSync(path.join(pa, file)).toString());
                    if (user.type == verteilen_core_1.UserType.ROOT) {
                        console.log(`Login with root using: ${user.token} `);
                        console.log(`Login with root using: https://127.0.0.1:${port}/login/${user.token} `);
                    }
                }
            }
            const server_setting = path.join(pa_root, "server.json");
            if (!fs.existsSync(server_setting)) {
                this.setting = {
                    open_guest: false
                };
                fs.writeFileSync(server_setting, JSON.stringify(this.setting, null, 2));
            }
            else {
                this.setting = JSON.parse(fs.readFileSync(server_setting).toString());
            }
        };
        this.RootPermission = () => {
            const perl = {
                view: true,
                create: true,
                edit: true,
                delete: true,
            };
            const per = {
                project: perl,
                task: perl,
                job: perl,
                plugin: perl,
                node: perl,
                parameter: perl,
                lib: perl,
                log: perl,
                execute_job: true
            };
            return per;
        };
        this.GetUserType = (token) => {
            const pa_root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER);
            const pa = path.join(pa_root, 'user');
            if (!fs.existsSync(pa))
                fs.mkdirSync(pa, { recursive: true });
            if (token != undefined) {
                const target_path = path.join(pa, token + '.json');
                const p = JSON.parse(fs.readFileSync(target_path).toString());
                if (p.token == token) {
                    return {
                        name: p.name,
                        type: p.type,
                        picture_url: false,
                        description: p.description,
                        permission: p.type == verteilen_core_1.UserType.ROOT ? this.RootPermission() : p.permission
                    };
                }
            }
            return {
                name: "GUEST",
                picture_url: false,
                type: verteilen_core_1.UserType.GUEST
            };
        };
        this.ChangeProfile = (token, data) => {
            const pa_root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER);
            const pa = path.join(pa_root, 'user');
            if (!fs.existsSync(pa))
                fs.mkdirSync(pa, { recursive: true });
            if (token != undefined) {
                const target_path = path.join(pa, token + '.json');
                const p = JSON.parse(fs.readFileSync(target_path).toString());
                if (p.token == token) {
                    if (data.name != undefined) {
                        p.name = data.name;
                    }
                    if (data.description != undefined) {
                        p.description = data.description;
                    }
                    fs.writeFileSync(target_path, JSON.stringify(p, null, 2));
                    console.log("Update");
                }
            }
            else {
                console.log("token is null");
            }
        };
        this.jsCall = new verteilen_core_1.ClientJavascript.ClientJavascript(debugger_1.messager, debugger_1.messager_log, () => undefined);
    }
}
exports.BackendEvent = BackendEvent;
exports.backendEvent = new BackendEvent();
