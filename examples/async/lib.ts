export function delay(timeInMs: number) {
    return new Promise<void>((resolve, _reject) => {
        setTimeout(() => {
            resolve();
        }, timeInMs);
    });
}

export async function think() {
    await delay(1000);
    return 42;
}
