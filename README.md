# qthread
[![Build Process](https://github.com/alexanderjkslfj/qthread/actions/workflows/build.yml/badge.svg)](https://github.com/alexanderjkslfj/qthread/actions/workflows/build.yml)
[![Security Scan](https://github.com/alexanderjkslfj/qthread/actions/workflows/codeql.yml/badge.svg)](https://github.com/alexanderjkslfj/qthread/actions/workflows/codeql.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

Small library to simplify multithreading in the web.

While this library eases the creation and usage of multiple threads, the significant performance overhead of creating and communicating with a thread remains. One should only use threads for very heavy or long-running operations.

Since javascript threads are completely seperate from each other, all functions passed must be pure.

This means that most objects instanciated from classes can not be passed.

All objects passed are serialized; therefore passing huge objects can be quite costly.

This library is still in beta. If not used as intended (for example if the methods are not awaited) it can break in unexpected ways.

## Usage

```javascript
// Working with Thread
import { Thread } from "index.js"

const thread = new Thread()

await thread.addMethod("add", (a, b) => {
  return a + b
})

// These operations are executed on a different thread
const one = await thread.callMethod("add", 1, 0)
const two = await thread.callMethod("add", 1, 1)
const three = await thread.callMethod("add", 1, 2)

// Terminates the thread. If the thread isn't terminated when it isn't needed anymore, a memory leak may occur.
thread.terminate()

console.log(one, two, three)
```

```javascript
// Working with Cluster
import { Cluster } from "index.js"

// A Cluster starts with one thread.
const cluster = new Cluster()

// Additional threads can be added at any time.
await cluster.addThread()
await cluster.addThread()

await cluster.addMethod((a, b) => {
  return a + b
}, "add")

// Since the cluster controls three threads, all these operations are executed simultaneously.
const results = await Promise.all([
  await cluster.callMethod("add", 1, 0),
  await cluster.callMethod("add", 1, 1),
  await cluster.callMethod("add", 1, 2)
])

// Terminates the cluster. If the cluster isn't terminated when it isn't needed anymore, a memory leak may occur.
cluster.terminate()

console.log(...results)
```

```javascript
// Working with inlineWorker
import { inlineWorker } from "index.js"

// create a worker
const worker = inlineWorker(function () {
    const window = this

    // this listener retrieves the message sent by worker.postMessage
    window.addEventListener("message", e => {

        if(e.data.action === "add") {
            // using this.postMessage the worker can return a message
            window.postMessage(
                e.data.values[0] + e.data.values[1]
            )
        }

    })
})

// this listener is called when the worker posts a message
worker.addEventListener("message", e => {

    if(e.data === 3)
        console.log("Success!")
    else
        console.log("Failure.")

})

// send data to the worker
worker.postMessage({
    action: "add",
    values: [1, 2]
})
```

```javascript
// Working with serialization
import { deserialize, serialize } from "index.js"

const object = {
    value: 5
}

// create a cyclic object value
object.object = object

// clone object
const clone = deserialize(serialize(object))

console.log(
    object,
    clone,
    object !== clone, // actual clone
    object.object.object.value === clone.object.object.value // self reference is preserved
)
```

## Building

You need to have git, node and npm (or equivalent) installed on your system.
Execute the following commands in the terminal:

```bash
# get the code
git clone https://github.com/alexanderjkslfj/qthread.git

# enter directory
cd qthread

# install typescript (only necessary if typescript is not already globally installed)
npm ci

# build ts files to js
npm run build
```

Now you will find the web ready Javascript files under ```./dist/src```.

## Documentation

### Thread
A worker with a useful wrapper. It has the following methods:
##

#### constructor
Creates a new Thread (which includes a new worker).

Doesn't take any parameters.

Returns: ```Thread```
##

#### termiate
Terminates the Thread (and the underlying worker). No method is allowed to be called after termination.
This may be necessary to prevent memory leaks.

| Parameter | Type      | Default | Description                                                                                                             
| :---      | :---      | :---    | :---
| force     | `boolean` | false   | Whether to force cancel all running calls. If false, all running calls will finish before the worker is actually terminated.

Returns: ```void```
##

#### addMethod
Adds a method to the Thread.
This method can later be called.
If a method with the given name already exists, the method will not be added.

| Parameter | Type                    | Description
| :---      | :---                    | :---
| method    | ```CallableFunction```  | Method to be added. Must be pure.
| name      | ```string```            | Name of the method. Used later to call the method.

Returns: ```boolean``` Whether the method was added.
##

#### overwriteMethod
Adds a method to the Thread.
This method can later be called.
If a method with the given name already exists, it will be overwritten.

| Parameter | Type                    | Description
| :---      | :---                    | :---
| method    | ```CallableFunction```  | Method to be added. Must be pure.
| name      | ```string```            | Name of the method. Used later to call the method.

Returns: ```boolean``` Whether a method with the given name already existed.
##

#### removeMethod
Removes a method from the Thread.

| Parameter | Type          | Description
| :---      | :---          | :--
| name      | ```string```  | Name of the method.

Returns: ```boolean``` Whether a method with the given name existed.
##

#### callMethod
Calls a method from the Thread.

| Parameter     | Type          | Description
| :---          | :---          | :---
| <T>           | ```any```     | Type of the return value of the method called. Must be serializable.
| name          | ```string```  | Name of the method called.
| ...parameters | ```any[]```   | Parameters passed to the method. Must be serializable.

Returns: ```<T>``` The return value of the method called.

---

### Cluster
Manages a group of threads. Passed calls are automatically delegated.
##

#### constructor
Creates a new Cluster (which includes a new Thread).

Doesn't take any parameters.

Returns: `Cluster`
##

#### terminate
Terminates the Cluster (and the underlying Threads). No method is allowed to be called after termination.
This may be necessary to prevent memory leaks.

| Parameter | Type      | Default | Description
| :---      | :---      | :---    | :---
| force     | `boolean` | false   | Whether to force cancel all running calls. If false, all running calls will finish before their respecive workers are actually terminated.

Returns: `void`
##

#### addMethod
Adds a method to the Cluster.
This method can later be called.

| Parameter | Type                | Default | Description
| :---      | :---                | :---    | :---
| method    | `CallableFunction`  | -       | Method to be added. Must be pure.
| name      | `string`            | -       | Name of the method. Used later to call the method.
| force     | `boolean`           | false   | Whether to overwrite if a method with the same name already exists.

Returns: `boolean` Whether the method was added.
##

#### overwriteMethod
Same as addMethod with force set to true.

| Parameter | Type                | Default | Description
| :---      | :---                | :---    | :---
| method    | `CallableFunction`  | -       | Method to be added. Must be pure.
| name      | `string`            | -       | Name of the method. Used later to call the method.

Returns: `true`
##

#### removeMethod
Removes a method from the Cluster.

| Parameter   | Type                        | Description
| :---        | :---                        | :--
| identifier  | `string | CallableFunction` | Name or function of the method.

Returns: `boolean` Whether a method with the given name or function existed.
##

#### callMethod
Calls a method from the Cluster.

| Parameter     | Type      | Description
| :---          | :---      | :---
| <T>           | `any`     | Type of the return value of the method called. Must be serializable.
| name          | `string`  | Name of the method called.
| ...parameters | `any[]`   | Parameters passed to the method. Must be serializable.

Returns: `<T>` The return value of the method called.
##

#### addThread
Adds a Thread to the Cluster.

Doesn't take any parameters.

Returns: `void`
##

#### removeThread
Removes a Thread from the Cluster. Prioritizes idle Threads.

| Parameter | Type      | Default | Description
| :---      | :---      | :---    | :---
| force     | `boolean` | false   | Removed Thread is forcefully terminated. Not recommended.

Returns: `boolean` Whether a Thread was successfully removed (false if the Cluster owns no Threads).
