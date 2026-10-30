/** 单个复选框配置 */
export interface CheckboxOptions<V extends string = string> {
  /** input 的 id，建议传，便于 label 关联 */
  id?: string;
  /** 同组复选框共享的 name */
  name: string;
  /** 提交时的值 */
  value: V;
  /** 显示文本 */
  text: string;
  /** 默认是否选中 */
  checked?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否半选（仅 JS 可控） */
  indeterminate?: boolean;
  /** label 的 class */
  className?: string;
  /** 值变化回调 */
  onChange?: (checked: boolean, value: V, event: Event) => void;
}

/**
 * 创建单个复选框，返回包裹 input 的 <label> 元素
 * （点击文字也能切换选中状态）
 */
export function createCheckbox<V extends string = string>(
  options: CheckboxOptions<V>
): HTMLLabelElement {
  const {
    id,
    name,
    value,
    text,
    checked = false,
    disabled = false,
    indeterminate = false,
    className,
    onChange,
  } = options;

  const label = document.createElement('label');
  if (className) label.className = className;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.disabled = disabled;
  input.indeterminate = indeterminate;

  if (id) {
    input.id = id;
    label.htmlFor = id;
  }

  if (onChange) {
    input.addEventListener('change', (event) => {
      onChange(input.checked, value, event);
    });
  }

  label.append(input, document.createTextNode(` ${text}`));
  return label;
}

export function createVerticalCheckbox<V extends string = string>(
  options: CheckboxOptions<V>
): HTMLLabelElement {
  const label = createCheckbox(options);
  Object.assign(label.style, {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    paddingRight: '16px',
  } satisfies Partial<CSSStyleDeclaration>);
  return label;
}