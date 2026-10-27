//import { parentPort, workerData } from 'worker_threads';

//import modeling from '@jscad/modeling';

import {
  clearCurrent,
  handleCurrentMsg,
  getCurrent,
  objUrlMap,type currentObj} from '#lib/function/ImportParser.ts'
import {getCsgObjArray} from '#lib/function/csgChange.ts' 
import {sendGeometry} from '#lib/function/geoSend.ts'
import {parseError} from '#lib/utils/parseError.ts';
import {type DirInfoType,createDirInfo} from "#lib/function/fileHandle.ts"
 

// ============ Worker 兼容层 ============
const isNode = typeof process !== 'undefined' && !!process.versions?.node
let nodeParentPort: any = null
if (isNode) {
  try {
    nodeParentPort = (await import('node:worker_threads')).parentPort
  } catch {}
}

const postMain = (msg: any, transfer?: Transferable[]) => {
  if (nodeParentPort) {
    transfer ? nodeParentPort.postMessage(msg, transfer) : nodeParentPort.postMessage(msg)
  } else {
    const w = self as unknown as Worker
    transfer ? w.postMessage(msg, transfer) : w.postMessage(msg)
  }
}

const onMainMessage = (handler: (data: any) => void) => {
  if (nodeParentPort) nodeParentPort.on('message', handler)
  else self.onmessage = (e: MessageEvent) => handler(e.data)
}
// ======================================
//if (!parentPort) throw new Error('必须在 worker 中运行');

const includeImport: { [key: string]: string } = {
  '@jscad/modeling': './lib/modeling.esm.js',
  'manifold-3d': './lib/manifold/manifold.js',
}

const globalOption: {
  option: { [k: string]: any }
  DirHandle?: DirInfoType
} = {
  option: {},
}

const postMessage = async (e: any) => {
  console.log('postMsg', e.path)
  if (e.path) {
    try {
      const handle = globalOption.DirHandle?.DirHandle?.getFileHandle(
        e.path,
      )
      //console.log(handle,"init dir")
      if (handle) {
        const db = await handle.read()
        //console.log(db)
        handleCurrentMsg({ db, name: e.path }, postMessage)
      }
    } catch (err) {
      //console.error(err)
      // ✅ 用 import.meta.url 作 base
      handleCurrentMsg({ name: e.path })!.getUri = async () =>
        new URL(includeImport[e.path] || e.path, import.meta.url).toString()
    }
  }
}

const getIndex = (c: currentObj) => {
  if (c.persons && c.persons.size > 0) {
    const li: currentObj[] = []
    c.persons.forEach((_c) => {
      const _c_ = getIndex(_c)
      if (li.includes(_c_)) return
      li.push(_c_)
    })
    return li[0]
  } else {
    return c
  }
}

