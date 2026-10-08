import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Clipboard, ListFilter, X } from 'lucide-react'
import { DiffType, diffJson, formatJsonWithPaths, markDiffLines } from '../utils/jsonDiff.js'

const TOKEN = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)/g

function colorize(text) {
  const parts = []
  let cursor = 0
  let match
  TOKEN.lastIndex = 0
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    const kind = match[1] ? 'key' : match[2] ? 'string' : match[3] ? 'bool' : 'number'
    parts.push(<span className={'tok-' + kind} key={match.index}>{match[0]}</span>)
    cursor = TOKEN.lastIndex
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function buildComparison(left, right) {
  const diffs = diffJson(left, right).map((diff) => ({
    ...diff,
    kind: diff.type === DiffType.MISSING
      ? (diff.leftVal === undefined ? 'added' : 'removed')
      : (diff.type === DiffType.TYPE ? 'type' : 'changed'),
  }))
  return {
    diffs,
    leftLines: markDiffLines(formatJsonWithPaths(left, true), diffs, 'left'),
    rightLines: markDiffLines(formatJsonWithPaths(right, true), diffs, 'right'),
  }
}

const filterOptions = [
  ['all', '全部'],
  ['added', '新增'],
  ['removed', '缺失'],
  ['changed', '修改'],
  ['type', '类型'],
]

const kindLabels = { added: '新增', removed: '缺失', changed: '修改', type: '类型' }

export default function JsonDiffResults({ snapshot, onClose, showToast, active = true }) {
  const { diffs, leftLines, rightLines } = useMemo(() => buildComparison(snapshot.left, snapshot.right), [snapshot])
  const [filter, setFilter] = useState('all')
  const [indexOpen, setIndexOpen] = useState(true)
  const [selected, setSelected] = useState(diffs.length ? 0 : -1)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const listRef = useRef(null)
  const sectionRef = useRef(null)
  const visible = useMemo(() => diffs.map((_, index) => index).filter((index) => filter === 'all' || diffs[index].kind === filter), [diffs, filter])
  const counts = useMemo(() => ({
    all: diffs.length,
    added: diffs.filter((diff) => diff.kind === 'added').length,
    removed: diffs.filter((diff) => diff.kind === 'removed').length,
    changed: diffs.filter((diff) => diff.kind === 'changed').length,
    type: diffs.filter((diff) => diff.kind === 'type').length,
  }), [diffs])

  useEffect(() => {
    setFilter('all')
    setSelected(diffs.length ? 0 : -1)
    setIndexOpen(true)
  }, [snapshot, diffs.length])

  useEffect(() => {
    if (!visible.includes(selected)) setSelected(visible[0] ?? -1)
  }, [visible, selected])

  const scrollToIndex = (index) => {
    const movePane = (ref) => {
      const pane = ref.current
      const row = pane?.querySelector('[data-diff-index="' + index + '"]')
      if (!pane || !row) return
      const target = pane.scrollTop + row.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientHeight / 2 + row.clientHeight / 2
      pane.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }
    requestAnimationFrame(() => {
      movePane(leftRef)
      movePane(rightRef)
      movePane(listRef)
      sectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  const select = (index) => {
    if (!visible.includes(index)) return
    setSelected(index)
    scrollToIndex(index)
  }

  const move = (direction) => {
    const current = visible.indexOf(selected)
    const next = visible[current + direction]
    if (next !== undefined) select(next)
  }

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event) => {
      if (event.target.closest('textarea, input, button, [contenteditable="true"], [role="dialog"]')) return
      if (event.key === 'n' || event.key === 'N' || event.key === 'ArrowRight') {
        event.preventDefault()
        move(1)
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'ArrowLeft') {
        event.preventDefault()
        move(-1)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const renderLines = (lines) => lines.map((line, index) => {
    const hasDiff = line.diffIndex !== null && line.diffIndex !== undefined
    const enabled = hasDiff && visible.includes(line.diffIndex)
    const selectedLine = enabled && line.diffIndex === selected
    const className = [
      'diff-code-line',
      hasDiff ? 'diff-' + diffs[line.diffIndex].kind : '',
      hasDiff && !enabled ? 'muted' : '',
      selectedLine ? 'selected' : '',
      selectedLine && lines[index - 1]?.diffIndex !== selected ? 'selected-start' : '',
      selectedLine && lines[index + 1]?.diffIndex !== selected ? 'selected-end' : '',
    ].filter(Boolean).join(' ')
    return (
      <div
        key={index}
        className={className}
        data-diff-index={hasDiff ? line.diffIndex : undefined}
        role={enabled ? 'button' : undefined}
        tabIndex={enabled ? 0 : undefined}
        aria-label={enabled ? '查看差异：' + diffs[line.diffIndex].msg : undefined}
        onClick={enabled ? () => select(line.diffIndex) : undefined}
        onKeyDown={enabled ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(line.diffIndex) } } : undefined}
      >
        <span className="line-no">{String(index + 1).padStart(2, '0')}</span>
        <span className="code-text">{'  '.repeat(line.depth)}{colorize(line.text)}</span>
      </div>
    )
  })

  const copySummary = async () => {
    const text = diffs.map((diff) => diff.path + '　' + diff.msg).join('\n')
    try {
      await navigator.clipboard.writeText(text || '两侧 JSON 语义完全相同')
      showToast('已复制差异摘要。', 'success')
    } catch {
      showToast('复制失败，请检查浏览器的剪贴板权限后重试。', 'error')
    }
  }

  return (
    <section ref={sectionRef} className="result-workspace" aria-label="JSON 差异结果">
      <div className={'workspace' + (indexOpen ? ' index-open' : '')}>
        <div className="code-surface">
          <div className="surface-header">
            <div className="result-heading"><span className="pulse" /><strong>对比完成</strong><span>{diffs.length ? '发现 ' + diffs.length + ' 处差异' : '两侧 JSON 语义完全相同'}</span>{diffs[selected] && <span className="current-path">当前：{diffs[selected].path}</span>}</div>
            <div className="surface-tools">
              <button className="tiny-btn" type="button" onClick={copySummary}><Clipboard size={14} />复制摘要</button>
              <button className={'tiny-btn index-toggle' + (indexOpen ? ' active' : '')} type="button" aria-expanded={indexOpen} aria-controls="diff-index" onClick={() => setIndexOpen((open) => !open)}><ListFilter size={16} />{indexOpen ? '收起索引' : '展开索引'} <span>{diffs.length}</span></button>
              <button className="icon-btn" type="button" title="关闭对比结果" aria-label="关闭对比结果" onClick={onClose}><X size={15} /></button>
            </div>
          </div>
          <div className="compare-grid">
            <div className="diff-pane">
              <div className="pane-head"><span className="file-emblem">{'{ }'}</span><strong>原始 JSON</strong></div>
              <div className="diff-code-scroll" ref={leftRef}>{renderLines(leftLines)}</div>
            </div>
            <div className="diff-pane">
              <div className="pane-head"><span className="file-emblem">{'{ }'}</span><strong>目标 JSON</strong></div>
              <div className="diff-code-scroll" ref={rightRef}>{renderLines(rightLines)}</div>
            </div>
          </div>
        </div>
        <aside id="diff-index" className="summary" aria-label="差异索引" hidden={!indexOpen}>
          <div className="summary-head">
            <div className="summary-title"><h2>差异索引</h2><button className="index-collapse" type="button" onClick={() => setIndexOpen(false)}>收起面板 <X size={15} /></button></div>
            {diffs.length > 0 && <div className="filters" aria-label="筛选差异">
              {filterOptions.map(([type, label]) => (
                <button key={type} className={'filter diff-' + type + (filter === type ? ' active' : '')} type="button" aria-pressed={filter === type} onClick={() => { setFilter(type); listRef.current?.scrollTo({ top: 0 }) }}>
                  {label} {counts[type]}
                </button>
              ))}
            </div>}
          </div>
          {selected >= 0 && visible.includes(selected) && <div className="detail" aria-live="polite"><small>当前差异　{visible.indexOf(selected) + 1} / {visible.length}</small><strong>{diffs[selected].path}</strong><p>{diffs[selected].msg}</p><div className="detail-nav"><button type="button" onClick={() => move(-1)} disabled={visible.indexOf(selected) <= 0}><ArrowUp size={15} />上一个</button><button type="button" onClick={() => move(1)} disabled={visible.indexOf(selected) >= visible.length - 1}>下一个<ArrowDown size={15} /></button></div></div>}
          {diffs.length > 0 ? (
            <div className="diff-list" ref={listRef}>
              {diffs.map((diff, index) => visible.includes(index) && (
                <button type="button" data-diff-index={index} className={'diff-item' + (index === selected ? ' active' : '')} key={index} onClick={() => select(index)}>
                  <span className={'bar diff-' + diff.kind} /><span><span className={'diff-kind diff-' + diff.kind}>{kindLabels[diff.kind]}</span><span className="path">{diff.path}</span><span className="description">{diff.msg}</span></span>
                </button>
              ))}
            </div>
          ) : <div className="diff-empty"><Check size={24} />结构与值都相同。</div>}
        </aside>
      </div>
    </section>
  )
}
