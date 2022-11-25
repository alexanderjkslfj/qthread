import { testAll } from "./util";
import Cluster from "../src/cluster";

const testCluster = testAll([
    threadCount,
    callMethod,
    addMethodAfterAddingThread
])

export default testCluster

async function threadCount(): Promise<boolean> {
    const cluster = new Cluster()

    await cluster.addThread()
    await cluster.addThread()
    await cluster.addThread()

    cluster.removeThread()
    cluster.removeThread()

    return cluster.threadCount === 2
}

async function callMethod(): Promise<boolean> {
    const cluster = new Cluster()

    await cluster.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    const result = await cluster.callMethod<number>("add", 1, 2)

    return result === 3
}

async function addMethodAfterAddingThread(): Promise<boolean> {
    const cluster = new Cluster()

    cluster.removeThread()

    const adding = cluster.addThread()

    await cluster.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    await adding

    const result = await cluster.callMethod<number>("add", 1, 2)

    return result === 3
}