import * as general from "./general.js";
export default function createThreadWorker() {
    return general.inlineWorker(() => {
        // @ts-ignore
        const worker = this;
        const error = Symbol();
        const methods = new Map();
        const actions = new Map();
        actions.set("addMethod", addMethod);
        actions.set("removeMethod", removeMethod);
        actions.set("overwriteMethod", overwriteMethod);
        actions.set("callMethod", callMethod);
        worker.addEventListener("message", async (e) => {
            if (!(e instanceof MessageEvent))
                return;
            if (typeof e.data.action !== "string")
                return;
            respond(e.data.id, await handleData(e.data.action, deserializeAll(...e.data.parameters)));
        }, { passive: true });
        async function handleData(action, parameters) {
            try {
                const method = actions.get(action);
                if (method === undefined)
                    return [error, `Called worker using invalid action: ${action}`];
                return await method(...parameters);
            }
            catch (err) {
                return err;
            }
        }
        /**
         * Returns the response of an action
         * @param id
         * @param data
         */
        function respond(id, data) {
            if (Array.isArray(data) && data[0] === error) {
                worker.postMessage({
                    action: "error",
                    id: id,
                    content: data[1]
                });
            }
            else {
                worker.postMessage({
                    action: "response",
                    id: id,
                    content: serialize(data)
                });
            }
        }
        /**
         * Adds a method to the methods list.
         * @param name name of the method
         * @param method the method (function) to be added
         * @returns whether the method could successfully be added (can always be added except for when a method with the given name already exists)
         */
        function addMethod(name, method) {
            if (methods.has(name))
                return false;
            methods.set(name, method);
            return true;
        }
        function removeMethod(name) {
            return methods.delete(name);
        }
        function overwriteMethod(name, method) {
            const hasMethod = methods.has(name);
            methods.set(name, method);
            return hasMethod;
        }
        async function callMethod(name, ...parameters) {
            const method = methods.get(name);
            if (method === undefined)
                return [error, `Unknown Method: ${name}`];
            return await method(...parameters);
        }
        /**
         * Serialize a value (which may then be stringified).
         */
        function serialize(value) {
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
         * Deserialize a value.
         * @param value the value to be deserialized
         * @returns the deserialized value
         */
        function deserialize(value) {
            return (value.primitive)
                ? value.value
                : str2obj(value.value);
        }
        /**
         * Deserialize all values passed
         * @param values values to be deserialized
         * @returns an array of serialized values
         */
        function deserializeAll(...values) {
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
        function obj2str(object) {
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
        function str2obj(str) {
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
        function str2fun(str) {
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
        function fun2str(fun) {
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
    });
}
