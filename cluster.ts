import Thread from "./thread";

export default class Cluster {
    // [Thread, isAvailable][]
    private threads: Thread[] = []
    private methods: { [name: string]: CallableFunction }

    constructor() {
        this.addThread()
    }
    
    get threadCount(): number {
        return this.threads.length
    }

    set threadCount(count: number) {
        while(count > this.threads.length)
            this.addThread()
        while(count < this.threads.length)
            this.removeThread()
    }

    public addThread() {
        this.threads.push(new Thread())
    }

    public removeThread() {
        if(this.threads.length === 1)
            throw ""

        const index = Math.max(0, this.threads.findIndex((value: Thread) => {
            return value.isIdle
        }))

        this.threads.splice(index, 1)[0].terminate(false)
    }
}