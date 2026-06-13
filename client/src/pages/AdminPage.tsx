import { useState, useEffect, useCallback, useMemo } from 'react'
import PinGate from '../components/PinGate'
import { Question, QuestionInput } from 'azkivz-shared'

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mod_token'))
  const [questions, setQuestions] = useState<Question[]>([])
  const [form, setForm] = useState<Partial<QuestionInput & { id?: number }>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [activeTab, setActiveTab] = useState<'questions' | 'yesno'>('questions')
  const [yesnoQuestions, setYesnoQuestions] = useState<{ id: number; text: string; answer: string }[]>([])
  const [yesnoForm, setYesnoForm] = useState({ text: '', answer: 'Ano' })
  const [yesnoEditing, setYesnoEditing] = useState<number | null>(null)
  const [yesnoImportText, setYesnoImportText] = useState('')
  const [yesnoImportStatus, setYesnoImportStatus] = useState('')

  // All hooks MUST be before any early return
  const authHeaders = useMemo<Record<string, string>>(
    () => ({ Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' }),
    [token]
  )

  const fetchQuestions = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/questions', { headers: authHeaders })
    if (res.ok) setQuestions(await res.json())
  }, [token, authHeaders])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const fetchYesno = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/questions/yesno', { headers: authHeaders })
    if (res.ok) setYesnoQuestions(await res.json())
  }, [token, authHeaders])

  useEffect(() => { fetchYesno() }, [fetchYesno])

  if (!token) return <PinGate onSuccess={(t) => { localStorage.setItem('mod_token', t); setToken(t) }} />

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    let res: Response
    if (editing !== null) {
      res = await fetch(`/api/questions/${editing}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(form) })
    } else {
      res = await fetch('/api/questions', { method: 'POST', headers: authHeaders, body: JSON.stringify(form) })
    }
    if (!res.ok) { alert('Uložení selhalo'); return }
    setForm({})
    setEditing(null)
    fetchQuestions()
  }

  async function handleDelete(id: number) {
    if (!confirm('Smazat otázku?')) return
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE', headers: authHeaders })
    if (!res.ok) { alert('Smazání selhalo'); return }
    fetchQuestions()
  }

  async function handleImport() {
    setImportStatus('Importuji…')
    try {
      const data = JSON.parse(importText)
      const res = await fetch('/api/questions/import', { method: 'POST', headers: authHeaders, body: JSON.stringify(data) })
      const result = await res.json()
      setImportStatus(`✓ Importováno ${result.imported} otázek`)
      setImportText('')
      fetchQuestions()
    } catch (e: unknown) {
      setImportStatus(`✗ Chyba: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function handleYesnoSave(e: React.FormEvent) {
    e.preventDefault()
    let res: Response
    if (yesnoEditing !== null) {
      res = await fetch(`/api/questions/yesno/${yesnoEditing}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(yesnoForm) })
    } else {
      res = await fetch('/api/questions/yesno', { method: 'POST', headers: authHeaders, body: JSON.stringify(yesnoForm) })
    }
    if (!res.ok) { alert('Uložení selhalo'); return }
    setYesnoForm({ text: '', answer: 'Ano' })
    setYesnoEditing(null)
    fetchYesno()
  }

  async function handleYesnoDelete(id: number) {
    if (!confirm('Smazat otázku?')) return
    const res = await fetch(`/api/questions/yesno/${id}`, { method: 'DELETE', headers: authHeaders })
    if (!res.ok) { alert('Smazání selhalo'); return }
    fetchYesno()
  }

  async function handleYesnoImport() {
    setYesnoImportStatus('Importuji…')
    try {
      const data = JSON.parse(yesnoImportText)
      const res = await fetch('/api/questions/yesno/import', { method: 'POST', headers: authHeaders, body: JSON.stringify(data) })
      const result = await res.json()
      setYesnoImportStatus(`✓ Importováno ${result.imported} otázek`)
      setYesnoImportText('')
      fetchYesno()
    } catch (e: unknown) {
      setYesnoImportStatus(`✗ Chyba: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', width: '100%',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#f1f5f9', padding: 24, fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #f97316, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AZkvíz</span>
        <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase' as const }}>Admin</span>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>← Zpět na hru</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Question list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setActiveTab('questions')} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: activeTab === 'questions' ? 'linear-gradient(135deg, #f97316, #c2410c)' : 'rgba(255,255,255,0.06)', color: activeTab === 'questions' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
              Otázky ({questions.length})
            </button>
            <button onClick={() => setActiveTab('yesno')} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: activeTab === 'yesno' ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'rgba(255,255,255,0.06)', color: activeTab === 'yesno' ? 'white' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
              Ano/Ne ({yesnoQuestions.length})
            </button>
          </div>
          {activeTab === 'questions' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {questions.map(q => (
                <div key={q.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flexShrink: 0, minWidth: 36, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'linear-gradient(135deg, #f97316, #c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.75rem', padding: '0 4px' }}>
                    {q.answerHint}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 4 }}>{q.text}</div>
                    <div style={{ fontSize: '0.78rem', color: '#22d3ee' }}>→ {q.answer}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setEditing(q.id); setForm({ text: q.text, answer: q.answer, answerHint: q.answerHint }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}>Editovat</button>
                    <button onClick={() => handleDelete(q.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}>Smazat</button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Žádné otázky</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {yesnoQuestions.map(q => (
                <div key={q.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flexShrink: 0, width: 40, height: 46, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: 'linear-gradient(135deg, #f59e0b, #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.7rem' }}>
                    A/N
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 4 }}>{q.text}</div>
                    <div style={{ fontSize: '0.78rem', color: '#22d3ee' }}>→ {q.answer}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setYesnoEditing(q.id); setYesnoForm({ text: q.text, answer: q.answer }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem' }}>Editovat</button>
                    <button onClick={() => handleYesnoDelete(q.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}>Smazat</button>
                  </div>
                </div>
              ))}
              {yesnoQuestions.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>Žádné ano/ne otázky</div>}
            </div>
          )}
        </div>

        {/* Right: Add/Edit form + JSON import */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeTab === 'questions' ? (
            <>
              {/* Form */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>{editing !== null ? 'Upravit otázku' : 'Přidat otázku'}</h3>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea value={form.text ?? ''} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Text otázky" rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
                  <input value={form.answer ?? ''} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Správná odpověď" style={inputStyle} required />
                  <input value={form.answerHint ?? ''} onChange={e => setForm(f => ({ ...f, answerHint: e.target.value }))} placeholder="Hint (nechej prázdné = auto)" style={inputStyle} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                      {editing !== null ? '✓ Uložit' : '+ Přidat'}
                    </button>
                    {editing !== null && (
                      <button type="button" onClick={() => { setEditing(null); setForm({}) }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Zrušit</button>
                    )}
                  </div>
                </form>
              </div>

              {/* JSON Import */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Import z JSON</h3>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8 }}>
                  {`[{"text":"...","answer":"..."}]`}
                </div>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Vlož JSON nebo načti soubor…" rows={5} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: 8, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' as const }}>
                    📂 Načíst soubor
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => setImportText(ev.target?.result as string)
                      reader.readAsText(file)
                    }} />
                  </label>
                  <button onClick={handleImport} disabled={!importText.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: importText.trim() ? 'linear-gradient(135deg, #6366f1, #4338ca)' : 'rgba(99,102,241,0.2)', color: importText.trim() ? 'white' : '#6366f1', fontWeight: 700, cursor: importText.trim() ? 'pointer' : 'default', fontSize: '0.85rem' }}>
                    ⬆ Importovat
                  </button>
                </div>
                {importStatus && <div style={{ fontSize: '0.8rem', color: importStatus.startsWith('✓') ? '#22c55e' : '#f87171' }}>{importStatus}</div>}
              </div>
            </>
          ) : (
            <>
              {/* Yes/No Form */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>{yesnoEditing !== null ? 'Upravit ano/ne otázku' : 'Přidat ano/ne otázku'}</h3>
                <form onSubmit={handleYesnoSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea value={yesnoForm.text} onChange={e => setYesnoForm(f => ({ ...f, text: e.target.value }))} placeholder="Text otázky" rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
                  <select value={yesnoForm.answer} onChange={e => setYesnoForm(f => ({ ...f, answer: e.target.value }))} style={inputStyle} required>
                    <option value="Ano">Ano</option>
                    <option value="Ne">Ne</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                      {yesnoEditing !== null ? '✓ Uložit' : '+ Přidat'}
                    </button>
                    {yesnoEditing !== null && (
                      <button type="button" onClick={() => { setYesnoEditing(null); setYesnoForm({ text: '', answer: 'Ano' }) }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Zrušit</button>
                    )}
                  </div>
                </form>
              </div>

              {/* Yes/No JSON Import */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>Import z JSON</h3>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 8 }}>
                  {`[{"text":"Je Nile delší než Amazon?","answer":"Ano"}]`}
                </div>
                <textarea value={yesnoImportText} onChange={e => setYesnoImportText(e.target.value)} placeholder="Vlož JSON nebo načti soubor…" rows={4} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.78rem', marginBottom: 8, resize: 'vertical' }} />
                <button onClick={handleYesnoImport} disabled={!yesnoImportText.trim()} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: yesnoImportText.trim() ? 'linear-gradient(135deg, #f59e0b, #b45309)' : 'rgba(245,158,11,0.2)', color: yesnoImportText.trim() ? 'white' : '#f59e0b', fontWeight: 700, cursor: yesnoImportText.trim() ? 'pointer' : 'default', fontSize: '0.85rem' }}>
                  ⬆ Importovat
                </button>
                {yesnoImportStatus && <div style={{ fontSize: '0.8rem', marginTop: 8, color: yesnoImportStatus.startsWith('✓') ? '#22c55e' : '#f87171' }}>{yesnoImportStatus}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
