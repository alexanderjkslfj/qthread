import { testAll } from "./util.js";

import * as general from "../src/general.js"

const testGeneral = testAll([
    serializeDeserializePrimitives,
    serializeDeserializeObject,
    stringifyParseFunction,
    inlineWorker
])

export default testGeneral

async function serializeDeserializePrimitives(): Promise<[boolean, [any, any][]]> {
    const a = "Hello World"
    const ac = general.deserialize(general.serialize(a))

    const b = 12345
    const bc = general.deserialize(general.serialize(b))

    const c = false
    const cc = general.deserialize(general.serialize(c))

    const d = null
    const dc = general.deserialize(general.serialize(d))

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

    const aclone = general.deserialize<any>(general.serialize(a))

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

    const newa = general.str2obj<typeof a>(general.obj2str(a))
    const newb = general.str2obj<typeof b>(general.obj2str(b))
    const newc = general.str2obj<typeof c>(general.obj2str(c))

    const resulta = newa(1)
    const resultb = newb(2)
    const resultc = newc(3)

    return [
        (resulta === 2 && resultb === 3 && resultc === 4),
        [[a, newa], [b, newb], [c, newc]]
    ]
}

function inlineWorker(): Promise<[boolean, [number, any]]> {
    return new Promise(res => {
        const worker = general.inlineWorker(function () {
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