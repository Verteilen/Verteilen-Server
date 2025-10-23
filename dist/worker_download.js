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
exports.checker = void 0;
const progress_1 = __importDefault(require("progress"));
const byte_size_1 = __importDefault(require("byte-size"));
const argparse_1 = require("argparse");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const nodejs_file_downloader_1 = require("nodejs-file-downloader");
/**
 * The official repo for placing json location.json which specified the executable location\
 * This includes the OS difference
 */
const location = "https://raw.githubusercontent.com/Verteilen/worker/refs/heads/main/location.json";
/**
 * This check if user have worker executable download\
 * If not it will get the worker executable download from the src {@link location}
 */
const checker = () => __awaiter(void 0, void 0, void 0, function* () {
    const parser = new argparse_1.ArgumentParser({
        description: 'Vertelien cli helper'
    });
    parser.add_argument('-v', '--version', { nargs: '?', default: 'false', const: true, help: 'Show version numbers' });
    parser.add_argument('-r', '--reinstall_worker', { nargs: '?', default: 'false', const: true, help: 'Reinstall worker executable file' });
    const args = parser.parse_args();
    if (args.version == true) {
        const packager = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString());
        console.log(process.version);
        console.log(packager.version);
    }
    let exe = "";
    let link = "";
    const folder = path.join(__dirname, "..", "bin");
    console.log("Detect platform: ", process.platform);
    if (process.platform == 'win32')
        exe = path.join(folder, "worker.exe");
    else
        exe = path.join(folder, "worker");
    if (!fs.existsSync(folder))
        fs.mkdirSync(folder);
    if (args.reinstall_worker == true && fs.existsSync(exe)) {
        fs.rmSync(exe);
    }
    if (fs.existsSync(exe))
        return;
    const res = yield fetch(location);
    const loca = JSON.parse((yield res.text()));
    if (process.platform == 'win32')
        link = loca.windows;
    else
        link = loca.linux;
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        const bar = new progress_1.default("[:bar] :remaining", { total: 100 });
        console.log(`start download worker executable from ${link}`);
        const download = new nodejs_file_downloader_1.Downloader({
            url: link,
            directory: folder,
            onError: (err => {
                console.error(err);
            }),
            onProgress: (per, chunk, remaining) => {
                const r = (0, byte_size_1.default)(remaining);
                bar.update(Number(per.replace("%", "")) / 100, {
                    "bar": per,
                    "remaining": `${r.value} ${r.unit}`
                });
            }
        });
        try {
            yield download.download();
            resolve();
        }
        catch (error) {
            console.error(error);
            reject(error.message);
        }
    }));
});
exports.checker = checker;
