/**
 * Execute the code contained in the passed function from inside a worker.
 * @param script the function to be executed; must be a pure function
 * @returns the worker
 */
export declare function inlineWorker(script: CallableFunction | string): Worker;
/**
 * A serialized value (which can be stringified).
 */
export type serialized = {
    primitive: true;
    value: string | number | boolean | null;
} | {
    primitive: false;
    value: string;
};
/**
 * A serializable value (not every object is serializable).
 */
export type serializable = string | number | boolean | object | null;
/**
 * Serialize a value (which may then be stringified).
 */
export declare function serialize(value: serializable): serialized;
/**
 * Serialize all values passed.
 * @param values values to be serialized
 * @returns an array of serialized values
 */
export declare function serializeAll(...values: serializable[]): serialized[];
/**
 * Deserialize a value.
 * @param value the value to be deserialized
 * @returns the deserialized value
 */
export declare function deserialize<T extends serializable>(value: serialized): T;
/**
 * Deserialize all values passed
 * @param values values to be deserialized
 * @returns an array of serialized values
 */
export declare function deserializeAll<T extends serializable>(...values: serialized[]): T[];
/**
 * Properly stringify an object. (Preserves cyclic object values and doesn't add unnecessary duplication.)
 * @param object
 * @returns
 */
export declare function obj2str(object: object): string;
/**
 * Parse a string created using obj2str
 * @param str the string to parse
 * @returns an object
 */
export declare function str2obj<T>(str: string): T;
/**
 * Convert a stringified funcion to a function, preserving its name and not adding unnecessary closure.
 * @param str the stringified function
 * @returns a function
 */
export declare function str2fun(str: string): CallableFunction | null;
/**
 * Properly stringify a function. (Preserves name.)
 * @param fun the function to stringify
 * @returns the stringified function
 */
export declare function fun2str(fun: CallableFunction): string;
/**
 * Create a key for a map that is not yet present in the map.
 * @param map the map to create a key for
 * @returns a new key for the map
 */
export declare function randomKey(map: Map<string, any>): string;
