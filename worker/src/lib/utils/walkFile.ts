import fs from 'fs';
import path from 'path';
export function mtime(p:string) {
  try { return fs.statSync(p).mtimeMs; } catch { return -1; }
}
export function walk(dir:string, base:string = dir, out:{rel:string,abs:string,type:"dir"|"file",mtimeMs:number}[] = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;                       // 目录不存在或没权限
  }

  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs);   // 相对于根的路径
    if (e.isDirectory()) {
      out.push({ rel, abs, type: 'dir', mtimeMs: 0 });
      walk(abs, base, out);                 // 继续往下
    } else if (e.isFile()) {
      const mtimeMs = fs.statSync(abs).mtimeMs;
      out.push({ rel, abs, type: 'file', mtimeMs });
    }
    // 符号链接等其它类型按需加 else if (e.isSymbolicLink())
  }
  return out;
}