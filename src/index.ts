import * as general from "./general.js"
import Thread from "./thread.js";
import Cluster from "./cluster.js";

const inlineWorker = general.inlineWorker
const serialize = general.serialize
const serializeAll = general.serializeAll
const deserialize = general.deserialize
const deserializeAll = general.deserializeAll
const obj2str = general.obj2str
const str2obj = general.str2obj

type serializable = general.serializable
type serialized = general.serialized

export {
    Thread,
    Cluster,
    inlineWorker,
    serialize,
    serializeAll,
    deserialize,
    deserializeAll,
    obj2str,
    str2obj,
    serializable,
    serialized
}