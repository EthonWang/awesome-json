import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap, placeholder as placeholderExtension } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { foldGutter, indentOnInput, syntaxHighlighting, HighlightStyle, bracketMatching, foldKeymap, codeFolding } from '@codemirror/language'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { search, searchKeymap, highlightSelectionMatches, openSearchPanel } from '@codemirror/search'
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import { createSearchPanel, searchPanelTheme, openSearchPanelWithReplace } from './CustomSearchPanel.js'

function foldDescription(state, range) {
  const before = range.from > 0 ? state.doc.sliceString(range.from - 1, range.from) : ''
  const after = range.to < state.doc.length ? state.doc.sliceString(range.to, range.to + 1) : ''
  const type = before === '[' || after === ']' ? 'array' : 'object'
  try {
    const value = JSON.parse(state.doc.sliceString(range.from - 1, range.to + 1))
    const count = Array.isArray(value) ? value.length : Object.keys(value).length
    return { type, count }
  } catch {
    return { type, count: null }
  }
}

const jsonHighlight = HighlightStyle.define([
  { tag: tags.propertyName, color: '#47699c' },
  { tag: tags.string, color: '#087c71' },
  { tag: tags.number, color: '#9c64ae' },
  { tag: tags.bool, color: '#a16538' },
  { tag: tags.null, color: '#a16538' },
  { tag: tags.punctuation, color: '#587181' },
])

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: '#fff', color: '#1c394d' },
  '.cm-scroller': { overflow: 'auto', fontFamily: '"SFMono-Regular", "Cascadia Code", Consolas, monospace', lineHeight: '27px' },
  '.cm-content': { padding: '14px 0', caretColor: '#315bbe' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '.cm-gutters': { backgroundColor: '#f6f9fb', color: '#91a8b5', border: 'none', paddingLeft: '3px' },
  '.cm-activeLineGutter': { backgroundColor: '#eaf0f5', color: '#456980' },
  // Selection is drawn underneath the content, so keep the line tint translucent.
  '.cm-activeLine': { backgroundColor: 'rgba(49, 91, 190, 0.06)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#c7dcf6 !important' },
  '.cm-cursor': { borderLeftColor: '#315bbe' },
  '.cm-placeholder': { color: '#a4b5bf' },
  '.cm-foldPlaceholder': { color: '#2f68a9', border: '1px solid #bfd4eb', background: '#e9f3ff', borderRadius: '4px' },
  '&.cm-focused': { outline: 'none' },
})

function createExtensions(placeholderText) {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    codeFolding({
      preparePlaceholder: foldDescription,
      placeholderDOM(_view, onclick, prepared) {
        const element = document.createElement('span')
        element.className = 'cm-fold-placeholder'
        element.textContent = prepared.count === null
          ? (prepared.type === 'array' ? '[ … ]' : '{ … }')
          : (prepared.type === 'array' ? '[ … ' + prepared.count + ' items ]' : '{ … ' + prepared.count + ' keys }')
        element.title = '点击展开'
        element.onclick = onclick
        return element
      },
    }),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(jsonHighlight),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true, createPanel: createSearchPanel }),
    searchPanelTheme,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      { key: 'Mod-h', run: openSearchPanelWithReplace },
    ]),
    json(),
    placeholderExtension(placeholderText),
    editorTheme,
  ]
}

const CodeEditor = forwardRef(function CodeEditor({ value, onChange, onCursorChange, active = true, placeholder = '在此处输入 JSON', className = '' }, ref) {
  const viewRef = useRef(null)
  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange
  const extensions = useMemo(() => createExtensions(placeholder), [placeholder])

  const onUpdate = useCallback((update) => {
    if (!onCursorChangeRef.current || (!update.selectionSet && !update.docChanged)) return
    const head = update.state.selection.main.head
    const line = update.state.doc.lineAt(head)
    onCursorChangeRef.current(line.number, head - line.from + 1)
  }, [])

  useImperativeHandle(ref, () => ({
    focus() { viewRef.current?.focus() },
    measure() { viewRef.current?.requestMeasure() },
    openSearch() {
      if (!viewRef.current) return
      openSearchPanel(viewRef.current)
      viewRef.current.focus()
    },
    getView() { return viewRef.current },
  }), [])

  useEffect(() => {
    if (active) requestAnimationFrame(() => viewRef.current?.requestMeasure())
  }, [active])

  return (
    <CodeMirror
      className={'code-mirror ' + className}
      value={value}
      onChange={onChange}
      onUpdate={onUpdate}
      extensions={extensions}
      basicSetup={false}
      height="100%"
      onCreateEditor={(view) => { viewRef.current = view }}
    />
  )
})

export default CodeEditor
