import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Braces, Check, Clipboard, FileJson, Minimize2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import CodeEditor from '../components/CodeEditor.jsx'
import { addEscaping, jsonError, parseJsonInput, removeEscaping } from '../utils/jsonActions.js'

export default function EditorPage({ showToast, onDirty, active = true }) {
  const [tabs, setTabs] = useState([{ id: 1, title: 'Tab 1', content: '', error: '', cursor: { line: 1, column: 1 } }])
  const [activeId, setActiveId] = useState(1)
  const [autoFormat, setAutoFormat] = useState(true)
  const notifiedErrors = useRef(new Set())
  const nextId = useRef(2)
  const editors = useRef(new Map())
  const timers = useRef(new Map())
  const currentTab = tabs.find((tab) => tab.id === activeId) || tabs[0]
  const cursor = currentTab.cursor || { line: 1, column: 1 }

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (active) requestAnimationFrame(() => editors.current.get(activeId)?.measure())
  }, [active, activeId])

  useEffect(() => {
    if (!currentTab.error) {
      notifiedErrors.current.delete(currentTab.id)
      return
    }
    if (!active || notifiedErrors.current.has(currentTab.id)) return
    const timer = setTimeout(() => {
      notifiedErrors.current.add(currentTab.id)
      showToast(currentTab.error, 'error')
    }, 1200)
    return () => clearTimeout(timer)
  }, [active, currentTab.id, currentTab.content, currentTab.error, showToast])

  const setTabContent = useCallback((id, content) => {
    setTabs((current) => current.map((tab) => tab.id === id ? { ...tab, content, error: jsonError(content) } : tab))
  }, [])

  const setCursor = useCallback((id, line, column) => {
    setTabs((current) => {
      const tab = current.find((item) => item.id === id)
      if (!tab || (tab.cursor?.line === line && tab.cursor?.column === column)) return current
      return current.map((item) => item.id === id ? { ...item, cursor: { line, column } } : item)
    })
  }, [])

  const onEditorChange = (id, content) => {
    setTabContent(id, content)
    onDirty()
    clearTimeout(timers.current.get(id))
    if (!autoFormat) return
    const parsed = parseJsonInput(content)
    if (!parsed.ok) return
    timers.current.set(id, setTimeout(() => {
      setTabs((current) => current.map((tab) => {
        if (tab.id !== id || tab.content !== content) return tab
        const formatted = JSON.stringify(parsed.value, null, 2)
        return formatted === content ? tab : { ...tab, content: formatted, error: '' }
      }))
    }, 800))
  }

  const addTab = () => {
    const id = nextId.current++
    setTabs((current) => [...current, { id, title: 'Tab ' + id, content: '', error: '', cursor: { line: 1, column: 1 } }])
    setActiveId(id)
  }

  const closeTab = (id) => {
    if (tabs.length <= 1) return
    const index = tabs.findIndex((tab) => tab.id === id)
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    editors.current.delete(id)
    const remaining = tabs.filter((tab) => tab.id !== id)
    setTabs(remaining)
    if (id === activeId) setActiveId(remaining[Math.min(index, remaining.length - 1)].id)
  }

  const updateActive = (content) => {
    clearTimeout(timers.current.get(activeId))
    setTabContent(activeId, content)
    onDirty()
  }

  const transform = (mode) => {
    const parsed = parseJsonInput(currentTab.content)
    if (!parsed.ok) { showToast(parsed.message, parsed.kind); return }
    updateActive(JSON.stringify(parsed.value, null, mode === 'format' ? 2 : 0))
    showToast(mode === 'format' ? '已格式化当前 JSON。' : '已压缩当前 JSON。', 'success')
  }

  const validate = () => {
    const parsed = parseJsonInput(currentTab.content)
    if (!parsed.ok) { showToast(parsed.message, parsed.kind); return }
    showToast('JSON 格式正确。', 'success')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentTab.content)
      showToast('已复制当前标签页的内容。', 'success')
    } catch {
      showToast('复制失败，请检查浏览器的剪贴板权限后重试。', 'error')
    }
  }

  return (
    <div className="editor-page">
      <h1 className="sr-only">JSON 编辑器</h1>
      <div className="editor-layout">
        <section className="code-surface editor-main" aria-label="JSON 编辑器">
          <Tabs.Root value={String(activeId)} onValueChange={(value) => setActiveId(Number(value))}>
            <div className="editor-tabs">
              <Tabs.List className="editor-tab-list" aria-label="编辑器标签页">
                {tabs.map((tab) => (
                  <div className={'editor-tab-wrap' + (tab.id === activeId ? ' active' : '')} key={tab.id}>
                    <Tabs.Trigger className="editor-tab" value={String(tab.id)}>
                      <FileJson size={15} className={tab.error ? 'tab-error-icon' : ''} />
                      <span>{tab.title}</span>
                    </Tabs.Trigger>
                    {tabs.length > 1 && <button className="tab-close" type="button" aria-label={'关闭 ' + tab.title} onClick={() => closeTab(tab.id)}><X size={13} /></button>}
                  </div>
                ))}
              </Tabs.List>
              <button className="editor-add" type="button" aria-label="新建标签页" title="新建标签页" onClick={addTab}><Plus size={18} /></button>
            </div>
          </Tabs.Root>
          <div className="editor-toolbar">
            <button className={'tiny-btn auto' + (autoFormat ? ' active' : '')} type="button" aria-pressed={autoFormat} title="输入停止 800 毫秒后自动格式化有效 JSON" onClick={() => setAutoFormat((value) => !value)}>
              <Sparkles size={14} /> 自动格式化：{autoFormat ? '开' : '关'}
            </button>
            <span className="tool-divider" aria-hidden="true" />
            <button className="tiny-btn" type="button" onClick={() => transform('format')}><Braces size={14} />格式化</button>
            <button className="tiny-btn" type="button" onClick={() => transform('compress')}><Minimize2 size={14} />压缩</button>
            <button className="tiny-btn" type="button" onClick={validate}><Check size={14} />校验</button>
            <span className="tool-divider" aria-hidden="true" />
            <button className="tiny-btn" type="button" onClick={() => editors.current.get(activeId)?.openSearch()}><Search size={14} />搜索</button>
            <button className="tiny-btn" type="button" onClick={copy}><Clipboard size={14} />复制</button>
            <span className="tool-divider" aria-hidden="true" />
            <button className="tiny-btn" type="button" onClick={() => updateActive(removeEscaping(currentTab.content))}>去转义</button>
            <button className="tiny-btn" type="button" onClick={() => updateActive(addEscaping(currentTab.content))}>转义</button>
            <span className="tool-divider" aria-hidden="true" />
            <button className="tiny-btn destructive" type="button" onClick={() => updateActive('')}><Trash2 size={14} />清空</button>
            <span className="spacer" />
            <span className={'editor-validation ' + (currentTab.error ? 'invalid' : currentTab.content.trim() ? 'valid' : '')} title={currentTab.error || ''}>
              {currentTab.error ? 'JSON 格式有误' : currentTab.content.trim() ? 'JSON 合法' : '等待输入'}
            </span>
          </div>
          <div className="editor-stack">
            {tabs.map((tab) => (
              <div className="editor-instance" key={tab.id} hidden={tab.id !== activeId}>
                <CodeEditor
                  ref={(api) => { if (api) editors.current.set(tab.id, api); else editors.current.delete(tab.id) }}
                  value={tab.content}
                  onChange={(value) => onEditorChange(tab.id, value)}
                  onCursorChange={(line, column) => setCursor(tab.id, line, column)}
                  active={active && tab.id === activeId}
                />
              </div>
            ))}
          </div>
          <div className="surface-footer"><span>{tabs.length} 个标签页　·　{currentTab.content.length} 字符</span><span>第 {cursor.line} 行，第 {cursor.column} 列</span></div>
        </section>
      </div>
    </div>
  )
}
