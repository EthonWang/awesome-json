import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import JsonView from '@uiw/react-json-view'
import { Braces, ChevronDown, ChevronUp, Clipboard, Eye, FileJson, GitCompare, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import CodeEditor from '../components/CodeEditor.jsx'
import JsonDiffResults from '../components/JsonDiffResults.jsx'
import { parseJsonInput } from '../utils/jsonActions.js'
import { sampleLeft, sampleLeftText, sampleRight, sampleRightText } from '../utils/sampleData.js'

function SourcePane({ side, value, onChange, active, onAction }) {
  const label = side === 'left' ? '原始 JSON' : '目标 JSON'
  return (
    <section className="source-pane" aria-label={label}>
      <div className="pane-head">
        <div className="source-pane-title">
          <span className="file-emblem">{'{ }'}</span>
          <strong>{label}</strong>
        </div>
        <div className="source-toolbar">
          <button className="tiny-btn" type="button" onClick={() => onAction(side, 'format')}><Braces size={14} />格式化</button>
          <button className="tiny-btn" type="button" onClick={() => onAction(side, 'view')}><Eye size={14} />可视化</button>
          <button className="tiny-btn" type="button" onClick={() => onAction(side, 'copy')}><Clipboard size={14} />复制</button>
          <button className="tiny-btn" type="button" onClick={() => onAction(side, 'edit')}><Pencil size={14} />编辑</button>
          <button className="tiny-btn destructive" type="button" onClick={() => onAction(side, 'clear')}><Trash2 size={14} />清空</button>
        </div>
      </div>
      <div className="source-editor"><CodeEditor value={value} onChange={(text) => onChange(side, text)} active={active} placeholder={'在此处输入' + label} /></div>
    </section>
  )
}

export default function DiffPage({ showToast, onDirty, onOpenEditor, active = true }) {
  const [sources, setSources] = useState({ left: '', right: '' })
  const [snapshot, setSnapshot] = useState(null)
  const [stale, setStale] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [inputCollapsed, setInputCollapsed] = useState(false)
  const resultRef = useRef(null)
  const expandedInput = !snapshot || (!sources.left.trim() && !sources.right.trim())
  const emptyInputs = !sources.left.trim() && !sources.right.trim()

  const setSide = (side, value, user = true) => {
    setSources((current) => ({ ...current, [side]: value }))
    if (snapshot) setStale(true)
    if (user) onDirty()
  }

  const parseSide = (side) => {
    const label = side === 'left' ? '原始 JSON' : '目标 JSON'
    const parsed = parseJsonInput(sources[side], label)
    if (!parsed.ok) showToast(parsed.message, parsed.kind)
    return parsed
  }

  const compare = () => {
    const left = parseSide('left')
    if (!left.ok) return
    const right = parseSide('right')
    if (!right.ok) return
    setSnapshot({ left: left.value, right: right.value })
    setStale(false)
    showToast('对比已更新。', 'success')
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const loadSample = () => {
    setSources({ left: sampleLeftText, right: sampleRightText })
    setSnapshot({ left: sampleLeft, right: sampleRight })
    setStale(false)
    showToast('已载入示例数据。', 'success')
  }

  const clearAll = () => {
    setSources({ left: '', right: '' })
    setSnapshot(null)
    setInputCollapsed(false)
    setStale(false)
    onDirty()
  }

  const onAction = async (side, action) => {
    const label = side === 'left' ? '原始 JSON' : '目标 JSON'
    const text = sources[side]
    if (action === 'clear') { setSide(side, ''); return }
    if (action === 'edit') { onOpenEditor(text); return }
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(text)
        showToast('已复制' + label + '。', 'success')
      } catch {
        showToast('复制失败，请检查浏览器的剪贴板权限后重试。', 'error')
      }
      return
    }
    const parsed = parseSide(side)
    if (!parsed.ok) return
    if (action === 'format') setSide(side, JSON.stringify(parsed.value, null, 2))
    if (action === 'view') setViewer({ label, data: parsed.value })
  }

  return (
    <>
      <h1 className="sr-only">JSON Diff</h1>
      <div className={'source-workspace' + (expandedInput ? ' uncompared' : '') + (emptyInputs ? ' empty-inputs' : '')}>
        <div className="source-workspace-head">
          <div className="source-workspace-actions">
            <button className="btn" type="button" onClick={loadSample}><Sparkles size={15} />载入示例</button>
            {snapshot && <button className="btn" type="button" aria-expanded={!inputCollapsed} aria-controls="diff-source-inputs" onClick={() => setInputCollapsed((collapsed) => !collapsed)}>
              {inputCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}{inputCollapsed ? '展开输入' : '收起输入'}
            </button>}
          </div>
          <div className="source-workspace-actions">
            <button className="btn destructive" type="button" onClick={clearAll}><Trash2 size={15} />清空两侧</button>
            <button className="btn primary" type="button" onClick={compare}><GitCompare size={16} />{snapshot ? '重新对比' : '开始对比'}</button>
          </div>
        </div>
        <div className="source-grid" id="diff-source-inputs" hidden={Boolean(snapshot) && inputCollapsed}>
          <SourcePane side="left" value={sources.left} onChange={setSide} onAction={onAction} active={active} />
          <SourcePane side="right" value={sources.right} onChange={setSide} onAction={onAction} active={active} />
        </div>
      </div>

      {snapshot && stale && <div className="stale-notice" role="status"><span>输入内容已变化，下面显示的是上一次对比结果。</span><button type="button" onClick={compare}>重新对比</button></div>}
      <div ref={resultRef}>
        {snapshot ? (
          <JsonDiffResults
            snapshot={snapshot}
            active={active}
            showToast={showToast}
            onClose={() => { setSnapshot(null); setStale(false); setInputCollapsed(false) }}
          />
        ) : (sources.left.trim() || sources.right.trim()) ? (
          <div className="result-placeholder"><FileJson size={34} strokeWidth={1.4} /><h2>暂无对比结果</h2><button className="btn primary" type="button" onClick={compare}>开始对比</button></div>
        ) : null}
      </div>

      <Dialog.Root open={Boolean(viewer)} onOpenChange={(open) => { if (!open) setViewer(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="viewer-dialog" aria-describedby={undefined}>
            <div className="viewer-head"><Dialog.Title><FileJson size={19} />{viewer?.label} · 可视化</Dialog.Title><Dialog.Close className="icon-btn" aria-label="关闭可视化"><X size={18} /></Dialog.Close></div>
            <div className="viewer-content">
              {viewer && viewer.data !== null && typeof viewer.data === 'object'
                ? <JsonView
                    className="json-viewer"
                    value={viewer.data}
                    style={{ fontSize: '14px', lineHeight: '26px' }}
                    indentWidth={20}
                    collapsed={5}
                    displayDataTypes={false}
                    shortenTextAfterLength={0}
                    highlightUpdates={false}
                    enableClipboard
                  >
                    <JsonView.CountInfo
                      style={{ fontStyle: 'normal', fontSize: '13px' }}
                      render={(props) => <span {...props}>{props['data-length']} 项</span>}
                    />
                  </JsonView>
                : <pre>{JSON.stringify(viewer?.data, null, 2)}</pre>}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
