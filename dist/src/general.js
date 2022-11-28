/**
 * Execute the code contained in the passed function from inside a worker.
 * @param script the function to be executed; must be a pure function
 * @returns the worker
 */
export function inlineWorker(script) {
    if (script instanceof Function)
        script = fun2str(script);
    const burl = URL.createObjectURL(new Blob([
        `(${script})()`
    ], { type: 'application/javascript' }));
    const worker = new Worker(burl);
    URL.revokeObjectURL(burl);
    return worker;
}
/**
 * Serialize a value (which may then be stringified).
 */
export function serialize(value) {
    if (value !== null && typeof value === "object" || typeof value === "function") {
        return {
            primitive: false,
            value: obj2str(value),
        };
    }
    else {
        return {
            primitive: true,
            value: value,
        };
    }
}
/**
 * Serialize all values passed.
 * @param values values to be serialized
 * @returns an array of serialized values
 */
export function serializeAll(...values) {
    const results = [];
    for (const value of values) {
        results.push(serialize(value));
    }
    return results;
}
/**
 * Deserialize a value.
 * @param value the value to be deserialized
 * @returns the deserialized value
 */
export function deserialize(value) {
    return (value.primitive)
        ? value.value
        : str2obj(value.value);
}
/**
 * Deserialize all values passed
 * @param values values to be deserialized
 * @returns an array of serialized values
 */
export function deserializeAll(...values) {
    const results = [];
    for (const value of values) {
        results.push(deserialize(value));
    }
    return results;
}
/**
 * Properly stringify an object. (Preserves cyclic object values and doesn't add unnecessary duplication.)
 * @param object
 * @returns
 */
export function obj2str(object) {
    const objects = [];
    obj2str(object);
    function obj2str(object) {
        if (object === null) {
            return "null";
        }
        for (let i = 0; i < objects.length; i++) {
            if (objects[i][0] === object) {
                return i;
            }
        }
        const str = [(typeof object === "function") ? fun2str(object) : "", []];
        const index = objects.length;
        objects.push([object, str]);
        for (const [key, value] of Object.entries(object)) {
            const type = typeof value;
            str[1].push({
                key,
                value: (["function", "object"].includes(type)) ? obj2str(value) : value,
                type: (["function", "object"].includes(type)) ? 1 : 0
            });
        }
        return index;
    }
    const raw = [];
    for (const e of objects) {
        raw.push(e[1]);
    }
    return JSON.stringify(raw);
}
/**
 * Parse a string created using obj2str
 * @param str the string to parse
 * @returns an object
 */
export function str2obj(str) {
    const input = JSON.parse(str);
    const objects = [];
    for (const object of input) {
        objects.push((object[0] === "")
            ? {}
            : str2fun(object[0]));
    }
    for (let i = 0; i < input.length; i++) {
        for (const val of input[i][1]) {
            objects[i][val.key] = (val.type === 0)
                ? val.value
                : objects[val.value];
        }
    }
    return objects[0];
}
/**
 * Convert a stringified funcion to a function, preserving its name and not adding unnecessary closure.
 * @param str the stringified function
 * @returns a function
 */
export function str2fun(str) {
    try {
        let a;
        const addfun = function (fun) {
            a = fun;
        };
        eval(`addfun(${str})`);
        a.prototype = undefined;
        return a;
    }
    catch {
        return null;
    }
}
/**
 * Properly stringify a function. (Preserves name.)
 * @param fun the function to stringify
 * @returns the stringified function
 */
export function fun2str(fun) {
    const name = (typeof fun.name === "string") ? fun.name : "";
    let funstr = fun.toString();
    const prefixcheck = funstr.trim();
    if (!(prefixcheck.charAt(0) === "(" || prefixcheck.substring(0, 6) === "async " || prefixcheck.substring(0, 9) === "function " || prefixcheck.substring(0, 9) === "function(")) {
        funstr = "function " + funstr;
    }
    const checkfun = funstr.replace(/\s/g, '');
    let funstrnamed;
    if ((checkfun.substring(0, 14) === "asyncfunction(" || checkfun.substring(0, 9) === "function(")) {
        let pos = 0;
        while (funstr.charAt(pos) !== "(") {
            pos++;
        }
        funstrnamed = `${funstr.slice(0, pos)} ${name}${funstr.slice(pos)}`;
    }
    else {
        funstrnamed = funstr;
    }
    return funstrnamed;
}
/**
 * Create a random string of the passed length (using only the letters a-z).
 * @param length the length of the string
 * @returns a random string
 */
function randomString(length) {
    let str = "";
    for (let i = 0; i < length; i++) {
        str += randomLetter();
    }
    return str;
}
/**
 * Create a random letter (a-z).
 * @returns a random letter
 */
function randomLetter() {
    return (Math.floor(Math.random() * 26) + 10).toString(36);
}
/**
 * Create a key for a map that is not yet present in the map.
 * @param map the map to create a key for
 * @returns a new key for the map
 */
export function randomKey(map) {
    let key;
    do {
        key = randomString(8);
    } while (map.has(key));
    return key;
}
