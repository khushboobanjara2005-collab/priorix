
"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AuthRequired from "@/components/auth/AuthRequired";
import {
  Sparkles,
  Send,
  Bot,
  UserRound,
  BookOpen,
  CalendarDays,
  Target,
  Lightbulb,
  RotateCcw,
} from "lucide-react";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const suggestions = [
  {
    icon: CalendarDays,
    title: "Create a study plan",
    description: "Organize my upcoming deadlines.",
    prompt: "Help me create a study plan for my upcoming deadlines.",
  },
  {
    icon: BookOpen,
    title: "Explain a topic",
    description: "Break down a difficult concept.",
    prompt: "Help me understand a difficult academic topic.",
  },
  {
    icon: Target,
    title: "Prioritize my tasks",
    description: "Decide what I should study first.",
    prompt: "Help me decide which study tasks I should prioritize.",
  },
  {
    icon: Lightbulb,
    title: "Study more effectively",
    description: "Get practical study techniques.",
    prompt: "Suggest practical techniques to improve my study sessions.",
  },
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  async function sendMessage(value = input) {
    const trimmed = value.trim();

    if (!trimmed || isThinking) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setError("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!response.ok) {
        setError(result.error?.message || "The assistant could not respond. Please try again.");
        return;
      }
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.data.reply as string,
      }]);
    } catch {
      setError("The assistant service is unavailable. Please try again.");
    } finally {
      setIsThinking(false);
    }
  }

  function clearChat() {
    if (isThinking) return;
    setMessages([]);
    setInput("");
    setError("");
  }

  if (authRequired) {
    return <main className="assistant-page"><AuthRequired message="Sign in to use the study assistant with your private task context." /></main>;
  }

  return (
    <main className="assistant-page">
      <header className="assistant-heading">
        <div>
          <p className="assistant-eyebrow">YOUR PERSONAL STUDY COMPANION</p>
          <h1>
            AI Assistant <Sparkles size={30} />
          </h1>
          <p className="assistant-subtitle">
            Get study guidance, organize your workload, and learn with confidence.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            className="assistant-reset"
            onClick={clearChat}
            disabled={isThinking}
          >
            <RotateCcw size={16} />
            New chat
          </button>
        )}
      </header>

      <section className="assistant-workspace">
        <div className="assistant-chat-panel">
          <div className="assistant-chat-header">
            <div className="assistant-bot-icon">
              <Bot size={23} />
            </div>

            <div>
              <h2>Study Assistant</h2>
              <p>
                <span className="assistant-status-dot" />
                Server-side study assistant
              </p>
            </div>

            <Sparkles className="assistant-header-sparkle" size={22} />
          </div>

          <div
            className="assistant-messages"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.length === 0 ? (
              <div className="assistant-welcome">
                <div className="assistant-welcome-icon">
                  <Sparkles size={30} />
                </div>

                <h2>What are we studying today?</h2>

                <p>
                  Ask a question, plan your study time, or choose one of the
                  suggestions below to get started.
                </p>

                <div className="assistant-suggestions">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon;

                    return (
                      <button
                        type="button"
                        className="assistant-suggestion"
                        key={suggestion.title}
                        onClick={() => sendMessage(suggestion.prompt)}
                      >
                        <span className="assistant-suggestion-icon">
                          <Icon size={19} />
                        </span>

                        <span>
                          <strong>{suggestion.title}</strong>
                          <small>{suggestion.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="assistant-message-list">
                {messages.map((message) => (
                  <article
                    className={`assistant-message ${
                      message.role === "user" ? "user-message" : "bot-message"
                    }`}
                    key={message.id}
                  >
                    <div className="assistant-message-avatar">
                      {message.role === "user" ? (
                        <UserRound size={18} />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </div>

                    <div className="assistant-message-body">
                      <span>
                        {message.role === "user" ? "You" : "Study Assistant"}
                      </span>
                      {message.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      ) : <p>{message.content}</p>}
                    </div>
                  </article>
                ))}

                {isThinking && (
                  <div className="assistant-thinking" role="status">
                    <span />
                    <span />
                    <span />
                    <p>Preparing a response...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="assistant-error" role="alert">{error}</p>}

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <label className="sr-only" htmlFor="assistant-input">
              Your study question
            </label>

            <textarea
              id="assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask me anything about your studies..."
              rows={2}
              maxLength={2000}
              disabled={isThinking}
            />

            <button
              type="submit"
              className="assistant-send-button"
              disabled={!input.trim() || isThinking}
              aria-label="Send message"
            >
              <Send size={19} />
            </button>

            <small>Enter to send · Shift + Enter for a new line</small>
          </form>
        </div>

        <aside className="assistant-side-panel">
          <section className="assistant-info-card">
            <div className="assistant-card-heading">
              <BookOpen size={21} />
              <h3>What I can help with</h3>
            </div>

            <ul>
              <li>Break difficult concepts into simpler explanations.</li>
              <li>Build realistic study schedules.</li>
              <li>Suggest revision and exam preparation techniques.</li>
              <li>Help organize assignments and deadlines.</li>
            </ul>
          </section>

          <section className="assistant-info-card assistant-note-card">
            <div className="assistant-card-heading">
              <Lightbulb size={21} />
              <h3>Study tip</h3>
            </div>

            <p>
              Focus on one specific learning goal at a time. Short, focused
              sessions with regular breaks are easier to manage than vague
              plans to study everything at once.
            </p>
          </section>

          <Link href="/my-tasks" className="assistant-tasks-link">
            <Target size={19} />
            View My Tasks
          </Link>
        </aside>
      </section>
    </main>
  );
}
