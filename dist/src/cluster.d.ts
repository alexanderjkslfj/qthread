export default class Cluster {
    private threads;
    private methods;
    private terminated;
    get isTerminated(): boolean;
    private checkTerminated;
    /**
     * Create a cluster running one thread
     */
    constructor();
    get threadCount(): number;
    /**
     * Adds a thread to the cluster.
     */
    addThread(): Promise<void>;
    /**
     * Removes a thread from the cluster. Prefers idle threads.
     * @param force Removed thread is terminated with force. Not recommended.
     * @returns true if successful, false if no thread to remove exists.
     */
    removeThread(force?: boolean): boolean;
    /**
     * Adds method to cluster if it doesn't exist yet
     * @param method method to add
     * @param name name of the method (random if omitted)
     * @param force if true acts the same way as overwriteMethod (and always returns true)
     * @returns true if successful, false if name already exists
     */
    addMethod(method: CallableFunction, name?: string, force?: boolean): Promise<boolean>;
    /**
     * Adds method to cluster even if it already exists
     * @param method method to add
     * @param name name of the method
     */
    overwriteMethod(method: CallableFunction, name: string): Promise<void>;
    /**
     * Removes method from cluster
     * @param name name of the method
     * @returns true if successful, false if method doesn't exist
     */
    removeMethodByName(name: string): Promise<boolean>;
    removeMethodByMethod(method: CallableFunction): Promise<boolean>;
    callMethod<T>(name: string, ...parameters: any[]): Promise<T>;
    private idleOrRandomThread;
    /**
     * Executes action for every thread simultaneously.
     * @param action callback to execute for every thread
     * @returns true when all threads have finished or false if a thread threw
     */
    private callAll;
    terminate(force?: boolean): Promise<void>;
}
