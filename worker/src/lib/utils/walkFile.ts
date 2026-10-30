import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import ignore from 'ignore';

type Ignore = ReturnType<typeof ignore>;

/** 一层 .gitignore：base 是它所在目录相对 root 的路径（root 为 ''），ig 是对应的规则集 */
interface Rule {
  base: string;
  ig: Ignore;
}

async function loadGitignore(dir: string): Promise<Ignore | null> {
  try {
    const content = await readFile(join(dir, '.gitignore'), 'utf8');
    return ignore().add(content);
  } catch (e: any) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * 判断相对 root 的路径是否被忽略。
 * rules 从根到当前目录排列，深层规则优先（git 语义）。
 */
function isIgnored(rel: string, isDir: boolean, rules: Rule[]): boolean {
  for (let i = rules.length - 1; i >= 0; i--) {
    const { base, ig } = rules[i];
    // 不在该 .gitignore 的作用域内则跳过
    if (base !== '' && rel !== base && !rel.startsWith(base + '/')) continue;

    const sub = base === '' ? rel : rel.slice(base.length + 1);
    const target = isDir ? sub + '/' : sub; // ignore 包要求目录以 / 结尾
    const r = ig.test(target);
    if (r.ignored) return true;
    if (r.unignored) return false; // 被 ! 显式恢复，直接短路
  }
  return false;
}

async function walk(
  dir: string,
  relDir: string,          // 相对 root，用 / 分隔
  rules: Rule[],
  acc: { max: number }
): Promise<void> {
  const local = await loadGitignore(dir);
  const currentRules = local ? [...rules, { base: relDir, ig: local }] : rules;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    if (e.name === '.git') continue; // 一般没必要进 .git

    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    const isDir = e.isDirectory();

    if (isIgnored(rel, isDir, currentRules)) continue;

    const full = join(dir, e.name);

    if (isDir) {
      await walk(full, rel, currentRules, acc);
    } else if (e.isFile()) {
      try {
        const s = await stat(full);
        if (s.mtimeMs > acc.max) acc.max = s.mtimeMs;
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err; // 遍历中被删掉就跳过
      }
    }
  }
}

/**
 * 返回目录下（递归）未被 .gitignore 排除的文件的最大 mtime。
 * 空目录返回 null。
 */
export async function maxMtimeRecursive(root: string): Promise<Number> {
  const acc = { max: -Infinity };
  await walk(root, '', [], acc);
  return acc.max === -Infinity ? 0 :acc.max;
} 