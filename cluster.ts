import Thread from "./thread";
import { randomKey } from "./util";

export default class Cluster {
    private threads: Thread[] = []
    private methods: Map<string, CallableFunction> = new Map<string, CallableFunction>()
    private terminated: boolean = false

    public get isTerminated(): boolean {
        return this.terminated
    }

    private checkTerminated(): void {
        if (this.isTerminated)
            throw "Attempted to access a terminated Cluster."
    }

    /**
     * Create a cluster running one thread
     */
    public constructor() {
        this.threads.push(new Thread())
    }

    public get threadCount(): number {
        return this.threads.length
    }

    /**
     * Adds a thread to the cluster.
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
     * Removes a thread from the cluster. Prefers idle threads.
     * @param force Removed thread is terminated with force. Not recommended.
     * @returns true if successful, false if no thread to remove exists.
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
     * Adds method to cluster if it doesn't exist yet
     * @param method method to add
     * @param name name of the method (random if omitted)
     * @param force if true acts the same way as overwriteMethod (and always returns true)
     * @returns true if successful, false if name already exists
     */
    public async addMethod(method: CallableFunction, name?: string, force: boolean = false): Promise<boolean> {
        this.checkTerminated()

        const fname = (typeof name === "string") ? name : randomKey(this.methods)

        if (!force && this.methods.has(fname))
            return false

        this.methods.set(fname, method)

        const result = await this.callAll((thread: Thread) => {
            return (force)
                ? thread.overwriteMethod(method, fname)
                : thread.addMethod(method, fname)
        })

        if (result === true)
            return true
        else
            throw result
    }

    /**
     * Adds method to cluster even if it already exists
     * @param method method to add
     * @param name name of the method
     */
    public async overwriteMethod(method: CallableFunction, name: string): Promise<void> {
        await this.addMethod(method, name, true)
    }

    /**
     * Removes method from cluster
     * @param name name of the method
     * @returns true if successful, false if method doesn't exist
     */
    public async removeMethodByName(name: string): Promise<boolean> {
        this.checkTerminated()

        if (!this.methods.has(name))
            return false

        this.methods.delete(name)

        const result = await this.callAll((thread: Thread) => {
            return thread.removeMethod(name)
        })

        if (result === true)
            return true
        else
            throw result
    }

    public async removeMethodByMethod(method: CallableFunction): Promise<boolean> {
        this.checkTerminated()

        for (const entry of this.methods.entries()) {
            if (entry[1] === method) {
                return await this.removeMethodByName(entry[0])
            }
        }
        return false
    }

    /**
     * Executes action for every thread simultaneously.
     * @param action callback to execute for every thread
     * @returns true when all threads have finished or false if a thread threw
     */
    private async callAll<T>(action: (thread: Thread) => Promise<any>): Promise<boolean | Error> {
        const promises: Promise<any>[] = []

        for (const thread of this.threads) {
            promises.push(action(thread))
        }

        try {
            await Promise.all(promises)
        } catch (err) {
            return err
        } finally {
            return true
        }
    }

    public async terminate(force: boolean = false) {
        this.checkTerminated()
        
        for (const thread of this.threads) {
            thread.terminate(force)
        }
        this.threads.length = 0
        this.methods.clear()
    }
}