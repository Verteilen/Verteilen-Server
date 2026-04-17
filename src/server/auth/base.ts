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
    /**
     * Change username current password
     * @returns UUID of the user
     * @error 1 username cannot be found
     */
    pwd_change: (username: string, password: string) => Promise<string>
    /**
     * Trying to login
     * @returns The jwt token
     * @error 1 Password wrong
     * @error 2 Username cannot be found
     */
    login: (username: string, password: string) => Promise<string>
    /**
     * Verify the token and recreate it
     * @returns The new jwt token
     * @error 1 Expired
     * @error 2 Cannot find user by UUID
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