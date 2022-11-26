import { testAll } from "./util.js";

import testCluster from "./cluster.js";

const runAllTests = testAll([
    testCluster
], false)

runAllTests().then(success => {
    console.log(success[0]
        ? "All tests finished successfully."
        : "Some tests did not finish successfully."
    )
})