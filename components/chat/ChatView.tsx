"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Send, Mic, MicOff, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
  }, [input])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: "user", content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Error: ${data.error}` },
        ])
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleSpeech = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setListening(false)
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const [hasSpeech, setHasSpeech] = useState(false)

  useEffect(() => {
    setHasSpeech(
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window
    )
  }, [])

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="page-brand-row">
          <h1 className="chat-title">Chadiós</h1>
          <span className="chat-tagline">Adiós a los Datos Básicos</span>
        </div>
      </header>

      <div
        className={cn(
          "chat-messages",
          messages.length === 0 && "chat-messages--empty"
        )}
      >
        {messages.length === 0 ? (
          <div>
            <MessageSquare className="chat-empty__icon" />
            <p className="chat-empty__text">
              Ask anything about the tournament — schedule, standings, rules, or
              your team&apos;s chances.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "chat-bubble",
                msg.role === "user"
                  ? "chat-bubble--user"
                  : "chat-bubble--assistant"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
        {loading && (
          <div className="chat-bubble chat-bubble--thinking">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        {hasSpeech && (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "chat-mic-btn",
              listening && "chat-mic-btn--active"
            )}
            onClick={toggleSpeech}
          >
            {listening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Ask about the tournament..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button
          size="icon"
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
