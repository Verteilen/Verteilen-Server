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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginInit = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const verteilen_core_1 = require("verteilen-core");
const GetCurrentPlugin = () => {
    const b = {
        plugins: [],
        templates: []
    };
    const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template');
    const root2 = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'plugin');
    if (!fs.existsSync(root))
        fs.mkdirSync(root, { recursive: true });
    if (!fs.existsSync(root2))
        fs.mkdirSync(root2, { recursive: true });
    const files = fs.readdirSync(root, { withFileTypes: true }).filter(x => x.isFile()).map(x => x.name).filter(x => x.endsWith('.json'));
    const configs = files.map(file => {
        return JSON.parse(fs.readFileSync(path.join(root, file), 'utf-8'));
    });
    configs.forEach((config, index) => {
        const ps = config.projects.map(x => ({
            value: -1,
            group: x.group,
            filename: x.filename,
            title: x.title
        }));
        const ps2 = config.parameters.map(x => ({
            value: -1,
            group: x.group,
            filename: x.filename,
            title: x.title
        }));
        b.templates.push({
            name: files[index].replace('.json', ''),
            project: ps,
            parameter: ps2,
            url: config.url
        });
    });
    const files2 = fs.readdirSync(root2, { withFileTypes: true }).filter(x => x.isFile()).map(x => x.name).filter(x => x.endsWith('.json'));
    const configs2 = files2.map(file => {
        return JSON.parse(fs.readFileSync(path.join(root2, file), 'utf-8'));
    });
    configs2.forEach((config, index) => {
        const p = config;
        p.title = files2[index].replace('.json', '');
        b.plugins.push(p);
    });
    return b;
};
const import_template = (socket, name, url, token) => __awaiter(void 0, void 0, void 0, function* () {
    const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template');
    const error_children = [];
    const tokens = [undefined, ...token.split(' ')];
    const content_folder = path.join(root, name);
    const project_folder = path.join(content_folder, 'project');
    const parameter_folder = path.join(content_folder, 'parameter');
    if (!fs.existsSync(root))
        fs.mkdirSync(root, { recursive: true });
    let req = {};
    let ob = undefined;
    for (let t of tokens) {
        if (t == undefined) {
            req = { method: 'GET', cache: "no-store" };
        }
        else {
            req = {
                method: 'GET',
                cache: "no-store",
                headers: {
                    "Authorization": t ? `Bearer ${t}` : ''
                }
            };
        }
        try {
            const res = yield fetch(url, req);
            const tex = yield res.text();
            ob = JSON.parse(tex);
            break;
        }
        catch (error) {
            console.error(error);
        }
    }
    if (ob == undefined) {
        const p = { title: "Import Failed", type: "error", message: `Cannot find the json from url ${url}, or maybe just the wrong token` };
        const h = { name: "makeToast", data: JSON.stringify(p) };
        socket.send(JSON.stringify(h));
        return JSON.stringify(GetCurrentPlugin());
    }
    ob.url = url;
    fs.writeFileSync(path.join(root, name + '.json'), JSON.stringify(ob, null, 4));
    if (!fs.existsSync(content_folder))
        fs.mkdirSync(content_folder, { recursive: true });
    if (!fs.existsSync(project_folder))
        fs.mkdirSync(project_folder, { recursive: true });
    if (!fs.existsSync(parameter_folder))
        fs.mkdirSync(parameter_folder, { recursive: true });
    const folder = url.substring(0, url.lastIndexOf('/'));
    const project_calls = [];
    const parameter_calls = [];
    ob.projects.forEach((p) => {
        project_calls.push(fetch(folder + "/" + p.filename + '.json', req));
    });
    const pss = yield Promise.all(project_calls);
    const project_calls2 = pss.map(x => x.text());
    const pss_result = yield Promise.all(project_calls2);
    pss_result.forEach((text, index) => {
        const n = ob.projects[index].filename + '.json';
        try {
            const project = JSON.parse(text);
            fs.writeFileSync(path.join(project_folder, n), JSON.stringify(project, null, 4));
        }
        catch (error) {
            console.log("Parse error:\n", text);
            error_children.push([`Import Project ${n} Error`, error.message]);
        }
    });
    ob.parameters.forEach((p) => {
        parameter_calls.push(fetch(folder + "/" + p.filename + '.json', req));
    });
    const pss2 = yield Promise.all(parameter_calls);
    const parameter_calls2 = pss2.map(x => x.text());
    const pss_result2 = yield Promise.all(parameter_calls2);
    pss_result2.forEach((text, index) => {
        const n = ob.parameters[index].filename + '.json';
        try {
            const project = JSON.parse(text);
            const parameter = JSON.parse(text);
            fs.writeFileSync(path.join(parameter_folder, n), JSON.stringify(parameter, null, 4));
        }
        catch (error) {
            console.log("Parse error:\n", text);
            error_children.push([`Import Parameter ${n} Error`, error.message]);
        }
    });
    for (let x of error_children) {
        const p = { title: x[0], type: "error", message: x[1] };
        const h = { name: "makeToast", data: JSON.stringify(p) };
        socket.send(JSON.stringify(h));
    }
    return JSON.stringify(GetCurrentPlugin());
});
const import_plugin = (socket, name, url, token) => __awaiter(void 0, void 0, void 0, function* () {
    const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'plugin');
    const tokens = [undefined, ...token.split(' ')];
    if (!fs.existsSync(root))
        fs.mkdirSync(root, { recursive: true });
    let req = {};
    let ob = undefined;
    for (let t of tokens) {
        if (t == undefined) {
            req = { method: 'GET', cache: "no-store" };
        }
        else {
            req = {
                method: 'GET',
                cache: "no-store",
                headers: {
                    "Authorization": t ? `Bearer ${t}` : ''
                }
            };
        }
        try {
            const res = yield fetch(url, req);
            const tex = yield res.text();
            ob = JSON.parse(tex);
            break;
        }
        catch (error) {
            console.error(error);
        }
    }
    if (ob == undefined) {
        const p = { title: "Import Failed", type: "error", message: `Cannot find the json from url ${url}, or maybe just the wrong token` };
        const h = { name: "makeToast", data: JSON.stringify(p) };
        socket.send(JSON.stringify(h));
        return JSON.stringify(GetCurrentPlugin());
    }
    ob.url = url;
    fs.writeFileSync(path.join(root, name + '.json'), JSON.stringify(ob, null, 4));
    return JSON.stringify(GetCurrentPlugin());
});
const PluginInit = (typeMap, backend) => {
    typeMap['get_plugin'] = (socket) => __awaiter(void 0, void 0, void 0, function* () {
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template');
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const h = { name: "get_plugin-feedback", data: JSON.stringify(GetCurrentPlugin()) };
        socket.send(JSON.stringify(h));
    });
    typeMap['import_template'] = (socket, name, url, token) => __awaiter(void 0, void 0, void 0, function* () {
        const h = { name: "import_template-feedback", data: import_template(socket, name, url, token) };
        socket.send(JSON.stringify(h));
    });
    typeMap['import_plugin'] = (socket, name, url, token) => __awaiter(void 0, void 0, void 0, function* () {
        const h = { name: "import_plugin-feedback", data: import_plugin(socket, name, url, token) };
        socket.send(JSON.stringify(h));
    });
    typeMap['import_template_delete'] = (socket, name) => {
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template');
        if (fs.existsSync(path.join(root, name + '.json')))
            fs.rmSync(path.join(root, name + '.json'));
        if (fs.existsSync(path.join(root, name)))
            fs.rmdirSync(path.join(root, name), { recursive: true, });
        const h = { name: "import_template_delete-feedback", data: JSON.stringify(GetCurrentPlugin()) };
        socket.send(JSON.stringify(h));
    };
    typeMap['import_plugin_delete'] = (socket, name) => {
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'plugin');
        if (fs.existsSync(path.join(root, name + '.json')))
            fs.rmSync(path.join(root, name + '.json'));
        const h = { name: "import_plugin_delete-feedback", data: JSON.stringify(GetCurrentPlugin()) };
        socket.send(JSON.stringify(h));
    };
    typeMap['get_template'] = (socket, group, filename) => {
        const config = GetCurrentPlugin();
        let find = false;
        let target = '';
        for (let x of config.templates) {
            for (let y of x.project) {
                if (y.group == group && y.filename == filename) {
                    find = true;
                    target = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template', x.name, 'project', y.filename + '.json');
                    break;
                }
            }
            if (find)
                break;
        }
        if (!fs.existsSync(target)) {
            console.error("Path not found", target);
            const h = { name: "get_template-feedback", data: undefined };
            socket.send(JSON.stringify(h));
        }
        const data = fs.readFileSync(target);
        const h = { name: "get_template-feedback", data: data.toString('utf-8') };
        socket.send(JSON.stringify(h));
    };
    typeMap['get_parameter'] = (socket, group, filename) => {
        const config = GetCurrentPlugin();
        let find = false;
        let target = '';
        for (let x of config.templates) {
            for (let y of x.parameter) {
                if (y.group == group && y.filename == filename) {
                    find = true;
                    target = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'template', x.name, 'parameter', y.filename + '.json');
                    break;
                }
            }
            if (find)
                break;
        }
        if (!fs.existsSync(target)) {
            console.error("Path not found", target);
            const h = { name: "get_parameter-feedback", data: undefined };
            socket.send(JSON.stringify(h));
        }
        const data = fs.readFileSync(target);
        const h = { name: "get_parameter-feedback", data: data.toString('utf-8') };
        socket.send(JSON.stringify(h));
    };
    typeMap['plugin_download'] = (socket, uuid, plugin, tokens) => {
        var _a;
        const p = JSON.parse(plugin);
        const p2 = Object.assign(Object.assign({}, p), { token: tokens.split(' ') });
        const t = (_a = backend.util.websocket_manager) === null || _a === void 0 ? void 0 : _a.targets.find(x => x.uuid == uuid);
        const h = { name: 'plugin_download', data: p2 };
        t === null || t === void 0 ? void 0 : t.websocket.send(JSON.stringify(h));
    };
    typeMap['plugin_remove'] = (socket, uuid, plugin) => {
        var _a;
        const p = JSON.parse(plugin);
        const t = (_a = backend.util.websocket_manager) === null || _a === void 0 ? void 0 : _a.targets.find(x => x.uuid == uuid);
        const h = { name: 'plugin_remove', data: p };
        t === null || t === void 0 ? void 0 : t.websocket.send(JSON.stringify(h));
    };
};
exports.PluginInit = PluginInit;
