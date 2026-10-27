let globalWorker: Worker | null = null; 
 
export async function getWorker(onmessage?:(e:MessageEvent)=>void) { 
  if (!globalWorker) {
    try{ 
      globalWorker = new (await import(`#lib/worker/worker.js?worker`)).default() || null; 
      if (globalWorker && onmessage){
        globalWorker.onmessage = onmessage;
      }
    }catch(err){ 
      throw err; 
    } 
  }
  return globalWorker;
}

export function terminateWorker() {
  globalWorker?.terminate();
  globalWorker = null;
}