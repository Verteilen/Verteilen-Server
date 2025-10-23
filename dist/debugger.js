"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.message_broadcast = exports.messager_log = exports.messager = void 0;
/**
* 傳送資料到 UI 執行序
*/
const messager = (...args) => { };
exports.messager = messager;
/**
* 傳送資料到 UI 執行序 \
* 控制台輸出 \
* 回傳伺服器訊息
*/
const messager_log = (msg, tag) => {
    (0, exports.messager)(msg, tag);
    console.log(msg);
};
exports.messager_log = messager_log;
/**
* 傳送資料到 UI 執行序 \
* 控制台輸出 \
* 給指定的客戶端對象訊息 \
* @param wss 如果不輸入, 會直接從伺服器實體抓所有連線
*/
const message_broadcast = (msg, wss) => {
    (0, exports.messager)(msg);
    console.log(msg);
    wss.forEach(s => {
        const d = { name: 'message', message: msg };
        s.websocket.send(JSON.stringify(d));
    });
};
exports.message_broadcast = message_broadcast;
