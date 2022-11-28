import Thread from "./thread.js";
import { randomKey } from "./general.js";
export default class Cluster {
    get isTerminated() {
        return this.terminated;
    }
    checkTerminated() {
        if (this.isTerminated)
            throw "Attempted to access a terminated Cluster.";
    }
    /**
     * Create a cluster running one thread
     */
    constructor() {
        this.threads = [];
        this.methods = new Map();
        this.terminated = false;
        this.threads.push(new Thread());
    }
    get threadCount() {
        return this.threads.length;
    }
    /**
     * Adds a thread to the cluster.
     */
    async addThread() {
        this.checkTerminated();
        const thread = new Thread();
        const promises = [];
        for (const entry of this.methods.entries()) {
            promises.push(thread.addMethod(entry[1], entry[0]));
        }
        await Promise.all(promises);
        this.threads.push(thread);
    }
    /**
     * Removes a thread from the cluster. Prefers idle threads.
     * @param force Removed thread is terminated with force. Not recommended.
     * @returns true if successful, false if no thread to remove exists.
     */
    removeThread(force = false) {
        this.checkTerminated();
        if (this.threads.length === 0)
            return false;
        const index = Math.max(0, this.threads.findIndex((value) => {
            return value.isIdle;
        }));
        this.threads.splice(index, 1)[0].terminate(force);
        return true;
    }
    /**
     * Adds method to cluster if it doesn't exist yet
     * @param method method to add
     * @param name name of the method (random if omitted)
     * @param force if true acts the same way as overwriteMethod (and always returns true)
     * @returns true if successful, false if name already exists
     */
    async addMethod(method, name, force = false) {
        this.checkTerminated();
        const fname = (typeof name === "string") ? name : randomKey(this.methods);
        if (!force && this.methods.has(fname))
            return false;
        this.methods.set(fname, method);
        await this.callAll((thread) => {
            return (force)
                ? thread.overwriteMethod(method, fname)
                : thread.addMethod(method, fname);
        });
        return true;
    }
    /**
     * Adds method to cluster even if it already exists
     * @param method method to add
     * @param name name of the method
     */
    async overwriteMethod(method, name) {
        await this.addMethod(method, name, true);
    }
    /**
     * Removes method from cluster
     * @param name name of the method
     * @returns true if successful, false if method doesn't exist
     */
    async removeMethodByName(name) {
        this.checkTerminated();
        if (!this.methods.has(name))
            return false;
        this.methods.delete(name);
        await this.callAll((thread) => {
            return thread.removeMethod(name);
        });
        return true;
    }
    async removeMethodByMethod(method) {
        this.checkTerminated();
        for (const entry of this.methods.entries()) {
            if (entry[1] === method) {
                return await this.removeMethodByName(entry[0]);
            }
        }
        return false;
    }
    async callMethod(name, ...parameters) {
        this.checkTerminated();
        return this.threads[this.idleOrRandomThread()].callMethod(name, ...parameters);
    }
    idleOrRandomThread() {
        if (this.threads.length === 0)
            return -1;
        let index = this.threads.findIndex((value) => {
            return value.isIdle;
        });
        if (index === -1)
            index = Math.floor(Math.random() * this.threads.length);
        return index;
    }
    /**
     * Executes action for every thread simultaneously.
     * @param action callback to execute for every thread
     * @returns true when all threads have finished or false if a thread threw
     */
    async callAll(action) {
        const promises = [];
        for (const thread of this.threads) {
            promises.push(action(thread));
        }
        return await Promise.all(promises);
    }
    async terminate(force = false) {
        this.checkTerminated();
        for (const thread of this.threads) {
            thread.terminate(force);
        }
        this.threads.length = 0;
        this.methods.clear();
    }
}
