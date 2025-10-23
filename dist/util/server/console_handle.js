"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util_Server_Console_Proxy = exports.Util_Server_Console = void 0;
const verteilen_core_1 = require("verteilen-core");
class Util_Server_Console {
    constructor() {
        this.receivedPack = (model, record) => {
            var _a, _b;
            const pass = model.manager.Register();
            if (pass == -1) {
                model.record.running = false;
                model.record.stop = true;
                return false;
            }
            model.record.projects = record.projects;
            model.record.nodes = record.nodes;
            model.record.project_state = model.record.projects.map(x => {
                return {
                    uuid: x.uuid,
                    state: verteilen_core_1.ExecuteState.NONE
                };
            });
            model.record.project_index = pass;
            model.record.project = record.projects[pass].uuid;
            model.record.task_index = 0;
            model.record.task_state = model.record.projects[0].task.map(x => {
                return {
                    uuid: x.uuid,
                    state: verteilen_core_1.ExecuteState.NONE
                };
            });
            model.record.task_state[0].state = verteilen_core_1.ExecuteState.RUNNING;
            model.record.task_detail = [];
            const task = (_a = model.record.projects[model.record.project_index]) === null || _a === void 0 ? void 0 : _a.task[model.record.task_index];
            const count = task.cronjob ? ((_b = task === null || task === void 0 ? void 0 : task.jobs.length) !== null && _b !== void 0 ? _b : 0) : 1;
            for (let i = 0; i < count; i++) {
                model.record.task_detail.push({
                    index: i,
                    node: "",
                    message: [],
                    state: verteilen_core_1.ExecuteState.NONE
                });
            }
            model.manager.Update();
            return true;
        };
    }
}
exports.Util_Server_Console = Util_Server_Console;
class Util_Server_Console_Proxy {
    constructor(_model) {
        this.execute_project_start = (d) => {
            var _a, _b;
            const index = d[1];
            if (index == -1)
                return;
            this.model.record.project = d[0].uuid;
            this.model.record.project_index = index;
            this.model.record.project_state[index].state = verteilen_core_1.ExecuteState.RUNNING;
            this.model.record.task_state = this.model.record.projects[index].task.map(x => {
                return {
                    uuid: x.uuid,
                    state: verteilen_core_1.ExecuteState.NONE
                };
            });
            this.model.record.task_detail = [];
            const task = (_a = this.model.record.projects[this.model.record.project_index]) === null || _a === void 0 ? void 0 : _a.task[this.model.record.task_index];
            const count = task.cronjob ? ((_b = task === null || task === void 0 ? void 0 : task.jobs.length) !== null && _b !== void 0 ? _b : 0) : 1;
            for (let i = 0; i < count; i++) {
                this.model.record.task_detail.push({
                    index: i,
                    node: "",
                    message: [],
                    state: verteilen_core_1.ExecuteState.NONE
                });
            }
            console.log("project start: ", this.model.record.projects.length, index);
        };
        this.execute_project_finish = (d) => {
            if (this.model.record.process_type >= 1) {
                this.model.record.running = false;
                this.model.record.stop = true;
            }
            const index = d[1];
            const size = this.model.record.projects.length;
            if (index == -1)
                return;
            this.model.record.project = "";
            this.model.record.project_state[index].state = verteilen_core_1.ExecuteState.FINISH;
            this.model.record.para = undefined;
            console.log("project finish: ", this.model.record.projects.length, index);
            if (index == size - 1) {
                this.model.record.command.push(['clean']);
            }
        };
        this.execute_task_start = (d) => {
            if (this.model.record.project_index == -1)
                return;
            const index = this.model.record.projects[this.model.record.project_index].task.findIndex(x => x.uuid == d[0].uuid);
            if (index == -1)
                return;
            this.model.record.useCron = d[0].cronjob;
            this.model.record.task = d[0].uuid;
            this.model.record.task_index = index;
            this.model.record.task_state[index].state = verteilen_core_1.ExecuteState.RUNNING;
            for (let i = 0; i < index; i++)
                this.model.record.task_state[i].state = verteilen_core_1.ExecuteState.FINISH;
            for (let i = index + 1; i < this.model.record.task_state.length; i++)
                this.model.record.task_state[i].state = verteilen_core_1.ExecuteState.NONE;
            this.model.record.task_detail = [];
            const p = this.model.record.projects[this.model.record.project_index];
            const t = p.task[this.model.record.task_index];
            const count = this.model.manager.get_task_state_count(t);
            for (let i = 0; i < count; i++) {
                this.model.record.task_detail.push({
                    index: i,
                    node: "",
                    message: [],
                    state: verteilen_core_1.ExecuteState.NONE
                });
            }
        };
        this.execute_task_finish = (d) => {
            if (this.model.record.process_type == 2) {
                this.model.record.running = false;
                this.model.record.stop = true;
            }
            if (this.model.record.project_index == -1)
                return;
            const index = this.model.record.projects[this.model.record.project_index].task.findIndex(x => x.uuid == d.uuid);
            if (index == -1)
                return;
            this.model.record.useCron = false;
            this.model.record.task = "";
            this.model.record.task_state[index].state = verteilen_core_1.ExecuteState.FINISH;
            if (index + 1 < this.model.record.task_state.length - 1) {
                this.model.record.task_state[index + 1].state = verteilen_core_1.ExecuteState.RUNNING;
            }
        };
        this.execute_subtask_start = (d) => {
            var _a;
            try {
                this.model.record.task_detail[d[1]].node = (_a = d[2]) !== null && _a !== void 0 ? _a : '';
                this.model.record.task_detail[d[1]].state = verteilen_core_1.ExecuteState.RUNNING;
            }
            catch (error) {
                console.error(`execute_subtask_start`, error.message);
            }
        };
        this.execute_subtask_update = (d) => {
            if (this.model.record.task_detail.length > d[1]) {
                this.model.record.task_detail[d[1]].node = d[2];
                this.model.record.task_detail[d[1]].state = d[3];
            }
            else {
                console.error(`subtask_start ${d[1]} is out of range: ${this.model.record.task_detail.length}`);
            }
        };
        this.execute_subtask_end = (d) => {
            try {
                this.model.record.task_detail[d[1]].state = verteilen_core_1.ExecuteState.FINISH;
            }
            catch (error) {
                console.error(`execute_subtask_end`, error.message);
            }
        };
        this.execute_job_start = (d) => {
            if (this.model.record.project_index == -1)
                return;
            if (!this.model.record.useCron) {
                this.model.record.task_detail[0].node = d[2];
            }
        };
        this.execute_job_finish = (d) => {
            if (d[3] == 1) {
                const task = this.model.record.projects[this.model.record.project_index].task[this.model.record.task_index];
                const index = task.jobs.findIndex(x => x.uuid == d[0].uuid);
                if (index != -1 && task.jobs[index].category == verteilen_core_1.JobCategory.Condition) {
                    const cr = task.jobs[index].number_args[0];
                    if (cr == verteilen_core_1.ConditionResult.None)
                        return;
                    this.model.record.command.push(['stop']);
                    let timer;
                    timer = setInterval(() => {
                        if (this.model.record.running == false) {
                            clearInterval(timer);
                            const state = (cr == verteilen_core_1.ConditionResult.ThrowTask || cr == verteilen_core_1.ConditionResult.ThrowProject) ? verteilen_core_1.ExecuteState.ERROR : verteilen_core_1.ExecuteState.SKIP;
                            const target = this.model.record.task_detail[d[1]];
                            if (target != undefined) {
                                target.state = state;
                            }
                            if (cr == verteilen_core_1.ConditionResult.Pause)
                                return;
                            if (cr == verteilen_core_1.ConditionResult.SkipProject || cr == verteilen_core_1.ConditionResult.ThrowProject) {
                                this.model.record.command.push(['skip', 0, state]);
                                if (this.model.record.project.length > 0) {
                                    if (this.model.record.process_type == 0) {
                                        this.model.record.command.push(['execute', this.model.record.process_type]);
                                    }
                                }
                            }
                            else if (cr == verteilen_core_1.ConditionResult.SkipTask || cr == verteilen_core_1.ConditionResult.ThrowTask) {
                                this.model.record.command.push(['skip', 1, state]);
                                if (this.model.record.project.length > 0) {
                                    if (this.model.record.process_type == 0) {
                                        this.model.record.command.push(['execute', this.model.record.process_type]);
                                    }
                                }
                            }
                        }
                    }, 1000);
                }
            }
            //model.value![1].task_detail[index].node = ""
        };
        this.feedback_message = (d) => {
            if (d.index == undefined || d.index == -1)
                return;
            const container = this.model.record.task_detail[d.index];
            if (container != undefined) {
                container.message.push(d.message);
                if (container.message.length > verteilen_core_1.MESSAGE_LIMIT) {
                    container.message.shift();
                }
            }
        };
        /**
         * When parameter getting change by the process steps\
         * This get called
         * @param d The whole container for the parameters
         */
        this.update_runtime_parameter = (d) => {
            this.model.record.para = d;
        };
        this.model = _model;
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
exports.Util_Server_Console_Proxy = Util_Server_Console_Proxy;
