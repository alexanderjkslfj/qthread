import { testAll } from "./util";

import testCluster from "./cluster";

const runAllTests = testAll([
    testCluster
], false)

runAllTests().then(success => {
    console.log(success
        ? "All tests finished successfully."
        : "Some tests did not finish successfully."
    )
})