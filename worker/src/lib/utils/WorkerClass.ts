
const hasNativeWorker = typeof globalThis.Worker === 'function';

let WorkerClass;

export async function resolveWorkerClass() {
  //const probe = await probeWorkerBehavior();

  if (hasNativeWorker) {
    // 原生或等效实现，直接使用全局 Worker
    WorkerClass = globalThis.Worker;
    return WorkerClass;
  }

  // 回退：动态导入 web-worker
  // 在浏览器打包环境中，它会被解析为原生 Worker 的别名，几乎零开销
  // 在 Node.js 中，它会加载基于 worker_threads 的模拟实现
  const mod = await import('web-worker');
  WorkerClass = mod.default;
  return WorkerClass;
}