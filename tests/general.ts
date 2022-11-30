import { testAll } from "./util.js";
import { serialize, deserialize, str2obj, obj2str, inlineWorker } from "../src/index.js"

const testGeneral = testAll([
    serializeDeserializePrimitives,
    serializeDeserializeObject,
    stringifyParseFunction,
    inlineWorkerEcho
])

export default testGeneral

async function serializeDeserializePrimitives(): Promise<[boolean, [any, any][]]> {
    const a = "Hello World"
    const ac = deserialize(serialize(a))

    const b = 12345
    const bc = deserialize(serialize(b))

    const c = false
    const cc = deserialize(serialize(c))

    const d = null
    const dc = deserialize(serialize(d))

    return [
        (
            (a === ac)
            && (b === bc)
            && (c === cc)
            && (d === dc)
        ),
        [
            [a, ac],
            [b, bc],
            [c, cc],
            [d, dc]
        ]
    ]
}

async function serializeDeserializeObject(): Promise<[boolean, [object, any]]> {
    const a = {
        b: {
            c: {
                d: {},
                num: 3
            }
        }
    }

    const d = {
        c: a.b.c
    }

    a.b.c.d = d

    const aclone = deserialize<any>(serialize(a))

    return [((a.b.c.num === aclone.b.c.num) && (aclone.b.c.d.c.d.c === aclone.b.c)), [a, aclone]]
}

async function stringifyParseFunction(): Promise<[boolean, [CallableFunction, CallableFunction][]]> {
    function a(x: number): number {
        return x + 1
    }

    const b = function (x: number): number {
        return x + 1
    }

    const c = (x: number): number => {
        return x + 1
    }

    const newa = str2obj<typeof a>(obj2str(a))
    const newb = str2obj<typeof b>(obj2str(b))
    const newc = str2obj<typeof c>(obj2str(c))

    const resulta = newa(1)
    const resultb = newb(2)
    const resultc = newc(3)

    return [
        (resulta === 2 && resultb === 3 && resultc === 4),
        [[a, newa], [b, newb], [c, newc]]
    ]
}

function inlineWorkerEcho(): Promise<[boolean, [number, any]]> {
    return new Promise(res => {
        const worker = inlineWorker(function () {
            // @ts-ignore
            const window = this

            window.addEventListener("message", (e: any) => {
                window.postMessage(e.data)
            })
        })

        worker.addEventListener("message", e => {
            res([e.data === 5, [5, e.data]])
            worker.terminate()
        })

        worker.postMessage(5)
    })
}