import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import axios from 'axios'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

export function FloatingChatBot() {
  useEffect(() => {
    console.log('✅ JARSH ChatBot Component Mounted')
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Namaste! I\'m JARSH, your quantum cryptography intelligence assistant. Ask me anything about your security posture, mitigation strategies, or scan analysis. 🔐',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputText.trim()) return

    // Add user message
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Chat Button - Simple test version */}
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
            backdropFilter: 'blur(10px)',
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
        
        {/* Pulsing animation keyframes */}
        <style>{`
          @keyframes jarsh-pulse {
            0%, 100% {
              box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3);
            }
            50% {
              box-shadow: 0 8px 32px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.5);
            }
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
            backdropFilter: 'blur(10px)',
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
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(90deg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.transform = 'rotate(0deg)' }}
            >
              <X size={20} />
            </button>
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
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', animation: 'jarsh-fadeIn 0.3s ease-out' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  background: msg.sender === 'user' 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                    : '#1e293b',
                  color: msg.sender === 'user' ? 'white' : '#e2e8f0',
                  border: msg.sender === 'user' ? 'none' : '1px solid #334155',
                  boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none',
                }}>
                  <p style={{ margin: '0 0 4px 0' }}>{msg.text}</p>
                  <span style={{ fontSize: '11px', color: msg.sender === 'user' ? 'rgba(255,255,255,0.6)' : '#64748b', display: 'block', marginTop: '4px', opacity: 0.7 }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '12px', display: 'flex', gap: '6px', border: '1px solid #334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.7, animation: 'jarsh-bounce 1.4s infinite' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.7, animation: 'jarsh-bounce 1.4s infinite 0.2s' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.7, animation: 'jarsh-bounce 1.4s infinite 0.4s' }} />
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
            backdropFilter: 'blur(10px)',
          }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
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
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.1)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none' }}
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: isLoading || !inputText.trim() ? '#475569' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
        
        {/* Additional animation styles */}
        <style>{`
          @keyframes jarsh-slide {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes jarsh-fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes jarsh-bounce {
            0%, 100% {
              opacity: 0.3;
              transform: translateY(0);
            }
            50% {
              opacity: 1;
              transform: translateY(-8px);
            }
          }
        `}</style>
        </>
      )}
    </>
  )
}
