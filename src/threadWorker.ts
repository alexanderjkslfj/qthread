import * as general from "./general.js"

export default function createThreadWorker(): Worker {
    return general.inlineWorker(() => {

        // @ts-ignore
        const worker: Window = this

        const methods: { [name: string]: CallableFunction } = {}
        const actions: { [name: string]: CallableFunction } = {
            "addMethod": addMethod,
            "removeMethod": removeMethod,
            "overwriteMethod": overwriteMethod,
            "callMethod": callMethod
        }

        worker.addEventListener("message", async (e: MessageEvent) => {
            if (!(e instanceof MessageEvent)) return
            if (typeof e.data.action !== "string") return
            respond(e.data.id, await handleData(e.data.action, deserializeAll(...e.data.parameters)))
        }, { passive: true })

        async function handleData(action: string, parameters: unknown[]): Promise<any> {
            try {
                if (!(action in actions))
                    return new Error(`Called worker using invalid action: ${action}`)

                return await actions[action](...parameters)
            } catch (err) {
                return err
            }
        }

        /**
         * Returns the response of an action
         * @param id 
         * @param data 
         */
        function respond(id: string, data: any): void {
            worker.postMessage({
                action: "response",
                id: id,
                content: serialize(data)
            })
        }

        function obj2str(object: object): string {
            const objects: [object, general.stringifiedObject][] = [];

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

                const str: general.stringifiedObject = [(typeof object === "function") ? fun2str(object) : "", []]
                const index = objects.length;

                objects.push([object, str]);

                for (const key in object) {
                    // @ts-ignore
                    const type = typeof object[key];
                    str[1].push({
                        key,
                        // @ts-ignore
                        value: (["function", "object"].includes(type)) ? obj2str(object[key]) : object[key],
                        type: (["function", "object"].includes(type)) ? 1 : 0
                    });
                }

                return index;
            }

            const raw: general.stringifiedObject[] = [];
            for (const e of objects) {
                raw.push(e[1]);
            }

            return JSON.stringify(raw);
        }

        type serialized = { primitive: true, value: string | number | symbol | boolean } | { primitive: false, value: string }

        function serialize(value: any): serialized {
            if (value !== null && ["object", "function"].includes(typeof value)) {
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

        function deserialize(value: serialized) {
            return (value.primitive)
                ? value.value
                : str2obj(value.value)
        }

        function deserializeAll(...values: serialized[]): any[] {
            const results: any[] = []
            for (const value of values) {
                results.push(deserialize(value))
            }
            return results
        }

        function str2obj(str: string): any {
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

        function str2fun(str: string): CallableFunction | null {
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

        function fun2str(fun: CallableFunction): string {
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

        /**
         * Adds a method to the methods list.
         * @param name name of the method
         * @param method the method (function) to be added
         * @returns whether the method could successfully be added (can always be added except for when a method with the given name already exists)
         */
        function addMethod(name: string, method: CallableFunction): boolean {
            if (name in methods) return false
            methods[name] = method
            return true
        }

        function removeMethod(name: string): boolean {
            if (name in methods) {
                delete methods[name]
                return true
            }
            return false
        }

        function overwriteMethod(name: string, method: CallableFunction): boolean {
            if (name in methods) {
                methods[name] = method
                return true
            }
            return false
        }

        async function callMethod(name: string, ...parameters: any[]): Promise<any> {
            if (!(name in methods))
                return new Error(`Unknown Method: ${name}`)

            return await methods[name](...parameters)
        }
    })
}