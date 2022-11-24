/**
 * Execute the code contained in the passed function from inside a worker.
 * @param script the function to be executed; must be a pure function
 * @returns the worker
 */
 export function inlineWorker(script: CallableFunction | string): Worker {
    if (script instanceof Function)
        script = fun2str(script)

    const burl = URL.createObjectURL(new Blob([
        `(${script})()`
    ], { type: 'application/javascript' }));

    const worker = new Worker(burl);

    URL.revokeObjectURL(burl);

    return worker;
}

/**
 * Properly convert a function object back to text form
 * @param fun the function to convert
 * @returns the function in text form
 */
export function fun2str(fun: CallableFunction): string {
    const name: string = (typeof fun.name === "string") ? fun.name : "";

    let funstr = fun.toString();

    const prefixcheck = funstr.trim();
    if (!(prefixcheck.charAt(0) === "(" || prefixcheck.substring(0, 6) === "async " || prefixcheck.substring(0, 9) === "function " || prefixcheck.substring(0, 9) === "function(")) {
        funstr = "function " + funstr;
    }

    const checkfun = funstr.replace(/\s/g, '');

    let funstrnamed: string;
    if ((checkfun.substring(0, 14) === "asyncfunction(" || checkfun.substring(0, 9) === "function(")) {
        let pos = 0;
        while (funstr.charAt(pos) !== "(") {
            pos++;
        }
        funstrnamed = `${funstr.slice(0, pos)} ${name}${funstr.slice(pos)}`;
    } else {
        funstrnamed = funstr;
    }

    return funstrnamed;
}

type serialized = { primitive: true, value: string | number | symbol | boolean } | { primitive: false, value: string }

export function serialize(value: any): serialized {
    if (["object", "function"].includes(typeof value)) {
        return {
            primitive: false,
            value: obj2str(value),
        }
    } else {
        return {
            primitive: true,
            value: value,
        }
    }

}

export function serializeAll(...values: any[]): serialized[] {
    const v: serialized[] = [];
    for (const value of values) {
        v.push(serialize(value));
    }
    return v;
}

export type stringifiedObject = [string, { key: string, value: string, type: number }[]]

export function obj2str(object: object): string {
    const objects: [object, stringifiedObject][] = [];

    obj2str(object);

    function obj2str(object: object): number | string {
        if (object === null) {
            return "null";
        }

        for (let i = 0; i < objects.length; i++) {
            if (objects[i][0] === object) {
                return i;
            }
        }

        const str: stringifiedObject = [(typeof object === "function") ? fun2str(object) : "", []]
        const index = objects.length;

        objects.push([object, str]);

        for (const key in object) {
            const type = typeof object[key];
            str[1].push({
                key,
                value: (["function", "object"].includes(type)) ? obj2str(object[key]) : object[key],
                type: (["function", "object"].includes(type)) ? 1 : 0
            });
        }

        return index;
    }

    const raw: stringifiedObject[] = [];
    for (const e of objects) {
        raw.push(e[1]);
    }

    return JSON.stringify(raw);
}

export function str2obj(str: string): any {
    const input = JSON.parse(str);

    const objects: any[] = [];
    for (const object of input) {
        objects.push((object[0] === "")
            ? {}
            : str2fun(object[0]));
    }

    for (let i = 0; i < input.length; i++) {
        for (const val of input[i][1]) {
            objects[i][val.key] = (val.type === 0)
                ? val.value
                : objects[val.value]
        }
    }

    return objects[0];
}

export function str2fun(str: string): CallableFunction | null {
    try {
        let a: CallableFunction;
        const addfun = function (fun: CallableFunction) {
            a = fun;
        }
        eval(`addfun(${str})`);
        a!.prototype = undefined;
        return a!;
    } catch {
        return null;
    }
}