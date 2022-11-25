# [WIP] qthread
![build](https://github.com/alexanderjkslfj/qthread/actions/workflows/main.yml/badge.svg)

Small library to simplify multithreading in the web.

Work in progress; already works for many use cases, but may break in unexpected ways.

While this library eases the creation and usage of multiple threads, the significant performance overhead of communicating with a thread remains. One should only use threads for very heavy or long-runing operations.

Since in javascript, threads are completely seperate from each other, all functions passed must be pure.

This means that most objects instanciated from classes can not be passed.

All objects passed must be serialized; therefore passing huge objects can be quite costly.

```javascript
// Working with Thread
import Thread from "thread"

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
import Cluster from "cluster"

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
