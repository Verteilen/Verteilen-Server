import { Account_Module } from "./module/account";
import { ServerBase } from "./server";

/**
 * **Compute Server**\
 * The task schedule server
 */
export class Server extends ServerBase {
    account_module: Account_Module | undefined
}