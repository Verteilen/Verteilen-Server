// ========================
//                           
//      Share Codebase     
//                           
// ========================
/**
 * The data structure which will use in execute stage
 */
import { ExecuteManager } from "../script/execute_manager"
import { ExecuteRecord } from "verteilen-core"

/**
 * **Server Execute Record**\
 * A package with execution worker and output log record
 */
export interface ExecutePair {
    /**
     * **Execute Manager Instance**\
     * The main execute worker
     */
    manager?: ExecuteManager
    /**
     * **Execute Record Data**\
     * To store the state which can be display at the frontend
     */
    record?: ExecuteRecord
    /**
     * **Extra Data**\
     * The counter for trigger update event in vue
     */
    meta?: any
}