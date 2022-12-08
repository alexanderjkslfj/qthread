import { testAll } from "./util.js";
import { Thread } from "../src/index.js";

const testThread = testAll([
    callMethod,
    callMethods,
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

async function callMethods(): Promise<[boolean, number[]]> {
    const thread = new Thread()

    await thread.addMethod((a: number, b: number): number => {
        return a + b
    }, "add")

    const results = await Promise.all<number>([
        thread.callMethod("add", 0, 1),
        thread.callMethod("add", 0, 2),
        thread.callMethod("add", 0, 3)
    ])

    return [
        results[0] === 1 && results[1] === 2 && results[2] === 3,
        results
    ]
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