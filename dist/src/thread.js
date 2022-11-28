import * as general from "./general.js";
import createThreadWorker from "./threadWorker.js";
export default class Thread extends EventTarget {
    get isTerminated() {
        return this.terminated;
    }
    get isIdle() {
        return (this.calls.size === 0);
    }
    constructor() {
        super();
        this.calls = new Map();
        this.terminated = false;
        const thread = this;
        this.worker = createThreadWorker();
        this.worker.addEventListener("message", e => {
            switch (e.data.action) {
                case "response": {
                    handleResponse(e.data.id, e.data.content, false);
                    break;
                }
                case "error": {
                    handleResponse(e.data.id, e.data.content, true);
                    break;
                }
                default: {
                    console.error("Worker sent unknown message.");
                }
            }
        }, { passive: true });
        function handleResponse(id, content, error = false) {
            // get callback
            const callbacks = thread.calls.get(id);
            // proceed only if callback exists
            if (callbacks !== undefined) {
                // remove callback from callback list
                thread.calls.delete(id);
                // if the worker is to be terminated and there are no more callbacks
                if (thread.terminated && thread.isIdle)
                    // terminate worker
                    thread.worker.terminate();
                // execute callback
                if (error)
                    callbacks[1](content);
                else
                    callbacks[0](general.deserialize(content));
            }
        }
    }
    terminate(force = false) {
        this.terminated = true;
        if (force) {
            this.worker.terminate();
            this.calls.forEach(([res, rej]) => {
                rej(new Error("Worker has been terminated before function finished executing."));
            });
            this.calls.clear();
        }
        else if (this.isIdle) {
            this.worker.terminate();
        }
    }
    /**
     * Calls an action in the worker and returns its result.
     * @param action action to call
     * @param parameters parameters to be passed to the action
     * @returns result of action
     */
    call(action, ...parameters) {
        return new Promise((res, rej) => {
            const id = general.randomKey(this.calls);
            this.calls.set(id, [res, rej]);
            this.worker.postMessage({
                action: action,
                id: id,
                parameters: general.serializeAll(...parameters)
            });
        });
    }
    /**
     * Adds a method to the methods available to the worker. If a method with the given name aready exists, it will be overwritten. Returns true if an overwrite occured.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    async overwriteMethod(method, name) {
        this.checkTerminated();
        return await this.call("overwriteMethod", name, method);
    }
    /**
     * Adds a method to the methods available to the worker. If a method with the given name already exists, the method will not be added. Returns true if the method was added.
     * @param name name of the method
     * @param method function representing method
     * @returns whether the method could be added
     */
    async addMethod(method, name) {
        this.checkTerminated();
        return await this.call("addMethod", name, method);
    }
    /**
     * Removes a method from the worker. Returns true if the method existed, false if not.
     * @param name name of the method
     * @returns whether a method with the given name existed and could be removed
     */
    async removeMethod(name) {
        this.checkTerminated();
        return await this.call("removeMethod", name);
    }
    /**
     * Call a method in the worker.
     * @param name name of the method
     * @param parameters parameters passed to the method (must be serializable)
     * @returns return value of the method
     */
    async callMethod(name, ...parameters) {
        this.checkTerminated();
        return await this.call("callMethod", name, ...parameters);
    }
    checkTerminated() {
        if (this.isTerminated)
            throw "Attempted to access a terminated Thread.";
    }
}
