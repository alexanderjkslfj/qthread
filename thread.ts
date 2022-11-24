import * as general from "./general"

export default class Thread extends EventTarget {

    private worker: Worker;
    private calls: { [id: string]: (value: any) => void } = {}
    private terminated: boolean = false

    get isTerminated(): boolean {
        return this.terminated
    }

    get isIdle(): boolean {
        return Object.keys(this.calls).length === 0
    }

    constructor() {
        super()

        this.worker = general.inlineWorker(() => {

            const methods: { [name: string]: CallableFunction } = {}
            const actions: { [name: string]: CallableFunction } = {
                "addMethod": addMethod,
                "removeMethod": removeMethod,
                "overwriteMethod": overwriteMethod,
                "callMethod": callMethod
            }

            this.addEventListener("message", async e => {
                if (!(e instanceof MessageEvent)) return
                if (typeof e.data.action !== "string") return
                respond(e.data.id, await handleData(e.data.action, e.data.parameters))
            }, { passive: true })

            async function handleData(action: string, parameters: any[]): Promise<any> {
                try {
                    if (!(action in actions))
                        return new Error(`Called worker using invalid action: ${action}`)

                    return await actions[action](...parameters.map(value => str2obj(value)))
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
                this.postMessage({
                    action: "response",
                    id: id,
                    content: obj2str(data)
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
                        const type = typeof object[key];
                        str[1].push({
                            key,
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

        this.worker.addEventListener("message", e => {
            switch (e.data.action) {
                case "response": {
                    if (e.data.id in this.calls) {
                        // get callback
                        const callback = this.calls[e.data.id]
                        // remove callback from callback list
                        delete this.calls[e.data.id]
                        // if the worker is to be terminated and there are no more callbacks
                        if (this.terminated && Object.keys(this.calls).length === 0)
                            // terminate worker
                            this.worker.terminate()
                        // execute callback
                        callback(general.str2obj(e.data.content))
                    }
                }
            }
        }, { passive: true })
    }

    public terminate(force: boolean = false) {
        this.terminated = true
        if (force) {
            this.worker.terminate()
            // TODO: error out of remaining calls
        } else if (Object.keys(this.calls).length === 0)
            this.worker.terminate()
    }

    /**
     * Calls an action in the worker and returns its result.
     * @param action action to call
     * @param parameters parameters to be passed to the action
     * @returns result of action
     */
    private call<T>(action: string, ...parameters: unknown[]): Promise<T> {
        return new Promise(res => {
            let id: string
            do {
                id = Math.random().toString().substring(2)
            } while (!(id in this.calls))

            this.calls[id] = res

            this.worker.postMessage({
                action: action,
                id: id,
                parameters: general.serializeAll(parameters)
            })
        })
    }

    /**
     * Adds a method to the methods available to the worker. If a method with the given name aready exists, it will be overwritten. Returns true if an overwrite occured.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    public async overwriteMethod(name: string, method: CallableFunction): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("overwriteMethod", name, method)
    }

    /**
     * Adds a method to the methods available to the worker. If a metho with the given name already exists, the method will not be added. Returns true if the method was added.
     * @param name name of the method
     * @param method function representing method
     * @returns whether a method with this name already existed
     */
    public async addMethod(name: string, method: CallableFunction): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("addMethod", name, method)
    }

    /**
     * Removes a method from the worker. Returns true if the method existed, false if not.
     * @param name name of the method
     * @returns whether a method with the given name existed and could be removed
     */
    public async removeMethod(name: string): Promise<boolean> {
        this.checkTerminated()
        return await this.call<boolean>("removeMethod", name)
    }

    /**
     * Call a method in the worker.
     * @param name name of the method
     * @param parameters parameters passed to the method (must be serializable)
     * @returns return value of the method
     */
    public async callMethod<T>(name: string, ...parameters: any[]): Promise<T> {
        this.checkTerminated()
        return await this.call<T>("callMethod", name, ...parameters)
    }

    private checkTerminated() {
        if (this.terminated)
            throw "Attempted to access a terminated Thread."
    }
}

