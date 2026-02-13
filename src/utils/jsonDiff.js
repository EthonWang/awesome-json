/**
 * JSON Diff 核心引擎
 * 递归对比两个 JSON 对象，生成差异列表
 */

export const DiffType = {
  EQUALITY: 'eq',
  TYPE: 'type',
  MISSING: 'missing',
}

function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function pathJoin(...parts) {
  return parts.filter(Boolean).join('')
}

/**
 * 递归对比两个值，返回差异数组
 * @param {*} left - 左侧值
 * @param {*} right - 右侧值
 * @param {string} path - 当前 JSON 路径
 * @returns {Array<{path: string, leftPath: string, rightPath: string, type: string, msg: string}>}
 */
export function diffJson(left, right, path = '/') {
  const diffs = []
  diffVal(left, right, path, diffs)
  return diffs
}

function diffVal(left, right, path, diffs) {
  const leftType = getType(left)
  const rightType = getType(right)

  if (leftType !== rightType) {
    diffs.push({
      path,
      type: DiffType.TYPE,
      msg: `类型不同: 左侧为 ${leftType}，右侧为 ${rightType}`,
      leftVal: left,
      rightVal: right,
    })
    return
  }

  switch (leftType) {
    case 'object':
      diffObject(left, right, path, diffs)
      break
    case 'array':
      diffArray(left, right, path, diffs)
      break
    default:
      if (left !== right) {
        diffs.push({
          path,
          type: DiffType.EQUALITY,
          msg: `值不等: ${JSON.stringify(left)} ≠ ${JSON.stringify(right)}`,
          leftVal: left,
          rightVal: right,
        })
      }
      break
  }
}

function diffObject(left, right, path, diffs) {
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)])
  const sortedKeys = [...allKeys].sort((a, b) => a.localeCompare(b))

  for (const key of sortedKeys) {
    const childPath = pathJoin(path, path === '/' ? '' : '/', key)
    const hasLeft = Object.prototype.hasOwnProperty.call(left, key)
    const hasRight = Object.prototype.hasOwnProperty.call(right, key)

    if (hasLeft && !hasRight) {
      diffs.push({
        path: childPath,
        type: DiffType.MISSING,
        msg: `右侧缺少属性: ${key}`,
        leftVal: left[key],
        rightVal: undefined,
      })
    } else if (!hasLeft && hasRight) {
      diffs.push({
        path: childPath,
        type: DiffType.MISSING,
        msg: `左侧缺少属性: ${key}`,
        leftVal: undefined,
        rightVal: right[key],
      })
    } else {
      diffVal(left[key], right[key], childPath, diffs)
    }
  }
}

function diffArray(left, right, path, diffs) {
  const maxLen = Math.max(left.length, right.length)

  for (let i = 0; i < maxLen; i++) {
    const childPath = pathJoin(path, path === '/' ? '' : '/', `[${i}]`)

    if (i >= left.length) {
      diffs.push({
        path: childPath,
        type: DiffType.MISSING,
        msg: `左侧缺少元素 [${i}]`,
        leftVal: undefined,
        rightVal: right[i],
      })
    } else if (i >= right.length) {
      diffs.push({
        path: childPath,
        type: DiffType.MISSING,
        msg: `右侧缺少元素 [${i}]`,
        leftVal: left[i],
        rightVal: undefined,
      })
    } else {
      diffVal(left[i], right[i], childPath, diffs)
    }
  }
}

/**
 * 格式化 JSON 并记录每行对应的 path
 * @param {*} data - JSON 数据
 * @param {string} indent - 缩进字符串
 * @returns {{ lines: Array<{text: string, path: string, indent: number}> }}
 */
export function formatJsonWithPaths(data, sortKeys = true) {
  const lines = []
  formatValue(data, '', '/', lines, 0, sortKeys, false)
  return lines
}

function formatValue(value, prefix, path, lines, depth, sortKeys, isLast) {
  const suffix = isLast ? '' : ','
  const type = getType(value)

  if (type === 'object') {
    const keys = sortKeys
      ? Object.keys(value).sort((a, b) => a.localeCompare(b))
      : Object.keys(value)

    if (keys.length === 0) {
      lines.push({ text: `${prefix}{}${suffix}`, path, depth })
      return
    }

    lines.push({ text: `${prefix}{`, path, depth })
    keys.forEach((key, i) => {
      const childPath = path === '/' ? `/${key}` : `${path}/${key}`
      const keyPrefix = `"${escapeJsonStr(key)}": `
      formatValue(value[key], keyPrefix, childPath, lines, depth + 1, sortKeys, i === keys.length - 1)
    })
    lines.push({ text: `}${suffix}`, path, depth })
  } else if (type === 'array') {
    if (value.length === 0) {
      lines.push({ text: `${prefix}[]${suffix}`, path, depth })
      return
    }

    lines.push({ text: `${prefix}[`, path, depth })
    value.forEach((item, i) => {
      const childPath = path === '/' ? `/[${i}]` : `${path}/[${i}]`
      formatValue(item, '', childPath, lines, depth + 1, sortKeys, i === value.length - 1)
    })
    lines.push({ text: `]${suffix}`, path, depth })
  } else if (type === 'string') {
    lines.push({ text: `${prefix}"${escapeJsonStr(value)}"${suffix}`, path, depth })
  } else if (type === 'null') {
    lines.push({ text: `${prefix}null${suffix}`, path, depth })
  } else {
    lines.push({ text: `${prefix}${value}${suffix}`, path, depth })
  }
}

function escapeJsonStr(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\b/g, '\\b')
}

/**
 * 根据 diff 列表为格式化后的行标记差异类型
 * @param {Array} lines - formatJsonWithPaths 的输出
 * @param {Array} diffs - diffJson 的输出
 * @param {'left'|'right'} side - 标记哪一侧
 * @returns {Array<{text: string, path: string, depth: number, diffType: string|null, diffIndex: number|null}>}
 */
export function markDiffLines(lines, diffs, side) {
  const pathToDiff = new Map()

  diffs.forEach((diff, index) => {
    if (!pathToDiff.has(diff.path)) {
      pathToDiff.set(diff.path, { type: diff.type, index })
    }
  })

  return lines.map((line) => {
    let diffType = null
    let diffIndex = null

    for (const [diffPath, diffInfo] of pathToDiff) {
      if (line.path === diffPath || line.path.startsWith(diffPath + '/')) {
        // 对于 MISSING 类型，只标记对应的一侧
        if (diffInfo.type === DiffType.MISSING) {
          const diff = diffs[diffInfo.index]
          if (side === 'left' && diff.leftVal !== undefined) {
            diffType = diffInfo.type
            diffIndex = diffInfo.index
          } else if (side === 'right' && diff.rightVal !== undefined) {
            diffType = diffInfo.type
            diffIndex = diffInfo.index
          } else if (line.path === diffPath) {
            diffType = diffInfo.type
            diffIndex = diffInfo.index
          }
        } else {
          diffType = diffInfo.type
          diffIndex = diffInfo.index
        }
        break
      }
    }

    return { ...line, diffType, diffIndex }
  })
}
