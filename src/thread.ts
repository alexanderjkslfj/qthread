import * as general from "./general.js"
import createThreadWorker from "./threadWorker.js"

type Respond = (value: any) => void
type Reject = (value: any) => void

export default class Thread extends EventTarget {

    private worker: Worker;
    private calls: Map<string, [Respond, Reject]> = new Map<string, [Respond, Reject]>()
    private terminated: boolean = false

    get isTerminated(): boolean {
        return this.terminated
    }

    get isIdle(): boolean {
        return (this.calls.size === 0)
    }

    constructor() {
        super()

        const thread = this

        this.worker = createThreadWorker()

        this.worker.addEventListener("message", e => {
            switch (e.data.action) {
                case "response": {
                    handleResponse(e.data.id, e.data.content)
                    break
                }
                default: {
                    console.error("Worker sent unknown message.")
                }
            }
        }, { passive: true })

        function handleResponse(id: string, content: general.serialized) {
            // get callback
            const callback = thread.calls.get(id)?.[0]

            // proceed only if callback exists
            if (callback !== undefined) {

                // remove callback from callback list
                thread.calls.delete(id)

                // if the worker is to be terminated and there are no more callbacks
                if (thread.terminated && thread.isIdle)
                    // terminate worker
                    thread.worker.terminate()

                // execute callback
                callback(general.deserialize(content))

            }
        }
    }

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
    private call<T>(action: string, ...parameters: unknown[]): Promise<T> {
        return new Promise((res, rej) => {
            const id = general.randomKey(this.calls)

            this.calls.set(id, [res, rej])

            this.worker.postMessage({
                action: action,
                id: id,
                parameters: general.serializeAll(parameters)
            })
        })
    }

    /**
     * Adds a method to the methods available to the worker. If a method with the given name aready exists, it will be overwritten. Returns true if an overwrite occured.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    public async overwriteMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("overwriteMethod", name, method)
    }

    /**
     * Adds a method to the methods available to the worker. If a method with the given name already exists, the method will not be added. Returns true if the method was added.
     * @param name name of the method
     * @param method function representing method
     * @returns whether the method could be added
     */
    public async addMethod(method: CallableFunction, name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("addMethod", name, method)
    }

    /**
     * Removes a method from the worker. Returns true if the method existed, false if not.
     * @param name name of the method
     * @returns whether a method with the given name existed and could be removed
     */
    public async removeMethod(name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("removeMethod", name)
    }

    /**
     * Call a method in the worker.
     * @param name name of the method
     * @param parameters parameters passed to the method (must be serializable)
     * @returns return value of the method
     */
    public async callMethod<T>(name: string, ...parameters: any[]): Promise<T> {
        this.checkTerminated()
        return await this.call<T>("callMethod", name, ...parameters)
    }

    private checkTerminated(): void {
        if (this.isTerminated)
            throw "Attempted to access a terminated Thread."
    }
}

