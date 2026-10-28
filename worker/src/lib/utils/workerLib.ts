const isNode = typeof process !== 'undefined' && !!process.versions?.node
let nodeParentPort: any = null
if (isNode) {
  try {
    nodeParentPort = (await import('node:worker_threads')).parentPort
  } catch {}
}

export const postMain =(msg: any, transfer?: Transferable[]) => {
  if (nodeParentPort) {
    transfer ? nodeParentPort.postMessage(msg, transfer) : nodeParentPort.postMessage(msg)
  } else {
    const w = self as unknown as Worker
    transfer ? w.postMessage(msg, transfer as any) : w.postMessage(msg)
  }
}

export const onMainMessage = (handler: (data: any) => void) => {
  if (nodeParentPort) nodeParentPort.on('message', handler)
  else self.onmessage = (e: MessageEvent) => handler(e.data)
}