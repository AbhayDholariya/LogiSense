import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  X,
  Bot,
  Sparkles,
  User,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

function getToken() {
  try {
    const raw = sessionStorage.getItem("sc_auth_token");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function CustomerChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am LogiSense AI, your personal supply chain assistant. How can I help you with your shipments today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput("");
    setError(null);

    // Add user message
    const userMessageId = `msg-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMessageId, role: "user", content: text },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Format payload messages for standard role schema (user/assistant)
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/customer/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: data.response || "No response received.",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Unable to connect to AI assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    handleSendMessage(suggestionText);
  };

  const suggestions = [
    "What is the status of my shipments?",
    "Are there any delays or disruption risks?",
    "Is severe weather affecting my cargo?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9990] font-sans flex flex-col items-end pointer-events-none">
      {/* Expanded Chat Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[360px] h-[500px] sm:w-[400px] sm:h-[550px] mb-4 rounded-2xl border border-slate-200 dark:border-indigo-500/20 bg-white/95 dark:bg-[#070b19]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            style={{ boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)" }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-950/80 dark:to-purple-950/80 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    LogiSense AI
                    <Sparkles className="h-3 w-3 text-yellow-300 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-indigo-200">
                    Live Supply Chain Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/75 hover:text-white hover:bg-white/10 transition-all rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20">
              {messages.map((m) => {
                const isAI = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 max-w-[85%] ${
                      isAI ? "self-start" : "self-end flex-row-reverse ml-auto"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAI
                          ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                          : "bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      {isAI ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isAI
                          ? "bg-white dark:bg-[#11162d] border border-slate-200/80 dark:border-white/[0.04] text-slate-800 dark:text-slate-200 rounded-tl-none"
                          : "bg-indigo-600 dark:bg-indigo-600/95 text-white rounded-tr-none ml-auto"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex gap-2.5 max-w-[85%] self-start">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-white dark:bg-[#11162d] border border-slate-200/80 dark:border-white/[0.04] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] items-start">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions when input is empty */}
            {messages.length === 1 && !loading && (
              <div className="px-4 py-2 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/30 dark:bg-slate-950/10 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                  Suggested questions
                </span>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-left text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-indigo-400 text-indigo-600 dark:text-indigo-300 font-medium transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-slate-100 dark:border-white/[0.04] flex gap-2 items-center bg-white dark:bg-[#070b19]"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your shipments..."
                disabled={loading}
                className="flex-1 bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl py-2 px-3.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1.5 focus:ring-indigo-500/40 focus:bg-white dark:focus:bg-white/10 transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-white/5 text-white disabled:text-slate-400 flex items-center justify-center hover:scale-[1.05] transition-all"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-600 dark:to-purple-600 text-white flex items-center justify-center shadow-xl hover:scale-105 pointer-events-auto transition-transform z-[9991]"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </motion.button>
    </div>
  );
}
