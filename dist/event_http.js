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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventInit = void 0;
const fs = __importStar(require("fs"));
const os_1 = __importStar(require("os"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const verteilen_core_1 = require("verteilen-core");
const event_1 = require("./event");
const EventInit = (app, middle) => {
    const storage = multer_1.default.memoryStorage();
    const upload = (0, multer_1.default)({ dest: 'public/upload', storage: storage });
    app.use((0, cookie_parser_1.default)());
    app.use(body_parser_1.default.json());
    app.use(body_parser_1.default.urlencoded());
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    console.log("current dir: ", process.cwd());
    app.get('/login/:token', (req, res, next) => {
        if (req.params.token != undefined) {
            res.cookie('token', req.params.token);
        }
        res.redirect('/');
    });
    // The simple web response to let frontend know that backend exists
    app.post('/user', (req, res) => {
        const token = req.cookies.token;
        if (token == undefined) {
            res.sendStatus(403);
            return;
        }
        event_1.backendEvent.ChangeProfile(token, req.body);
        res.sendStatus(200);
    });
    app.get('/user', (req, res) => {
        const token = req.cookies.token;
        res.send(event_1.backendEvent.GetUserType(token));
    });
    app.get('/pic', (req, res) => {
        const token = req.cookies.token;
        if (token == undefined) {
            res.sendStatus(403);
            return;
        }
        const p = path_1.default.join((0, os_1.homedir)(), verteilen_core_1.DATA_FOLDER, 'user', token, token + '.pic');
        if (fs.existsSync(p)) {
            res.sendFile(p);
        }
        else {
            res.sendStatus(404);
        }
    });
    app.post('/pic', upload.single('pic'), (req, res) => {
        const token = req.cookies.token;
        if (token == undefined) {
            res.sendStatus(403);
            return;
        }
        if (req.file == undefined) {
            res.sendStatus(204);
        }
        else {
            const p = path_1.default.join(os_1.default.homedir(), verteilen_core_1.DATA_FOLDER, 'user', token);
            if (!fs.existsSync(p))
                fs.mkdirSync(p, { recursive: true });
            const n = path_1.default.join(p, token + '.pic');
            fs.writeFileSync(n, req.file.buffer);
            res.sendStatus(200);
        }
    });
    app.use((req, res, next) => {
        next();
        return;
        if (req.cookies.token == undefined) {
            res.sendStatus(403);
        }
        else {
            if (event_1.backendEvent.IsPass(req.cookies.token)) {
                next();
            }
            else {
                res.sendStatus(403);
            }
        }
    }, middle ? middle : express_1.default.static(path_1.default.join(__dirname, 'public')));
};
exports.EventInit = EventInit;
