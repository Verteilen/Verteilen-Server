
/**
 * **Server Use Interface**\
 * For auth server action
 */
export interface AuthIOLoader {
    /**
     * Just init the environment
     * @returns 
     */
    init: () => Promise<boolean>
    /**
     * Create new user
     * @returns The UUID of new user
     * @error 1 The username is already taken
     */
    create: (username: string, password: string) => Promise<string>
    /**
     * Delete the user by uuid
     * @error 1 Cannot find user by UUID
     */
    delete: (uuid: string) => Promise<void>
    pwd_change: (username: string, password: string) => Promise<string>
    /**
     * Trying to login
     * @returns The jwt token
     */
    login: (username: string, password: string) => Promise<string>
    /**
     * Verify the token and recreate it
     * @returns The new jwt token
     * @error 1 Expired
     */
    verify: (token: string) => Promise<string>
}
/**
 * **IO Loader Worker**\
 * Fetch data from storage space, could be disk or cloud
 */
export interface AuthLoader {
    auth: AuthIOLoader
}