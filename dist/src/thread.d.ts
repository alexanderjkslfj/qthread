export default class Thread extends EventTarget {
    private worker;
    private calls;
    private terminated;
    get isTerminated(): boolean;
    get isIdle(): boolean;
    constructor();
    terminate(force?: boolean): void;
    /**
     * Calls an action in the worker and returns its result.
     * @param action action to call
     * @param parameters parameters to be passed to the action
     * @returns result of action
     */
    private call;
    /**
     * Adds a method to the methods available to the worker. If a method with the given name aready exists, it will be overwritten. Returns true if an overwrite occured.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    overwriteMethod(method: CallableFunction, name: string): Promise<boolean>;
    /**
     * Adds a method to the methods available to the worker. If a method with the given name already exists, the method will not be added. Returns true if the method was added.
     * @param name name of the method
     * @param method function representing method
     * @returns whether the method could be added
     */
    addMethod(method: CallableFunction, name: string): Promise<boolean>;
    /**
     * Removes a method from the worker. Returns true if the method existed, false if not.
     * @param name name of the method
     * @returns whether a method with the given name existed and could be removed
     */
    removeMethod(name: string): Promise<boolean>;
    /**
     * Call a method in the worker.
     * @param name name of the method
     * @param parameters parameters passed to the method (must be serializable)
     * @returns return value of the method
     */
    callMethod<T>(name: string, ...parameters: any[]): Promise<T>;
    private checkTerminated;
}
