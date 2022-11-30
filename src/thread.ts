import * as general from "./general.js"
import createThreadWorker from "./threadWorker.js"

type Respond = (value: any) => void
type Reject = (value: any) => void

/**
 * Wrapper containing a single Worker.
 */
export default class Thread extends EventTarget {

    private worker: Worker;

    /**
     * The calls actively running in the worker
     */
    private calls: Map<string, [Respond, Reject]> = new Map<string, [Respond, Reject]>()

    /**
     * Whether the worker has been terminated
     */
    private terminated: boolean = false

    /**
     * Whether the worker has been terminated
     */
    get isTerminated(): boolean {
        return this.terminated
    }

    /**
     * Whether the worker is not currently doing anything
     */
    get isIdle(): boolean {
        return (this.calls.size === 0)
    }

    /**
     * Creates a Worker with a useful wrapper.
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
     * Terminates the Thread. No method is allowed to be called after termination.
     * @param force Whether to cancel all running operations. If false, the Worker is kept alive until all operations are finished.
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
     * @param action action to call
     * @param parameters parameters to be passed to the action
     * @returns result of action
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
     * Adds a custom method to the methods available to the Thread. If a method with the given name aready exists, it will be overwritten. Returns true if an overwrite occured.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    public async overwriteMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("overwriteMethod", name, method)
    }

    /**
     * Adds a custom method to the methods available to the Thread. If a method with the given name already exists, the method will not be added. Returns true if the method was added.
     * @param name name of the method
     * @param method function representing method
     * @returns whether the method could be added
     */
    public async addMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("addMethod", name, method)
    }

    /**
     * Removes a custom method from the Thread. Returns true if the method existed, false if not.
     * @param name name of the method
     * @returns whether a method with the given name existed and could be removed
     */
    public async removeMethod(name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("removeMethod", name)
    }

    /**
     * Calls a custom method of the Thread.
     * @param name name of the method
     * @param parameters parameters passed to the method (must be serializable)
     * @returns return value of the method
     */
    public async callMethod<T>(name: string, ...parameters: general.serializable[]): Promise<T> {
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

