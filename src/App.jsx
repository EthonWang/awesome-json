import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Braces, CheckCircle2, GitCompare, Info, X } from 'lucide-react'
import EditorPage from './pages/EditorPage.jsx'
import DiffPage from './pages/DiffPage.jsx'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const editorRef = useRef(null)
  const onDiff = location.pathname === '/diff'
  const [notice, setNotice] = useState(null)
  const dirtyRef = useRef(false)
  const toastTimer = useRef(null)

  const openInEditor = (content) => {
    editorRef.current.openTab(content)
    dirtyRef.current = true
    navigate('/')
  }

  const showToast = useCallback((message, type = 'info') => {
    clearTimeout(toastTimer.current)
    setNotice({ message, type })
    toastTimer.current = setTimeout(() => setNotice(null), 3200)
  }, [])

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      clearTimeout(toastTimer.current)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [])

  return (
    <div className="app">
      <div className="stage">
        <header className="topbar">
          <NavLink className="topbar-brand" to="/"><img src={import.meta.env.BASE_URL + 'favicon.ico'} alt="" />Awesome JSON</NavLink>
          <nav className="topbar-nav" aria-label="工作区">
            <NavLink to="/" end><Braces size={18} />JSON 编辑</NavLink>
            <NavLink to="/diff"><GitCompare size={18} />JSON Diff</NavLink>
          </nav>
        </header>
        <main>
          <div hidden={onDiff}><EditorPage ref={editorRef} active={!onDiff} showToast={showToast} onDirty={() => { dirtyRef.current = true }} /></div>
          <div hidden={!onDiff}><DiffPage active={onDiff} showToast={showToast} onOpenEditor={openInEditor} onDirty={() => { dirtyRef.current = true }} /></div>
        </main>
      </div>
      {notice && <div className={'toast ' + notice.type} role="status" aria-live="polite">
        {notice.type === 'success' ? <CheckCircle2 size={19} /> : notice.type === 'error' || notice.type === 'warning' ? <AlertCircle size={19} /> : <Info size={19} />}
        <span>{notice.message}</span>
        <button type="button" aria-label="关闭提示" onClick={() => { clearTimeout(toastTimer.current); setNotice(null) }}><X size={16} /></button>
      </div>}
    </div>
  )
}
