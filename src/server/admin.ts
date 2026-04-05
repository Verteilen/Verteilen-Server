// ========================
//                           
//      Share Codebase     
//                           
// ========================
//
//  ? Admin state management for server
//
import { ConsoleServerManager } from "../script/console_server_manager";

export class ServerAdmin {

    target:ConsoleServerManager

    constructor(target:ConsoleServerManager){
        this.target = target
    }
}