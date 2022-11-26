export function testAll(tests: (() => Promise<[boolean, any]>)[], vocal: boolean = true): () => Promise<[boolean, null]> {
    return async (): Promise<[boolean, null]> => {
        let works = true
        for (const test of tests) {
            try {
                const result = await test()
                if (result[0]) {
                    if (vocal)
                        console.log(`Test ${test.name} finished successfully.`)
                } else {
                    if (vocal)
                        console.log(`Test ${test.name} didn't finish successfully. It returned a wrong result:`, result[1])
                    works = false
                }
            } catch(err) {
                if (vocal)
                    console.log(`Test ${test.name} didn't finish successfully. It threw an error:`, err)
                works = false
            }
        }
        return [works, null]
    }
}