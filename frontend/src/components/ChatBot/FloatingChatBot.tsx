import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle, Trash2 } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// @ts-expect-error — ThemeContext is a .jsx file
import { useTheme } from '../../context/ThemeContext'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

// Structured scan reference returned by /chat/message. Generic answers still
// return plain string labels, so `sources` is a union.
interface ChatSource {
  scan_id: string
  domain: string
  completed_at: string | null
}

interface ChatMessageResponse {
  response: string
  confidence?: number | null
  sources?: (ChatSource | string)[] | null
  sources_display?: string[] | null
  suggestions?: string[] | null
}

const STORAGE_KEY = 'jarsh_chat_history'

function loadChatHistory(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return (JSON.parse(stored) as any[]).map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
    }
  } catch { /* silent */ }
  return [{
    id: '1', sender: 'bot', timestamp: new Date(),
    text: "Namaste! I'm JARSH — your quantum cryptography intelligence assistant. Ask me anything about your security posture, mitigation strategies, or scan analysis. 🔐",
  }]
}

function saveChatHistory(messages: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* silent */ }
}

// Colour tokens — avoids duplicating logic per theme
const ACCENT  = '#6366f1'  // indigo-500 — primary action colour
const ACCENT2 = '#818cf8'  // indigo-400 — lighter tint

