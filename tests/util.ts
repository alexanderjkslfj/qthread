/**
 * Runs all tests.
 * @param tests The tests to be run. Should return Promise<[boolean, any]>, with boolean being whether the test succeeded and any being the (actual) result.
 * @param vocal Whether to print success or error messages after the tests.
 * @returns a Promise<[boolean, null]> with the boolean being whether all tests were successful. (The format allows it to be used as a test.)
 */
export function testAll(tests: (() => Promise<[boolean, any]>)[], vocal: boolean = true): () => Promise<[boolean, null]> {
    return async (): Promise<[boolean, null]> => {
        let works = true

        // iterate over all tests
        for (const test of tests) {
            try {
                // run test
                const result = await test()

                if (result[0]) {

                    // test was successful
                    if (vocal)
                        console.log(`✅ Success: Test ${test.name} finished successfully.`)

                } else {

                    // test was not successful
                    if (vocal)
                        console.log(`❌ Error: Test ${test.name} didn't finish successfully. It returned a wrong result:`, result[1])
                    works = false

                }
            } catch(err) {

                    // test threw an error
                if (vocal)
                    console.log(`❌ Error: Test ${test.name} didn't finish successfully. It threw an error: %c${err}`, "color:red;")
                works = false
            }
        }

        return [works, null]
    }
}