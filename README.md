# [WIP] qthread
[![Build Process](https://github.com/alexanderjkslfj/qthread/actions/workflows/build.yml/badge.svg)](https://github.com/alexanderjkslfj/qthread/actions/workflows/build.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

Small library to simplify multithreading in the web.

Work in progress: Already works for most use cases but may break in unexpected ways, as it is not thoroughly tested yet.

While this library eases the creation and usage of multiple threads, the significant performance overhead of creating and communicating with a thread remains. One should only use threads for very heavy or long-running operations.

Since in javascript, threads are completely seperate from each other, all functions passed must be pure.

This means that most objects instanciated from classes can not be passed.

All objects passed must be serialized; therefore passing huge objects can be quite costly.

### Hot to use

```javascript
// Working with Thread
import Thread from "thread.js"

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
import Cluster from "cluster.js"

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

### How to build

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
