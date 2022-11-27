import { testAll } from "./util.js";
import Cluster from "../src/cluster.js";

const testCluster = testAll([
    threadCount,
    callMethod,
    callMethods,
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

async function callMethods(): Promise<[boolean, number[]]> {
    const cluster = new Cluster()

    await cluster.addThread()

    await cluster.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    const results = await Promise.all([
        await cluster.callMethod<number>("add", 1, 0),
        await cluster.callMethod<number>("add", 1, 1),
        await cluster.callMethod<number>("add", 1, 2)
    ])

    cluster.terminate()

    return [
        (results[0] === 1 && results[1] === 2 && results[2] === 3),
        results
    ]
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