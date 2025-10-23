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
exports.QuickVerify = exports.Pass = exports.Verify = exports.GenerateToken = exports.Register = exports.Auth = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const keypair_1 = __importDefault(require("keypair"));
const saltRounds = 10;
const pair = (0, keypair_1.default)();
const Auth = (username, password) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const p = path.join(__dirname, username);
        if (!fs.existsSync(p)) {
            return false;
        }
        const pconfig = path.join(p, 'config.json');
        if (!fs.existsSync(pconfig)) {
            return false;
        }
        const config = JSON.parse(fs.readFileSync(pconfig).toString());
        bcrypt_1.default.compare(password, config.hash, (err, result) => {
            if (err)
                return false;
            return result;
        });
    });
});
exports.Auth = Auth;
const Register = (username, password) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        bcrypt_1.default.genSalt(saltRounds, (err, salt) => {
            if (err) {
                resolve(undefined);
                return;
            }
            bcrypt_1.default.hash(password, salt, (err, hash) => {
                if (err) {
                    resolve(undefined);
                    return;
                }
                const p = path.join(__dirname, username);
                if (!fs.existsSync(p)) {
                    fs.mkdirSync(p);
                }
                const pconfig = path.join(p, 'config.json');
                if (!fs.existsSync(pconfig)) {
                    fs.writeFileSync(pconfig, JSON.stringify({
                        hash: hash
                    }, null, 4));
                }
            });
        });
    });
});
exports.Register = Register;
const GenerateToken = (username, date) => {
    const token = jsonwebtoken_1.default.sign({
        user: username,
        create: Date.now(),
        expire: date.getTime()
    }, pair.private, { algorithm: 'RS256' });
    return token;
};
exports.GenerateToken = GenerateToken;
const Verify = (token) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, pair.public, (err, decoded) => {
            if (decoded == undefined || err)
                return false;
            resolve(decoded);
        });
    });
});
exports.Verify = Verify;
const Pass = (data) => {
    return data.expire > Date.now();
};
exports.Pass = Pass;
const QuickVerify = (token) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        (0, exports.Verify)(token).then(x => {
            const jwt = JSON.parse(x.toString());
            const passed = (0, exports.Pass)(jwt);
            resolve([passed, jwt.user]);
        }).catch(err => {
            resolve([false, '']);
        });
    });
});
exports.QuickVerify = QuickVerify;
