export function randomString(length: number): string {
    let str = ""
    for(let i = 0; i < length; i++) {
        str += randomLetter()
    }
    return str
}

export function randomLetter(): string {
    return (Math.floor(Math.random() * 26) + 10).toString(36)
}

export function randomKey(map: Map<string, any>): string {
    let key: string
    do {
        key = randomString(8)
    } while(map.has(key))
    return key
}