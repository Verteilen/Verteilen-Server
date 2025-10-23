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
exports.Util_Server_Log_Proxy = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const verteilen_core_1 = require("verteilen-core");
class Util_Server_Log_Proxy {
    get target_log() {
        return this.logs.logs.find(x => x.uuid == this.uuid);
    }
    constructor(_model, _log, _preference) {
        this.task_index = 0;
        this.uuid = '';
        this.execute_project_start = (d) => __awaiter(this, void 0, void 0, function* () {
            const target = this.model.record.projects[this.model.record.project_index];
            const title = yield this.getnewname(target.title);
            this.uuid = (0, uuid_1.v6)();
            const newlog = {
                uuid: this.uuid,
                filename: title,
                dirty: true,
                output: this.preference.log,
                project: target,
                state: verteilen_core_1.ExecuteState.RUNNING,
                start_timer: Date.now(),
                parameter: d[0].parameter,
                end_timer: 0,
                logs: target.task.map(x => {
                    return {
                        start_timer: 0,
                        end_timer: 0,
                        task_state: {
                            uuid: x.uuid,
                            state: verteilen_core_1.ExecuteState.NONE
                        },
                        task_detail: []
                    };
                })
            };
            this.logs.logs = [newlog].concat(this.logs.logs);
        });
        this.execute_project_finish = (d) => {
            if (this.target_log == undefined)
                return;
            this.target_log.state = verteilen_core_1.ExecuteState.FINISH;
            this.target_log.end_timer = Date.now();
            this.target_log.dirty = true;
        };
        this.execute_task_start = (d) => {
            if (this.target_log == undefined)
                return;
            const index = this.target_log.project.task.findIndex(x => x.uuid == d[0].uuid);
            if (index == -1)
                return;
            this.task_index = index;
            this.target_log.logs[this.task_index].task_detail = [];
            const p = this.model.record.projects[this.model.record.project_index];
            const t = p.task[this.task_index];
            const count = this.model.manager.get_task_state_count(t);
            for (let i = 0; i < count; i++) {
                this.target_log.logs[this.task_index].task_detail.push({
                    index: i,
                    node: "",
                    message: [],
                    state: verteilen_core_1.ExecuteState.NONE
                });
            }
            if (this.target_log.logs.length > this.task_index) {
                this.target_log.logs[this.task_index].task_state.state = verteilen_core_1.ExecuteState.RUNNING;
                this.target_log.logs[this.task_index].start_timer = Date.now();
                this.target_log.dirty = true;
            }
        };
        this.execute_task_finish = (d) => {
            if (this.target_log == undefined)
                return;
            if (this.target_log.logs.length > this.task_index) {
                this.target_log.logs[this.task_index].task_state.state = verteilen_core_1.ExecuteState.FINISH;
                this.target_log.logs[this.task_index].end_timer = Date.now();
                this.target_log.dirty = true;
            }
        };
        this.execute_subtask_start = (d) => {
            if (this.target_log == undefined)
                return;
            if (this.target_log.logs[this.task_index].task_detail.length > d[1]) {
                this.target_log.logs[this.task_index].task_detail[d[1]].state = verteilen_core_1.ExecuteState.RUNNING;
                this.target_log.dirty = true;
            }
        };
        this.execute_subtask_update = (d) => {
            if (this.target_log == undefined)
                return;
            if (this.target_log.logs[this.task_index].task_detail.length > d[1]) {
                this.target_log.logs[this.task_index].task_detail[d[1]].state = d[3];
                this.target_log.dirty = true;
            }
        };
        this.execute_subtask_end = (d) => {
            if (this.target_log == undefined)
                return;
            if (this.target_log.logs[this.task_index].task_detail.length > d[1]) {
                this.target_log.logs[this.task_index].task_detail[d[1]].state = verteilen_core_1.ExecuteState.FINISH;
                this.target_log.dirty = true;
            }
        };
        this.execute_job_start = (d) => {
        };
        this.execute_job_finish = (d) => {
            if (this.target_log == undefined)
                return;
            if (d[3] == 1) {
                const currentLog = this.target_log;
                const task = currentLog.project.task[this.task_index];
                const index = task.jobs.findIndex(x => x.uuid == d[0].uuid);
                if (index != -1 && task.jobs[index].category == verteilen_core_1.JobCategory.Condition) {
                    const cr = task.jobs[index].number_args[0];
                    if (cr == verteilen_core_1.ConditionResult.None)
                        return;
                    const state = (cr == verteilen_core_1.ConditionResult.ThrowTask || cr == verteilen_core_1.ConditionResult.ThrowProject) ? verteilen_core_1.ExecuteState.ERROR : verteilen_core_1.ExecuteState.SKIP;
                    const target = this.model.record.task_detail[d[1]];
                    if (target != undefined) {
                        target.state = state;
                    }
                    currentLog.logs[this.task_index].task_state.state = state;
                    if (cr == verteilen_core_1.ConditionResult.Pause)
                        return;
                    if (cr == verteilen_core_1.ConditionResult.SkipProject || cr == verteilen_core_1.ConditionResult.ThrowProject) {
                        currentLog.state = state;
                    }
                }
            }
        };
        this.feedback_message = (d) => {
            if (this.target_log == undefined)
                return;
            if (d.index == undefined || d.index == -1)
                return;
            if (this.target_log == undefined)
                return;
            if (this.target_log.logs[this.task_index].task_detail.length > d.index) {
                this.target_log.logs[this.task_index].task_detail[d.index].message.push(d.message);
                this.target_log.dirty = true;
            }
            else {
                console.warn("Try access message by index but failed: ", d);
            }
        };
        this.update_runtime_parameter = (d) => {
            if (this.target_log != undefined) {
                this.target_log.parameter = d;
                this.target_log.dirty = true;
            }
        };
        this.getnewname = (name) => __awaiter(this, void 0, void 0, function* () {
            const root = "data/log";
            let count = 0;
            let filename = name;
            let p = `${root}/${filename}`;
            while (fs.existsSync(p + ".json")) {
                count = count + 1;
                filename = `${name} ${count}`;
                p = `${root}/${filename}`;
            }
            return filename;
        });
        this.model = _model;
        this.logs = _log;
        this.preference = _preference;
    }
    get execute_proxy() {
        const d = {
            executeProjectStart: (data) => { this.execute_project_start(data); },
            executeProjectFinish: (data) => { this.execute_project_finish(data); },
            executeTaskStart: (data) => { this.execute_task_start(data); },
            executeTaskFinish: (data) => { this.execute_task_finish(data); },
            executeSubtaskStart: (data) => { this.execute_subtask_start(data); },
            executeSubtaskUpdate: (data) => { this.execute_subtask_update(data); },
            executeSubtaskFinish: (data) => { this.execute_subtask_end(data); },
            executeJobStart: (data) => { this.execute_job_start(data); },
            executeJobFinish: (data) => { this.execute_job_finish(data); },
            feedbackMessage: (data) => { this.feedback_message(data); },
            updateParameter: (data) => { this.update_runtime_parameter(data); }
        };
        return d;
    }
}
exports.Util_Server_Log_Proxy = Util_Server_Log_Proxy;
