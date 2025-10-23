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
exports.Loader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const verteilen_core_1 = require("verteilen-core");
const Loader = (typeMap, key, folder, per, ext = ".json") => {
    const GetUserType = (token) => {
        const pa_root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER);
        const pa = path.join(pa_root, 'user');
        if (!fs.existsSync(pa))
            fs.mkdirSync(pa, { recursive: true });
        if (token != undefined) {
            const target_path = path.join(pa, token + '.json');
            const p = JSON.parse(fs.readFileSync(target_path).toString());
            return p.permission;
        }
        return undefined;
    };
    typeMap[`load_all_${key}`] = (socket, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const r = [];
        const ffs = fs.readdirSync(root, { withFileTypes: true });
        ffs.forEach(x => {
            if (!x.isFile())
                return;
            const file = fs.readFileSync(path.join(root, x.name), { encoding: 'utf8', flag: 'r' });
            r.push(file);
        });
        const d = {
            name: `load_all_${key}-feedback`,
            data: JSON.stringify(r)
        };
        socket.send(JSON.stringify(d));
    };
    typeMap[`delete_all_${key}`] = (socket, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.rmSync(root, { recursive: true });
        fs.mkdirSync(root, { recursive: true });
    };
    typeMap[`list_all_${key}`] = (socket, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const ps = fs.readdirSync(root, { withFileTypes: false });
        const d = {
            name: `list_all_${key}-feedback`,
            data: JSON.stringify(ps)
        };
        socket.send(JSON.stringify(d));
    };
    typeMap[`save_${key}`] = (socket, name, data, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        let filename = name + ext;
        let p = path.join(root, filename);
        fs.writeFileSync(p, data);
    };
    typeMap[`rename_${key}`] = (socket, name, newname, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        fs.cpSync(path.join(root, `${name}.json`), path.join(root, `${newname}.json`), { recursive: true });
        fs.rmdirSync(path.join(root, `${name}.json`));
    };
    typeMap[`delete_${key}`] = (socket, name, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const filename = name + ext;
        const p = path.join(root, filename);
        if (fs.existsSync(p))
            fs.rmSync(p);
    };
    typeMap[`delete_all_${key}`] = (socket, name, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const ps = fs.readdirSync(root, { withFileTypes: false });
        ps.forEach(x => fs.rmSync(path.join(root, x)));
    };
    typeMap[`load_${key}`] = (socket, name, token) => {
        const per = GetUserType(token);
        const root = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, folder);
        if (!fs.existsSync(root))
            fs.mkdirSync(root, { recursive: true });
        const filename = name + ext;
        const p = path.join(root, filename);
        if (fs.existsSync(p)) {
            const file = fs.readFileSync(p, { encoding: 'utf8', flag: 'r' });
            const d = {
                name: `load_${key}-feedback`,
                data: file.toString()
            };
            socket.send(JSON.stringify(d));
        }
        else {
            const d = {
                name: `load_${key}-feedback`,
                data: undefined
            };
            socket.send(JSON.stringify(d));
        }
    };
};
exports.Loader = Loader;
