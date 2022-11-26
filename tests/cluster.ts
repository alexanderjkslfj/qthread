import { testAll } from "./util.js";
import Cluster from "../src/cluster.js";

const testCluster = testAll([
    threadCount,
    callMethod,
    addMethodAfterAddingThread
])

export default testCluster

async function threadCount(): Promise<[boolean, number]> {
    const cluster = new Cluster()

    await cluster.addThread()
    await cluster.addThread()
    await cluster.addThread()

    cluster.removeThread()
    cluster.removeThread()

    return [cluster.threadCount === 2, cluster.threadCount]
}

async function callMethod(): Promise<[boolean, number]> {
    const cluster = new Cluster()

    await cluster.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    const result = await cluster.callMethod<number>("add", 1, 2)

    return [result === 3, result]
}

async function addMethodAfterAddingThread(): Promise<[boolean, number]> {
    const cluster = new Cluster()

    cluster.removeThread()

    const adding = cluster.addThread()

    await cluster.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    await adding

    const result = await cluster.callMethod<number>("add", 1, 2)

    return [result === 3, result]
}