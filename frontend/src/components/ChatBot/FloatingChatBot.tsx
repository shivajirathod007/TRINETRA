import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'
import axios from 'axios'

// Add keyframe animations
const STYLES = `
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
    }
    50% {
      box-shadow: 0 0 30px rgba(239, 68, 68, 1);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes typing {
    0%, 60%, 100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    30% {
      opacity: 1;
      transform: translateY(-8px);
    }
  }
`

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

export function FloatingChatBot() {
  // Inject styles once on mount
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = STYLES
    document.head.appendChild(styleEl)
    return () => styleEl.remove()
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="absolute bottom-20 right-0 w-96 h-96 bg-surface-800 rounded-xl shadow-2xl border border-surface-600 flex flex-col overflow-hidden"
          style={{
            animation: 'slideUp 0.3s ease-out',
            background: '#1a1a2e'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-surface-700 to-surface-800 border-b border-surface-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-red to-brand-gold flex items-center justify-center">
                <span className="text-xs font-bold text-white">J</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">JARVIS</div>
                <div className="text-xs text-gray-400">Quantum Security AI</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-900" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                style={{ animation: 'fadeIn 0.3s ease-in' }}
              >
                <div className={`max-w-xs px-3 py-2 rounded-lg ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-r from-brand-red to-brand-gold text-white rounded-bl-xl rounded-br-none' 
                    : 'bg-surface-700 text-gray-100 rounded-br-xl rounded-bl-none border border-surface-600'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="bg-surface-700 text-gray-100 rounded-br-xl rounded-bl-none border border-surface-600 flex items-center gap-1 py-2 px-3">
                  <span className="w-2 h-2 rounded-full bg-brand-red opacity-60" style={{ animation: 'typing 1.4s infinite' }}></span>
                  <span className="w-2 h-2 rounded-full bg-brand-red opacity-60" style={{ animation: 'typing 1.4s infinite 0.2s' }}></span>
                  <span className="w-2 h-2 rounded-full bg-brand-red opacity-60" style={{ animation: 'typing 1.4s infinite 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-surface-600 p-3 bg-surface-800 flex items-end gap-2 shrink-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about scans, mitigations, PQC status..."
              className="flex-1 bg-surface-700 text-white placeholder-gray-500 text-sm focus:outline-none resize-none px-3 py-2 rounded"
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              className="p-2 rounded-lg bg-gradient-to-r from-brand-red to-brand-gold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-red to-brand-gold shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer transform hover:scale-110 text-white font-semibold gap-1"
          title="Chat with JARVIS"
          style={{
            animation: 'pulse-glow 2s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)'
          }}
        >
          <MessageCircle size={24} />
          <span className="text-xs font-bold">JARVIS</span>
        </button>
      )}
    </div>
  )
}