const runCode = async (indexCurrent: currentObj, update?: string) => {
  postMain({ startTicker: true, update })                     // ✅
  globalOption.DirHandle?.channeldb?.removeEventListener('message', runHandle)
  const u = await indexCurrent.getUri()
  const src = await import(/* @vite-ignore */ u)
  const fnlist = Object.keys(src)
  if (!fnlist) throw 'not have function'
  const fnlistSet = new Set<string>()
  let opt: { [k: string]: any } = {}
  fnlist.forEach((l) => {
    if (l === 'default') {
      Object.assign(opt, src[l])
      return
    }
    if (typeof src[l] === 'function') {
      fnlistSet.add(l)
    } else {
      opt[l] = src[l]
    }
  })

  const workerHandle = async (ev: MessageEvent<{
    type: string
    run?: string
    key: string
    msg: any
    end: boolean
  }>) => {
    switch (ev.data.type) {
      case 'workerRun':
        if (ev.data.key !== globalOption.DirHandle?.key) return
        if (!ev.data.run) return
        if (!fnlistSet.has(ev.data.run)) return
        fnlistSet.delete(ev.data.run)
        let tmpDB = src[ev.data.run](globalOption.option)
        if (tmpDB.then) tmpDB = await tmpDB
        await getCsgObjArray(tmpDB, async (msg: any) => {
          if (msg.type === 'mesh')
            await sendGeometry(
              {
                send: (db) => {
                  globalOption.DirHandle?.channeldb?.postMessage({
                    key: globalOption.DirHandle.key,
                    update,
                    type: 'workerData',
                    mesh: true,
                    run: ev.data.run,
                    msg: { db },
                  })
                },
              },
              msg as any,
            )
          else
            globalOption.DirHandle?.channeldb?.postMessage({
              key: globalOption.DirHandle.key,
              update,
              type: 'workerData',
              run: ev.data.run,
              msg,
            })
        })
        globalOption.DirHandle?.channeldb?.postMessage({
          update,
          key: globalOption.DirHandle.key,
          type: 'workerData',
          run: ev.data.run,
          end: true,
        })
        break
      case 'workerData':
        if (!ev.data.run || !fnlistSet.has(ev.data.run)) return
        if (ev.data.end) fnlistSet.delete(ev.data.run)
        break
      default:
        return
    }
    if (fnlistSet.size > 0) return
    globalOption.DirHandle?.channeldb?.removeEventListener('message', workerHandle)
    postMain({ stopTicker: true })
    globalOption.DirHandle?.channeldb?.addEventListener('message', runHandle)
  }
  globalOption.DirHandle?.channeldb?.addEventListener('message', workerHandle)
  return { fnlistSet, opt }
}

const RunCode = async (
  indexCurrent: currentObj,
  initOption: boolean = true,
  update?: string,
  postMsg?: (db: any) => void,
) => {
  try {
    const { fnlistSet, opt } = await runCode(indexCurrent, update)
    if (initOption) {
      if (opt) {
        Object.assign(globalOption.option, opt)
      }
      const db = {
        key: globalOption.DirHandle?.key,
        type: 'workerInit',
        list: [...fnlistSet],
        name: indexCurrent.name,
        update,
        option: globalOption.option,
      }
      postMsg?.(db)
    } else {
      postMsg?.({
        type: 'worker',
        update,
        key: globalOption.DirHandle?.key,
      })
    }
    const module = {
      list: [...fnlistSet],
      path: globalOption.DirHandle?.path,
      option: globalOption.option,
    }
    postMain({ module, update })                              // ✅
  } catch (err) {
    postMain({ err: parseError(err as Error, objUrlMap) })    // ✅
    console.error(err)
  }
}

const runHandle = (e: MessageEvent<{
  list: any
  type: string
  name: string
  update?: string
  option: any
}>) => {
  switch (e.data.type) {
    case 'workerInit':
      if (!e.data.list) return
      if (e.data.option) {
        Object.assign(globalOption.option, e.data.option)
      }
      console.log('init', e.data, globalOption.option)
      if (e.data.name) {
        if (!e.data.update) clearCurrent()
        getCurrent(e.data.name, postMessage).then((cur) => {
          RunCode(cur, false, e.data.update, (db) => {
            globalOption.DirHandle?.channeldb?.postMessage(db)
          })
        })
      }
      return
  }
}

// ============ 原来的 self.onmessage → onMainMessage，event.data → event ============
onMainMessage(async (event) => {
  console.log(event)
  if (event.path) {
    if (
      !globalOption.DirHandle ||
      globalOption.DirHandle.path !== event.path
    ) {
      globalOption.DirHandle = createDirInfo(event.path)
    }
    postMain({ type: 'init' })                                // ✅
  }
  if (event.name) {
    if (!event.update) clearCurrent()
    await RunCode(
      await getCurrent(event.name, postMessage),
      true,
      event.update,
      (db) => {
        globalOption.DirHandle?.channeldb?.postMessage(db)
      },
    )
  } else {
    globalOption.DirHandle?.channeldb?.addEventListener('message', runHandle)
  }
})

export {}