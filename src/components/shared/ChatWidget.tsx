"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, X, Send, Phone, User, Clock, 
  ChevronDown, Paperclip, Smile, CheckCircle2, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO } from "@/lib/constants"
import Image from "next/image"

interface Message {
  id: string
  text: string
  sender: "user" | "bot" | "agent"
  timestamp: Date
  status?: "sending" | "sent" | "delivered" | "read"
}

const quickReplies = [
  "What's your commission rate?",
  "Do you have forced dispatch?",
  "How soon can I start?",
  "Talk to a recruiter",
]

const botResponses: Record<string, string> = {
  "commission": "Owner Operators keep 91% of the gross revenue - one of the highest in the industry! Plus, 100% of fuel surcharge is passed through to you. Would you like to calculate your potential earnings?",
  "forced dispatch": "No, never! At Thind Transport, you choose your loads. We believe in treating drivers as partners, not employees. You control your schedule.",
  "start": "You could be on the road in as little as 48-72 hours! Our onboarding process is streamlined. Would you like to speak with a recruiter to get started?",
  "recruiter": "I'll have one of our recruiters call you within the next 30 minutes. What's the best phone number to reach you?",
  "default": "Thanks for your message! A recruiter will be with you shortly. In the meantime, feel free to ask me about our pay rates, routes, or benefits."
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Show welcome bubble after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowBubble(true)
        setTimeout(() => setShowBubble(false), 5000)
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Add initial message when opened for first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "1",
        text: "Hi! 👋 I'm here to help you learn about driving for Thind Transport. Ask me anything about our 91% commission, equipment, or routes!",
        sender: "bot",
        timestamp: new Date(),
      }])
    }
  }, [isOpen, messages.length])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Reset unread count when opened
  useEffect(() => {
    if (isOpen) setUnreadCount(0)
  }, [isOpen])

  const getBotResponse = (text: string): string => {
    const lower = text.toLowerCase()
    if (lower.includes("commission") || lower.includes("91") || lower.includes("percent") || lower.includes("pay")) {
      return botResponses["commission"]
    }
    if (lower.includes("forced") || lower.includes("dispatch")) {
      return botResponses["forced dispatch"]
    }
    if (lower.includes("start") || lower.includes("soon") || lower.includes("quick")) {
      return botResponses["start"]
    }
    if (lower.includes("recruiter") || lower.includes("talk") || lower.includes("call") || lower.includes("human")) {
      return botResponses["recruiter"]
    }
    return botResponses["default"]
  }

  const handleSend = () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
      status: "sent"
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputValue),
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botResponse])
      setIsTyping(false)
      if (!isOpen) setUnreadCount(prev => prev + 1)
    }, 1500)
  }

  const handleQuickReply = (reply: string) => {
    setInputValue(reply)
    setTimeout(() => handleSend(), 100)
  }

  return (
    <>
      {/* Chat Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, type: "spring" }}
      >
        {/* Welcome Bubble */}
        <AnimatePresence>
          {showBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full right-0 mb-3 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 w-64"
            >
              <button
                onClick={() => setShowBubble(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-gray-700 font-medium">
                👋 Hi! Have questions about our 91% commission? I'm here to help!
              </p>
              <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white border-r border-b border-gray-200" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isOpen 
              ? "bg-gray-700 hover:bg-gray-800" 
              : "bg-gradient-to-br from-orange to-orange-600 hover:from-orange-600 hover:to-orange-700"
          }`}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MessageCircle className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Unread Badge */}
          {unreadCount > 0 && !isOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount}
            </motion.span>
          )}
          
          {/* Pulse animation when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-orange animate-ping opacity-25" />
          )}
        </button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-navy to-navy-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-orange flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-navy rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Thind Transport</h4>
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      Online • Replies in &lt;2 min
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${
                    message.sender === "user"
                      ? "bg-orange text-white rounded-2xl rounded-br-md"
                      : "bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100"
                  } px-4 py-2.5`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      message.sender === "user" ? "text-white/70" : "text-gray-400"
                    }`}>
                      <span className="text-[10px]">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.sender === "user" && message.status && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 bg-white border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickReply(reply)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-orange/10 hover:text-orange rounded-full text-gray-700 font-medium transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 border-gray-200 focus-visible:ring-orange"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="bg-orange hover:bg-orange-600 text-white px-3"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-400">
                  Or call us: <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-orange font-semibold hover:underline">{COMPANY_INFO.phone}</a>
                </p>
                <a 
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:text-green-700"
                >
                  <Phone className="h-3 w-3" />
                  Talk to Human
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

