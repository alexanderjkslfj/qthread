export function testAll(tests: (() => Promise<boolean>)[], vocal: boolean = true): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        let works = true
        for (const test of tests) {
            try {
                const success = await test()
                if (success) {
                    if (vocal)
                        console.log(`Test ${test.name} finished successfully.`)
                } else {
                    if (vocal)
                        console.log(`Test ${test.name} didn't finish successfully. It returned a wrong result.`)
                    works = false
                }
            } catch {
                if (vocal)
                    console.log(`Test ${test.name} didn't finish successfully. It threw an error.`)
                works = false
            }
        }
        return true
    }
}