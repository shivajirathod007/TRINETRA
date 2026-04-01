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
    console.log('✅ JARVIS ChatBot Component Mounted')
    window.jarvisLoaded = true
    // Add a visible debug marker
    const marker = document.createElement('div')
    marker.id = 'jarvis-marker'
    marker.innerHTML = 'JARVIS LOADED'
    marker.style.cssText = 'position:fixed;bottom:100px;left:10px;background:orange;color:black;padding:5px;z-index:9998;font-size:10px;'
    document.body.appendChild(marker)
    return () => marker.remove()
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Namaste! I\'m JARVIS, your quantum cryptography intelligence assistant. Ask me anything about your security posture, mitigation strategies, or scan analysis. 🔐',
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
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 9999,
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(234, 179, 8) 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
          title="Chat with JARVIS"
        >
          <MessageCircle size={24} />
          <span>JARVIS</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          left: '24px',
          zIndex: 9999,
          width: '384px',
          height: '384px',
          background: '#0f172a',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(to right, #1e293b, #0f172a)',
            borderBottom: '1px solid #1e293b',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(234, 179, 8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                J
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>JARVIS</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Quantum Security AI</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
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
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(234, 179, 8) 100%)' : '#1e293b',
                  color: msg.sender === 'user' ? 'white' : '#e2e8f0',
                  border: msg.sender === 'user' ? 'none' : '1px solid #334155',
                }}>
                  <p style={{ margin: 0, marginBottom: '4px' }}>{msg.text}</p>
                  <span style={{ fontSize: '11px', color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b', display: 'block', marginTop: '4px' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '4px', border: '1px solid #334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.6 }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.6 }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ef4444', opacity: 0.6 }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid #1e293b',
            padding: '12px',
            background: '#0f172a',
            display: 'flex',
            gap: '8px',
          }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about scans, mitigations, PQC..."
              style={{
                flex: 1,
                background: '#1e293b',
                color: 'white',
                fontSize: '14px',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                resize: 'none',
                outline: 'none',
              }}
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              style={{
                padding: '8px',
                borderRadius: '4px',
                background: isLoading || !inputText.trim() ? '#64748b' : 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(234, 179, 8) 100%)',
                color: 'white',
                border: 'none',
                cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputText.trim() ? 0.5 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
