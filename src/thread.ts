import * as general from "./general.js"
import createThreadWorker from "./threadWorker.js"

type Respond = (value: any) => void
type Reject = (value: any) => void

/**
 * Wrapper containing a single Worker.
 */
export default class Thread extends EventTarget {
    /**
     * the worker managed by the Thread
     */
    private worker: Worker;

    /**
     * the calls actively running in the worker
     */
    private calls: Map<string, [Respond, Reject]> = new Map<string, [Respond, Reject]>()

    /**
     * whether the worker has been terminated
     */
    private terminated: boolean = false

    /**
     * Checks whether the Worker has been terminated.
     */
    public get isTerminated(): boolean {
        return this.terminated
    }

    /**
     * Checks whether the Thread is not currently doing anything.
     */
    public get isIdle(): boolean {
        return (this.calls.size === 0)
    }

    /**
     * Creates a new Thread (which includes a new worker).
     */
    constructor() {
        super()

        const thread = this

        this.worker = createThreadWorker()

        this.worker.addEventListener("message", e => {
            switch (e.data.action) {
                case "response": { // a called Worker method successfully returned a value
                    handleResponse(e.data.id, e.data.content, false)
                    break
                }
                case "error": { // a called Worker method (or the call itself) threw an error
                    handleResponse(e.data.id, e.data.content, true)
                    break
                }
                default: {
                    console.error("Worker sent unknown message.")
                }
            }
        }, { passive: true })

        /**
         * Handles a response of the Worker to a call.
         * @param id the call id (referenced in the calls map)
         * @param content the return value of the call - (if it's an error it's a simple string, else it is serialized)
         * @param error whether the return value is an error
         */
        function handleResponse(id: string, content: general.serialized, error: boolean = false) {
            // get callback
            const callbacks = thread.calls.get(id)

            // proceed only if callback exists
            if (callbacks !== undefined) {

                // remove callback from callback list
                thread.calls.delete(id)

                // if the worker is to be terminated and there are no more callbacks
                if (thread.terminated && thread.isIdle)
                    // terminate worker
                    thread.worker.terminate()

                // execute callback
                if (error)
                    callbacks[1](content)
                else
                    callbacks[0](general.deserialize(content))

            }
        }
    }

    /**
     * Terminates the Thread (and the underlying worker). No method is allowed to be called after termination. This may be necessary to prevent memory leaks.
     * @param force Whether to force cancel all running calls. If false, all running calls will finish before the worker is actually terminated.
     */
    public terminate(force: boolean = false): void {
        this.terminated = true
        if (force) {
            this.worker.terminate()
            this.calls.forEach(([res, rej]) => {
                rej(new Error("Worker has been terminated before function finished executing."))
            })
            this.calls.clear()
        } else if (this.isIdle) {
            this.worker.terminate()
        }
    }

    /**
     * Calls an action in the worker and returns its result.
     * @param action Action to call.
     * @param parameters Parameters to be passed to the action. Must be serializable.
     * @returns Result of the action.
     */
    private call<T>(action: string, ...parameters: general.serializable[]): Promise<T> {
        return new Promise((res, rej) => {
            const id = general.randomKey(this.calls)

            this.calls.set(id, [res, rej])

            this.worker.postMessage({
                action: action,
                id: id,
                parameters: general.serializeAll(...parameters)
            })
        })
    }

    /**
     * Adds a method to the Thread. This method can later be called. If a method with the given name already exists, it will be overwritten.
     * @param method Method to be added. Must be pure.
     * @param name Name of the method. Used later to call the method.
     * @returns Whether a method with the given name already existed.
     */
    public async overwriteMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("overwriteMethod", name, method)
    }

    /**
     * Adds a method to the Thread. This method can later be called. If a method with the given name already exists, the method will not be added.
     * @param name Name of the method. Used later to call the method.
     * @param method Method to be added. Must be pure.
     * @returns Whether the method was added.
     */
    public async addMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("addMethod", name, method)
    }

    /**
     * Removes a method from the Thread.
     * @param name Name of the method.
     * @returns Whether a method with the given name existed.
     */
    public async removeMethod(name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("removeMethod", name)
    }

    /**
     * Calls a method from the Thread.
     * @param name Name of the method called.
     * @param parameters Parameters passed to the method. Must be serializable.
     * @returns The return value of the method called.
     */
    public async callMethod<T extends general.serializable>(name: string, ...parameters: general.serializable[]): Promise<T> {
        this.checkTerminated()
        return await this.call<T>("callMethod", name, ...parameters)
    }

    /**
     * Throws an error if Thread has been terminated.
     */
    private checkTerminated(): void {
        if (this.isTerminated)
            throw "Attempted to access a terminated Thread."
    }
}

