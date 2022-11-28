import { testAll } from "./util.js";
import Thread from "../src/thread.js";

const testThread = testAll([
    callMethod,
    checkSerialization
])

export default testThread

async function callMethod(): Promise<[boolean, number]> {
    const thread = new Thread()

    await thread.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    const result: number = await thread.callMethod("add", 1, 2)

    return [result === 3, result]
}

async function checkSerialization(): Promise<[boolean, [any, any]]> {
    const thread = new Thread()

    await thread.addMethod((object: object) => {
        return object
    }, "echo")

    const object: { object: any, value: number } = {
        object: null,
        value: 5
    }

    object.object = object

    const clone = await thread.callMethod<any>("echo", object)

    return [object.object.value === clone?.object?.value, [object, clone]]
}