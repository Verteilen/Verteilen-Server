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
exports.main = void 0;
const ws = __importStar(require("ws"));
const fs = __importStar(require("fs"));
const pem = __importStar(require("pem"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const chalk_1 = __importDefault(require("chalk"));
const express_1 = __importDefault(require("express"));
const event_1 = require("./event");
const verteilen_core_1 = require("verteilen-core");
const event_http_1 = require("./event_http");
const worker_download_1 = require("./worker_download");
let wsServer = undefined;
let app = undefined;
let httpss = undefined;
let wss = undefined;
const webport = event_1.backendEvent.PortAvailable(verteilen_core_1.WebPORT);
const get_pem = (express) => {
    return new Promise((resolve) => {
        const pemFolder = path.join(os.homedir(), verteilen_core_1.DATA_FOLDER, 'pem');
        if (!fs.existsSync(pemFolder))
            fs.mkdirSync(pemFolder);
        const clientKey = path.join(pemFolder, express ? "express_clientkey.pem" : "console_clientkey.pem");
        const certificate = path.join(pemFolder, express ? "express_certificate.pem" : "console_certificate.pem");
        if (!fs.existsSync(clientKey) || !fs.existsSync(certificate)) {
            pem.createCertificate({ selfSigned: true }, (err, keys) => {
                fs.writeFileSync(clientKey, keys.clientKey, { encoding: 'utf8' });
                fs.writeFileSync(certificate, keys.certificate, { encoding: 'utf8' });
                resolve([keys.clientKey, keys.certificate]);
            });
        }
        else {
            resolve([fs.readFileSync(clientKey, 'utf8').toString(), fs.readFileSync(certificate, 'utf8').toString()]);
        }
    });
};
const main = (middle) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, worker_download_1.checker)();
    return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
        const p = yield webport;
        {
            const pems = yield get_pem(true);
            app = (0, express_1.default)();
            httpss = https.createServer({ key: pems[0], cert: pems[1], minVersion: 'TLSv1.2', maxVersion: 'TLSv1.3' }, app);
            (0, event_http_1.EventInit)(app, middle);
            httpss.listen(p, () => {
                console.log(chalk_1.default.greenBright(`https server run at ${p}`));
            });
            event_1.backendEvent.Root(p);
        }
        {
            //wsServer = new ws.Server({port: p})
            wsServer = new ws.Server({ server: httpss });
            console.log(chalk_1.default.greenBright(`websocket server run at ${p}`));
            wsServer.on('connection', (ws) => {
                //const p = new eventInit(ws)
                ws.on('message', (data) => {
                    const d = JSON.parse(data.toString());
                    event_1.backendEvent.ConsoleAnalysis(ws, d);
                });
                ws.on('open', () => {
                    event_1.backendEvent.NewConsoleConsole(ws);
                });
                ws.on('close', () => {
                    event_1.backendEvent.DropConsoleConsole(ws);
                });
            });
        }
        resolve([app, wsServer]);
    }));
});
exports.main = main;
if (require.main === module) {
    (0, exports.main)();
}