export function FloatingChatBot() {
  const { isDarkMode } = useTheme() as any

  const t = isDarkMode ? {
    windowBg:      'linear-gradient(160deg, #0d0f1e 0%, #151a2e 100%)',
    windowBorder:  'rgba(99,102,241,0.22)',
    windowShadow:  '0 32px 64px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
    headerBg:      'linear-gradient(135deg, #1a1f36 0%, #0d0f1e 100%)',
    headerBorder:  'rgba(99,102,241,0.18)',
    msgAreaBg:     '#09091a',
    botMsgBg:      '#14182b',
    botMsgBorder:  '#1f2440',
    botMsgColor:   '#e2e8f0',
    inputAreaBg:   '#0d0f1e',
    inputBg:       '#1a1f36',
    inputBorder:   '#252d4a',
    inputColor:    '#e2e8f0',
    timestampColor:'#4a5568',
    subText:       '#8b9ab5',
    titleColor:    '#f1f5f9',
    iconColor:     '#8b9ab5',
  } : {
    windowBg:      'linear-gradient(160deg, #ffffff 0%, #f5f7ff 100%)',
    windowBorder:  'rgba(99,102,241,0.18)',
    windowShadow:  '0 32px 64px -12px rgba(99,102,241,0.14), 0 0 0 1px rgba(99,102,241,0.10)',
    headerBg:      'linear-gradient(135deg, #eef2ff 0%, #f5f7ff 100%)',
    headerBorder:  'rgba(99,102,241,0.14)',
    msgAreaBg:     '#f8faff',
    botMsgBg:      '#ffffff',
    botMsgBorder:  'rgba(99,102,241,0.14)',
    botMsgColor:   '#0f172a',
    inputAreaBg:   '#ffffff',
    inputBg:       '#f1f5f9',
    inputBorder:   'rgba(99,102,241,0.18)',
    inputColor:    '#0f172a',
    timestampColor:'#94a3b8',
    subText:       '#64748b',
    titleColor:    '#0f172a',
    iconColor:     '#475569',
  }

  const [isOpen,     setIsOpen]     = useState(false)
  const [messages,   setMessages]   = useState<Message[]>(loadChatHistory)
  const [inputText,  setInputText]  = useState('')
  const [isLoading,  setIsLoading]  = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { saveChatHistory(messages) }, [messages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!inputText.trim()) return
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputText, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)
    try {
      const res = await axios.post('/api/v1/chat/message', { message: inputText, context: 'general' })
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(),
        text: res.data.response || 'I understand. Please provide more details.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot', timestamp: new Date(),
        text: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearHistory = () => {
    if (!window.confirm('Clear all chat history?')) return
    const init: Message = { id: '1', sender: 'bot', timestamp: new Date(), text: "Namaste! I'm JARSH — your quantum cryptography intelligence assistant. 🔐" }
    setMessages([init])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open JARSH AI assistant"
          title="Chat with JARSH — quantum security AI"
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
            width: 60, height: 60, borderRadius: '9999px',
            background: `linear-gradient(135deg, ${ACCENT} 0%, #4f46e5 100%)`,
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2, fontSize: 10, fontWeight: 700,
            transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
        >
          <MessageCircle size={24} strokeWidth={1.5} aria-hidden="true" />
          <span>JARSH</span>
        </button>
      )}

      {/* ── Chat window ─────────────────────────────────────── */}
      {isOpen && (
        <div
          aria-label="JARSH AI chat window"
          role="dialog"
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
            width: 420, maxWidth: 'calc(100vw - 2rem)',
            height: 520, maxHeight: 'calc(100vh - 4rem)',
            background: t.windowBg, borderRadius: 16,
            boxShadow: t.windowShadow,
            border: `1px solid ${t.windowBorder}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'jarsh-slide 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div style={{
            background: t.headerBg,
            borderBottom: `1px solid ${t.headerBorder}`,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '9999px',
                background: `linear-gradient(135deg, ${ACCENT} 0%, #4f46e5 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 17, fontWeight: 700,
                boxShadow: `0 4px 12px rgba(99,102,241,0.40)`,
              }} aria-hidden="true">⚡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.titleColor, letterSpacing: '0.02em' }}>JARSH</div>
                <div style={{ fontSize: 11, color: t.subText }}>Quantum Security AI</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={clearHistory} title="Clear history" aria-label="Clear chat history"
                style={{ background: 'none', border: 'none', color: t.iconColor, cursor: 'pointer', padding: 6, display: 'flex', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-critical)')}
                onMouseLeave={e => (e.currentTarget.style.color = t.iconColor)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
              <button onClick={() => setIsOpen(false)} title="Close" aria-label="Close chat"
                style={{ background: 'none', border: 'none', color: t.iconColor, cursor: 'pointer', padding: 6, display: 'flex', transition: 'color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = t.titleColor; e.currentTarget.style.transform = 'rotate(90deg)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = t.iconColor; e.currentTarget.style.transform = 'rotate(0)'; }}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: t.msgAreaBg,
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.55,
                  background: msg.sender === 'user'
                    ? `linear-gradient(135deg, ${ACCENT} 0%, #4f46e5 100%)`
                    : t.botMsgBg,
                  color: msg.sender === 'user' ? '#fff' : t.botMsgColor,
                  border: msg.sender === 'user' ? 'none' : `1px solid ${t.botMsgBorder}`,
                  boxShadow: msg.sender === 'user' ? `0 4px 12px rgba(99,102,241,0.25)` : 'none',
                  wordBreak: 'break-word',
                }}>
                  {msg.sender === 'bot' ? (
                    <div className="jarsh-md" style={{ margin: '0 0 3px' }}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ margin: '0 0 3px', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  )}
                  <span style={{ fontSize: 10, display: 'block', marginTop: 3, opacity: 0.6,
                    color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : t.timestampColor }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: t.botMsgBg, padding: '10px 14px', borderRadius: 12,
                  display: 'flex', gap: 5, border: `1px solid ${t.botMsgBorder}` }}>
                  {[0,200,400].map(delay => (
                    <span key={delay} style={{ width: 7, height: 7, borderRadius: '9999px', background: ACCENT2, display: 'block',
                      animation: `jarsh-bounce 1.4s infinite ${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: `1px solid ${t.headerBorder}`, padding: 10,
            background: t.inputAreaBg,
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about scans, mitigations, PQC…"
              rows={2}
              aria-label="Message input"
              style={{
                flex: 1, background: t.inputBg, color: t.inputColor,
                fontSize: 13, border: `1px solid ${t.inputBorder}`,
                borderRadius: 8, padding: '9px 11px',
                resize: 'none', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = `0 0 0 2px rgba(99,102,241,0.15)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
              style={{
                padding: '9px 11px', borderRadius: 8,
                background: isLoading || !inputText.trim()
                  ? 'rgba(99,102,241,0.15)'
                  : `linear-gradient(135deg, ${ACCENT} 0%, #4f46e5 100%)`,
                color: isLoading || !inputText.trim() ? t.iconColor : '#fff',
                border: 'none', cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: !isLoading && inputText.trim() ? `0 4px 12px rgba(99,102,241,0.30)` : 'none',
              }}
              onMouseEnter={e => { if (!isLoading && inputText.trim()) { e.currentTarget.style.transform = 'scale(1.06)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Send size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes jarsh-slide {
          from { opacity:0; transform: translateY(16px) scale(0.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes jarsh-bounce {
          0%,100% { opacity:0.3; transform:translateY(0); }
          50%     { opacity:1;   transform:translateY(-7px); }
        }
        .jarsh-md p   { margin:3px 0; }
        .jarsh-md ul,
        .jarsh-md ol  { margin:3px 0; padding-left:18px; }
        .jarsh-md li  { margin:2px 0; }
        .jarsh-md strong { font-weight:700; }
        .jarsh-md code {
          background: rgba(99,102,241,0.12); padding:1px 5px;
          border-radius:4px; font-family:monospace; font-size:12px;
        }
        .jarsh-md table { width:100%; border-collapse:collapse; margin:6px 0; font-size:12px; }
        .jarsh-md th,
        .jarsh-md td    { padding:5px 8px; border:1px solid rgba(99,102,241,0.20); }
        .jarsh-md hr    { border:none; border-top:1px solid rgba(99,102,241,0.15); margin:7px 0; }
      `}</style>
    </>
  )
}
