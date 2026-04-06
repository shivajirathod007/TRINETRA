import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle, Trash2 } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

const STORAGE_KEY = 'jarsh_chat_history'

const loadChatHistory = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }
  } catch (error) {
    console.error('Failed to load chat history:', error)
  }
  return [
    {
      id: '1',
      sender: 'bot',
      text: "Namaste! I'm JARSH, your quantum cryptography intelligence assistant. Ask me anything about your security posture, mitigation strategies, or scan analysis. 🔐",
      timestamp: new Date()
    }
  ]
}

const saveChatHistory = (messages: Message[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.error('Failed to save chat history:', error)
  }
}

export function FloatingChatBot() {
  useEffect(() => {
    console.log('✅ JARSH ChatBot Component Mounted')
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(loadChatHistory())
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await axios.post('/api/v1/chat/message', {
        message: inputText,
        context: 'general'
      })

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.data.response || 'I understand. Please provide more details.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // FIX: Use onKeyDown instead of deprecated onKeyPress
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearHistory = () => {
    const confirmClear = window.confirm('Clear all chat history?')
    if (confirmClear) {
      const initialMessage: Message = {
        id: '1',
        sender: 'bot',
        text: "Namaste! I'm JARSH, your quantum cryptography intelligence assistant. Ask me anything about your security posture, mitigation strategies, or scan analysis. 🔐",
        timestamp: new Date()
      }
      setMessages([initialMessage])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 9999,
              width: '64px',
              height: '64px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f97316 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: 'jarsh-pulse 2.5s ease-in-out infinite',
              outline: '2px solid rgba(255,255,255,0.1)',
              outlineOffset: '-2px',
            }}
            title="Chat with JARSH - Ask about your security posture"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3)'
            }}
          >
            <MessageCircle size={28} strokeWidth={1.5} />
            <span>JARSH</span>
          </button>

          <style>{`
            @keyframes jarsh-pulse {
              0%, 100% { box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3); }
              50% { box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.5); }
            }
          `}</style>
        </>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          <div style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            zIndex: 9999,
            width: '420px',
            height: '520px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'jarsh-slide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>

            {/* Header */}
            <div style={{
              background: 'linear-gradient(to right, #1e293b 0%, #334155 50%, #1e293b 100%)',
              borderBottom: '1px solid #334155',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,  // FIX: Prevent header from shrinking
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f97316 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>JARSH</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Quantum Security AI</div>
                </div>
              </div>

              {/* FIX: Added missing closing div for button group */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={clearHistory}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'scale(1.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.transform = 'scale(1)' }}
                  title="Clear chat history"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(90deg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.transform = 'rotate(0deg)' }}
                  title="Close chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#020617',
            }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    animation: 'jarsh-fadeIn 0.3s ease-out'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : '#1e293b',
                    color: msg.sender === 'user' ? 'white' : '#e2e8f0',
                    border: msg.sender === 'user' ? 'none' : '1px solid #334155',
                    boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none',
                    wordBreak: 'break-word',
                  }}>
                    {msg.sender === 'bot' ? (
                      <div className="markdown-content" style={{ margin: '0 0 4px 0' }}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ margin: '0 0 4px 0', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                    )}
                    <span style={{
                      fontSize: '11px',
                      color: msg.sender === 'user' ? 'rgba(255,255,255,0.6)' : '#64748b',
                      display: 'block',
                      marginTop: '4px',
                      opacity: 0.7
                    }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    gap: '6px',
                    border: '1px solid #334155'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', display: 'block', animation: 'jarsh-bounce 1.4s infinite' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', display: 'block', animation: 'jarsh-bounce 1.4s infinite 0.2s' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', display: 'block', animation: 'jarsh-bounce 1.4s infinite 0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              borderTop: '1px solid #334155',
              padding: '12px',
              background: '#0f172a',
              display: 'flex',
              gap: '8px',
              flexShrink: 0,  // FIX: Prevent input bar from shrinking
            }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}  // FIX: was deprecated onKeyPress
                placeholder="Ask about scans, mitigations, PQC..."
                style={{
                  flex: 1,
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ef4444'
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#334155'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                rows={2}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputText.trim()}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isLoading || !inputText.trim()
                    ? '#475569'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !inputText.trim() ? 0.6 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isLoading || !inputText.trim() ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && inputText.trim()) {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                <Send size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          <style>{`
            @keyframes jarsh-slide {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes jarsh-fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes jarsh-bounce {
              0%, 100% { opacity: 0.3; transform: translateY(0); }
              50% { opacity: 1; transform: translateY(-8px); }
            }
            
            /* Markdown styling for bot messages */
            .markdown-content h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 8px 0 4px 0;
              color: #ef4444;
            }
            .markdown-content h2 {
              font-size: 16px;
              font-weight: bold;
              margin: 8px 0 4px 0;
              color: #f97316;
            }
            .markdown-content h3 {
              font-size: 14px;
              font-weight: bold;
              margin: 6px 0 3px 0;
            }
            .markdown-content p {
              margin: 4px 0;
            }
            .markdown-content ul, .markdown-content ol {
              margin: 4px 0;
              padding-left: 20px;
            }
            .markdown-content li {
              margin: 2px 0;
            }
            .markdown-content table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 12px;
            }
            .markdown-content th {
              background: #0f172a;
              padding: 6px;
              text-align: left;
              border: 1px solid #334155;
              font-weight: bold;
            }
            .markdown-content td {
              padding: 6px;
              border: 1px solid #334155;
            }
            .markdown-content code {
              background: #0f172a;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: monospace;
              font-size: 12px;
            }
            .markdown-content strong {
              font-weight: bold;
              color: #fff;
            }
            .markdown-content hr {
              border: none;
              border-top: 1px solid #334155;
              margin: 8px 0;
            }
          `}</style>
        </>
      )}
    </>
  )
}