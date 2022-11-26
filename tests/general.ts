import { testAll } from "./util.js";

import * as general from "../src/general.js"

const testGeneral = testAll([
    serializeDeserializePrimitives,
    serializeDeserializeObject
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

    const aclone = general.deserialize(general.serialize(a))

    return [((a.b.c.num === aclone.b.c.num) && (aclone.b.c.d.c.d.c === aclone.b.c)), [a, aclone]]
}