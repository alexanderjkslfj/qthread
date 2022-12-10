import Thread from "./thread.js";
import { randomKey, serializable } from "./general.js";

export default class Cluster {
    /**
     * the Threads managed by the Cluster
     */
    private threads: Thread[] = []

    /**
     * all custom methods of the Cluster's Threads
     */
    private methods: Map<string, CallableFunction> = new Map<string, CallableFunction>()

    /**
     * whether the Cluster has been terminated
     */
    private terminated: boolean = false

    /**
     * Checks whether the Cluster has been terminated.
     */
    public get isTerminated(): boolean {
        return this.terminated
    }

    /**
     * Throws an error if the Cluster has been terminated.
     */
    private checkTerminated(): void {
        if (this.isTerminated)
            throw "Attempted to access a terminated Cluster."
    }

    /**
     * Creates a new Cluster (which includes a new Thread).
     */
    public constructor() {
        this.threads.push(new Thread())
    }

    /**
     * Gets the amount of Threads managed by the Cluster.
     */
    public get threadCount(): number {
        return this.threads.length
    }

    /**
     * Adds a Thread to the Cluster.
     */
    public async addThread(): Promise<void> {
        this.checkTerminated()

        const thread = new Thread()

        const promises: Promise<any>[] = []

        for (const entry of this.methods.entries()) {
            promises.push(thread.addMethod(entry[1], entry[0]))
        }

        await Promise.all(promises)

        this.threads.push(thread)
    }

    /**
     * Removes a Thread from the Cluster. Prioritizes idle Threads.
     * @param force Removed Thread is forcefully terminated. Not recommended.
     * @returns Whether a Thread was successfully removed (false if the Cluster owns no Threads).
     */
    public removeThread(force: boolean = false): boolean {
        this.checkTerminated()

        if (this.threads.length === 0)
            return false

        const index = Math.max(0, this.threads.findIndex((value: Thread) => {
            return value.isIdle
        }))

        this.threads.splice(index, 1)[0].terminate(force)

        return true
    }

    /**
     * Adds a method to Cluster. This method can later be called.
     * @param method Method to be added. Must be pure.
     * @param name Name of the method. Used later to call the method.
     * @param force Whether to overwrite if a method with the same name already exists.
     * @returns Whether the method was added.
     */
    public async addMethod(method: CallableFunction, name?: string, force: boolean = false): Promise<boolean> {
        this.checkTerminated()

        const fname = (typeof name === "string") ? name : randomKey(this.methods)

        if (!force && this.methods.has(fname))
            return false

        this.methods.set(fname, method)

        await this.callAll((thread: Thread) => {
            return (force)
                ? thread.overwriteMethod(method, fname)
                : thread.addMethod(method, fname)
        })

        return true
    }

    /**
     * Same as addMethod with force set to true.
     * @param method Method to be added. Must be pure.
     * @param name Name of the method. Used later to call the method.
     * @deprecated Use addMethod with force set to true instead.
     */
    public async overwriteMethod(method: CallableFunction, name: string): Promise<true> {
        await this.addMethod(method, name, true)
        return true
    }

    /**
     * Removes a method from the Cluster.
     * @param name Name of the method.
     * @returns Whether a method with the given name existed.
     */
    private async removeMethodByName(name: string): Promise<boolean> {
        this.checkTerminated()

        if (!this.methods.has(name))
            return false

        this.methods.delete(name)

        await this.callAll((thread: Thread) => {
            return thread.removeMethod(name)
        })

        return true
    }

    /**
     * Removes a method from the Cluster.
     * @param method Function of the method.
     * @returns Whether a method with the given function existed.
     */
    private async removeMethodByMethod(method: CallableFunction): Promise<boolean> {
        this.checkTerminated()

        for (const entry of this.methods.entries()) {
            if (entry[1] === method) {
                return await this.removeMethodByName(entry[0])
            }
        }
        return false
    }

    /**
     * Removes a method from the Cluster.
     * @param identifier Name or function of the method.
     * @returns Whether a method with the given name or function existed.
     */
    public async removeMethod(identifier: string | CallableFunction): Promise<boolean> {
        this.checkTerminated()

        switch(typeof identifier) {
            case "string":
                return await this.removeMethodByName(identifier)
            case "function":
                return await this.removeMethodByMethod(identifier)
            default: {
                console.error("Invalid identifier passed to Cluster.removeMethod:", identifier)
                return false
            }
        }
    }

    /**
     * Calls a method from the Cluster.
     * @param name Name of the method called.
     * @param parameters Parameters passed to the method. Must be serializable.
     * @returns The return value of the method called.
     */
    public async callMethod<T extends serializable>(name: string, ...parameters: serializable[]): Promise<T> {
        this.checkTerminated()

        return this.threads[this.idleOrRandomThread()].callMethod<T>(name, ...parameters)
    }

    /**
     * Gets the index of an idle Thread.
     * If no idle Thread exists, returns a random index.
     */
    private idleOrRandomThread(): number {
        if (this.threads.length === 0)
            return -1

        let index = this.threads.findIndex((value: Thread) => {
            return value.isIdle
        })

        if (index === -1)
            index = Math.floor(Math.random() * this.threads.length)

        return index
    }

    /**
     * Executes the action for every thread simultaneously.
     * @param action The callback to execute on every thread.
     * @returns Whether no Thread threw an error.
     */
    private async callAll<T>(action: (thread: Thread) => Promise<T>): Promise<T[]> {
        const promises: Promise<T>[] = []

        for (const thread of this.threads) {
            promises.push(action(thread))
        }

        return await Promise.all(promises)
    }

    /**
     * Terminates the Cluster (and the underlying Threads). No method is allowed to be called after termination. This may be necessary to prevent memory leaks.
     * @param force Whether to force cancel all running calls. If false, all running calls will finish before their respecive workers are actually terminated.
     */
    public terminate(force: boolean = false) {
        this.checkTerminated()

        for (const thread of this.threads) {
            thread.terminate(force)
        }
        this.threads.length = 0
        this.methods.clear()
    }
}