import ErrorStackParser from 'error-stack-parser';

export async function parseError(err: Error,
  handleErrorStack:(frame: ErrorStackParser.StackFrame)=>Promise<void>
  //objUrlMap:Map<string,string>
) {
  // 使用 Record<string, any> 存储结果
  const result: Record<string, any> = {
    name: 'Error',
    message: '',
    stack: null,
    parsedStack: [], // 始终为数组
  };
/*
  // 如果不是 Error 实例，提前处理
  if (!(err instanceof Error)) {
    if (typeof err === 'string') {
      result.message = err;
    } else {
      try {
        result.message = JSON.stringify(err);
      } catch (_) {
        result.message = String(err);
      }
      result.raw = err;
    }
    return result;
  }
*/
  // 现在 err 是 Error 类型，但为了访问自定义属性，使用 as any
  const error = err as any; // 关键转换

  result.name = err.name || 'Error';
  result.message = err.message || '';
  result.stack = err.stack || null;

  // 复制自定义的可枚举属性（如 code, status, config 等）
  for (const key in error) {
    if (Object.prototype.hasOwnProperty.call(error, key)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        result[key] = error[key];
      }
    }
  }

  // 解析堆栈（使用 error-stack-parser）
  if (result.stack) {
    try {
      const parsed = ErrorStackParser.parse(err);
      result.parsedStack = []
      for (let frame of parsed){
        
        await handleErrorStack(frame)
        /*
        if (!frame.fileName){
          result.parsedStack.push(frame)
          break
        } 
        const name =objUrlMap.get(frame.fileName) 
        if (name){ 
          const source = frame.source?.replace(frame.fileName,name)
          const r = await fetch(frame.fileName) 
          if (r){ 
            Object.assign(frame,{fileText:await r.text()}) 
          } 
          Object.assign(frame,{name,source})
        } */
        result.parsedStack.push(frame)
      } 
    } catch (parseError) {
      // 解析失败时保留空数组
      console.warn('Stack parse failed:', parseError);
    }
  }

  return result;
}