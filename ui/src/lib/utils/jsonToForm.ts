/**
 * JSON 转表单编辑器（支持注释字段）
 * - 自动识别 `字段名_comment` 作为该字段的提示（placeholder / 辅助文本）
 * - 自动识别对象内的 `_comment` 作为该对象区域的说明文字
 * - 数组暂不展开，显示为可编辑的 JSON 字符串
 * - 内联样式，符合无障碍要求（label 关联控件）
 * - TypeScript 实现，自包含
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];

/** 判断是否为普通对象（非数组、非 null） */
function isPlainObject(value: any): value is JsonObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 将路径转为合法 HTML id */
function pathToId(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '_');
}

/** 根据点号路径设置对象的值（用于数据收集） */
function setValueByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined) {
            const nextPart = parts[i + 1];
            current[part] = /^\d+$/.test(nextPart) ? [] : {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

/** 判断键名是否为字段级注释（以 _comment 结尾且不是纯 _comment） */
function isFieldCommentKey(key: string): boolean {
    return key.endsWith('_comment') && key !== '_comment';
}

/** 从字段级注释键中提取对应的主字段名 */
function getMainFieldFromCommentKey(commentKey: string): string {
    return commentKey.slice(0, -8); // 去掉 "_comment"
}


export const ShowSubmit = (content:HTMLDivElement,db:any,hand:(db:any)=>void)=>{ 
  jsonToForm(db ,content)  
  const btn = document.createElement('button');
  btn.textContent = '确定';
  Object.assign(btn.style, {
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
  });
  btn.onclick = () => { 
      hand(collectFormData(content)) 
  };
  content.appendChild(btn); 
}
// ==================== 核心渲染函数 ====================

/**
 * 将 JSON 数据转为 HTML 表单
 * @param data      JSON 数据
 * @param container 容器 DOM 元素
 * @param path      当前路径（内部递归使用）
 */
export function jsonToForm(data: JsonValue, container: HTMLElement, path: string = ''): void {
    container.innerHTML = '';
    if (data === null) {
        renderNullValue(container, path);
        return;
    }
    if (Array.isArray(data)) {
        renderArrayAsTextarea(data, container, path);
        return;
    }
    if (isPlainObject(data)) {
        renderObject(data, container, path);
        return;
    }
    renderPrimitive(data, typeof data as 'string' | 'number' | 'boolean', container, path);
}

/** 渲染 null 只读文本 */
function renderNullValue(container: HTMLElement, path: string): void {
    const div = document.createElement('div');
    Object.assign(div.style, {
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        color: '#666',
    });
    div.textContent = `${path || '值'}: null (不可编辑)`;
    container.appendChild(div);
}

/** 渲染数组（textarea），支持注释提示 */
function renderArrayAsTextarea(data: JsonArray, container: HTMLElement, path: string, comment?: string): void {
    const div = document.createElement('div');
    Object.assign(div.style, { marginBottom: '1.5rem' });

    const id = pathToId(path);
    const label = document.createElement('label');
    label.textContent = path || '数组';
    label.htmlFor = id;
    Object.assign(label.style, {
        display: 'block',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        fontSize: '0.9rem',
    });
    div.appendChild(label);

    // 如果有注释，添加一个小提示图标或文字
    if (comment) {
        const commentSpan = document.createElement('span');
        commentSpan.textContent = ` ${comment}`;
        commentSpan.style.fontSize = '0.8rem';
        commentSpan.style.fontWeight = 'normal';
        commentSpan.style.color = '#666';
        label.appendChild(commentSpan);
    }

    const textarea = document.createElement('textarea');
    textarea.id = id;
    textarea.rows = 5;
    Object.assign(textarea.style, {
        width: '100%',
        padding: '0.5rem',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
    });
    textarea.value = JSON.stringify(data, null, 2);
    textarea.setAttribute('data-path', path);
    textarea.setAttribute('data-type', 'array');
    if (comment) {textarea.placeholder = comment;}

    // 简单 JSON 校验
    textarea.addEventListener('input', () => {
        try {
            JSON.parse(textarea.value);
            textarea.style.borderColor = '#ccc';
        } catch {
            textarea.style.borderColor = '#f00';
        }
    });

    div.appendChild(textarea);
    container.appendChild(div);
}

/** 渲染普通对象（处理注释字段） */
function renderObject(obj: JsonObject, container: HTMLElement, basePath: string): void {
    // 第一步：提取注释信息（字段级注释 + 对象级注释）
    const fieldComments: Map<string, string> = new Map();   // 主字段名 -> 注释
    let objectComment: string | undefined = undefined;

    // 过滤出真正的数据字段（非注释字段）
    const dataEntries: [string, JsonValue][] = [];

    for (const [key, value] of Object.entries(obj)) {
        if (key === '_comment') {
            // 对象级注释（字符串值）
            if (typeof value === 'string') {objectComment = value;}
            continue;
        }
        if (isFieldCommentKey(key) && typeof value === 'string') {
            const mainField = getMainFieldFromCommentKey(key);
            fieldComments.set(mainField, value);
            continue;
        }
        dataEntries.push([key, value]);
    }

    // 如果有对象级注释，创建全局说明区域
    if (objectComment) {
        const noteDiv = document.createElement('div');
        Object.assign(noteDiv.style, {
            backgroundColor: '#eef2ff',
            padding: '0.5rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#1e40af',
        });
        noteDiv.textContent = `📌 ${objectComment}`;
        container.appendChild(noteDiv);
    }

    // 第二步：渲染每个实际字段
    for (const [key, value] of dataEntries) {
        const fieldPath = basePath ? `${basePath}.${key}` : key;
        const fieldContainer = document.createElement('div');
        Object.assign(fieldContainer.style, { marginBottom: '1rem' });

        const comment = fieldComments.get(key); // 字段级注释

        if (value === null) {
            renderNullValue(fieldContainer, fieldPath);
        } else if (Array.isArray(value)) {
            renderArrayAsTextarea(value, fieldContainer, fieldPath, comment);
        } else if (isPlainObject(value)) {
            // 嵌套对象：使用 fieldset，且支持对象级注释（递归内部会处理）
            const fieldset = document.createElement('fieldset');
            Object.assign(fieldset.style, {
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '1rem',
                margin: '0.5rem 0',
            });
            const legend = document.createElement('legend');
            legend.textContent = key;
            Object.assign(legend.style, {
                fontWeight: 'bold',
                padding: '0 0.5rem',
            });
            // 如果有字段级注释，添加到 legend 旁边
            if (comment) {
                const commentSpan = document.createElement('span');
                commentSpan.textContent = ` — ${comment}`;
                commentSpan.style.fontWeight = 'normal';
                commentSpan.style.fontSize = '0.8rem';
                commentSpan.style.color = '#666';
                legend.appendChild(commentSpan);
            }
            fieldset.appendChild(legend);
            const nestedContainer = document.createElement('div');
            // 递归渲染嵌套对象（内部会再次处理注释）
            renderObject(value, nestedContainer, fieldPath);
            fieldset.appendChild(nestedContainer);
            fieldContainer.appendChild(fieldset);
        } else {
            renderPrimitive(value, typeof value as 'string' | 'number' | 'boolean', fieldContainer, fieldPath, key, comment);
        }
        container.appendChild(fieldContainer);
    }
}

/** 渲染基本类型（string, number, boolean），支持注释 */
function renderPrimitive(
    value: JsonPrimitive,
    type: 'string' | 'number' | 'boolean',
    container: HTMLElement,
    path: string,
    labelText?: string,
    comment?: string
): void {
    const div = document.createElement('div');
    Object.assign(div.style, { marginBottom: '1rem' });

    const id = pathToId(path);
    const label = document.createElement('label');
    label.textContent = labelText || path || '值';
    label.htmlFor = id;
    Object.assign(label.style, {
        display: 'block',
        fontWeight: 'bold',
        marginBottom: '0.25rem',
        fontSize: '0.85rem',
    });
    div.appendChild(label);

    // 注释在 label 旁边显示（可选）
    if (comment) {
        const commentSpan = document.createElement('span');
        commentSpan.textContent = ` ${comment}`;
        commentSpan.style.fontSize = '0.75rem';
        commentSpan.style.fontWeight = 'normal';
        commentSpan.style.color = '#666';
        label.appendChild(commentSpan);
    }

    let input: HTMLInputElement;

    if (type === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = value as boolean;
        input.style.marginRight = '0.5rem';
        input.setAttribute('data-path', path);
        input.setAttribute('data-type', 'boolean');
        div.appendChild(input);
        // checkbox 无法使用 placeholder，注释已显示在 label 中
    } else {
        input = document.createElement('input');
        input.type = type === 'number' ? 'number' : 'text';
        input.id = id;
        input.value = value?.toString() ?? '';
        Object.assign(input.style, {
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.875rem',
        });
        if (comment) {input.placeholder = comment;}
        input.setAttribute('data-path', path);
        input.setAttribute('data-type', type);
        div.appendChild(input);
    }

    container.appendChild(div);
}

// ==================== 数据收集（过滤注释字段） ====================
/**
 * 从表单中收集数据，重建 JSON 对象（自动排除注释字段）
 * @param rootContainer 包含所有表单控件的容器
 */
export function collectFormData(rootContainer: HTMLElement): any {
    const result: any = {};

    // 收集基本类型 input（checkbox, text, number）
    const inputs = rootContainer.querySelectorAll<HTMLInputElement>('input[data-path]');
    inputs.forEach(input => {
        const path = input.getAttribute('data-path');
        if (!path){ return;}
        const type = input.getAttribute('data-type');
        let value: any;
        if (type === 'boolean') {
            value = input.checked;
        } else if (type === 'number') {
            value = parseFloat(input.value);
            if (isNaN(value)) {value = 0;}
        } else {
            value = input.value;
        }
        setValueByPath(result, path, value);
    });

    // 收集数组字段 textarea
    const textareas = rootContainer.querySelectorAll<HTMLTextAreaElement>('textarea[data-path][data-type="array"]');
    textareas.forEach(textarea => {
        const path = textarea.getAttribute('data-path');
        if (!path) {return;}
        try {
            const parsed = JSON.parse(textarea.value);
            setValueByPath(result, path, parsed);
        } catch {
            console.warn(`JSON 解析失败: ${path}`);
            setValueByPath(result, path, textarea.value);
        }
    });

    return result;
}

// ==================== 使用示例 ====================
/*
const exampleData = {
    "_comment": "这是用户配置对象",
    "username": "alice",
    "username_comment": "登录用户名，必填",
    "age": 28,
    "age_comment": "年龄，单位岁",
    "isActive": true,
    "isActive_comment": "是否启用账户",
    "tags": ["ts", "json"],
    "tags_comment": "技术标签列表",
    "profile": {
        "_comment": "个人资料子对象",
        "bio": "Developer",
        "bio_comment": "一句话简介"
    }
};

const container = document.getElementById('form-container');
if (container) {
    jsonToForm(exampleData, container);

    const btn = document.createElement('button');
    btn.textContent = '获取 JSON';
    Object.assign(btn.style, {
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    });
    btn.onclick = () => {
        const updated = collectFormData(container);
        console.log(updated);
        alert(JSON.stringify(updated, null, 2));
    };
    container.appendChild(btn);
}
*/