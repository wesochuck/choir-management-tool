const { performance } = require('perf_hooks');

const simulateFetch = () => new Promise(resolve => setTimeout(resolve, 50));
const simulateUpdate = () => new Promise(resolve => setTimeout(resolve, 50));

async function sequential(ids) {
    for (const id of ids) {
        await simulateFetch();
        await simulateUpdate();
    }
}

async function concurrent(ids) {
    await Promise.all(ids.map(async (id) => {
        await simulateFetch();
        await simulateUpdate();
    }));
}

async function run() {
    const ids = Array.from({length: 10}, (_, i) => String(i));

    let start = performance.now();
    await sequential(ids);
    let end = performance.now();
    console.log(`Sequential: ${end - start} ms`);

    start = performance.now();
    await concurrent(ids);
    end = performance.now();
    console.log(`Concurrent: ${end - start} ms`);
}

run();
