import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client.js';
import {
  Bot,
  Send,
  User,
  Sparkles,
  ArrowRight,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

export const MentorChat = ({ activeEnrollmentId, activeCourse, onNavigate }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [conversationError, setConversationError] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, [activeEnrollmentId]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConversations(activeEnrollmentId);
      const convList = Array.isArray(data) ? data : [];
      setConversations(convList);
      if (convList.length > 0) {
        setActiveConversation(convList[0]);
      }
      // Don't auto-create — wait for user to click "New Chat" or send first message
    } catch (err) {
      console.warn('Error loading conversations:', err.message);
      setError('Could not load conversation history. You can still start a new chat.');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    setConversationError(null);
    try {
      const payload = {
        title: activeCourse
          ? `Learning Q&A: ${activeCourse.title}`
          : 'General Learning Chat'
      };
      if (activeEnrollmentId) payload.enrollmentId = activeEnrollmentId;
      if (activeCourse) payload.courseId = activeCourse.id || activeCourse._id;

      const newConv = await api.startConversation(payload);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      // Focus the textarea after starting conversation
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err) {
      console.warn('Error starting conversation:', err.message);
      setConversationError(err.message || 'Could not start a conversation. Ensure you are enrolled in a course.');
    }
  };

  const loadMessages = async (convId) => {
    try {
      const result = await api.getMessages(convId);
      setMessages(result.messages || []);
    } catch (err) {
      console.warn('Error loading messages:', err.message);
    }
  };

  /**
   * Send a message. If no active conversation yet, create one first.
   */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputMessage.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { _id: tempId, role: 'user', content: text, createdAt: new Date().toISOString() }
    ]);
    setInputMessage('');

    try {
      // Auto-create conversation on first message if none exists
      let conv = activeConversation;
      if (!conv) {
        const payload = {
          title: activeCourse
            ? `Learning Q&A: ${activeCourse.title}`
            : 'General Learning Chat'
        };
        if (activeEnrollmentId) payload.enrollmentId = activeEnrollmentId;
        if (activeCourse) payload.courseId = activeCourse.id || activeCourse._id;

        conv = await api.startConversation(payload);
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
      }

      const res = await api.sendMessage(conv._id, text);

      // Remove optimistic bubble and add the real persisted user message + AI reply
      setMessages((prev) => {
        const without = prev.filter((m) => m._id !== tempId);
        const toAdd = [];
        if (res.message) toAdd.push(res.message);
        return [...without, ...toAdd];
      });

      // Re-fetch to get both the saved user message and the AI reply in order
      await loadMessages(conv._id);
    } catch (err) {
      console.error('Send message error:', err);
      // Replace the optimistic bubble with an error message
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId
            ? {
                ...m,
                _id: `err-${Date.now()}`,
                role: 'assistant',
                content: `⚠️ ${err.message || 'Failed to get a response. Please try again.'}`
              }
            : m
        )
      );
    } finally {
      setSending(false);
      // Re-focus textarea so the user can keep typing
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--primary)" />
            <span>AI Learning Mentor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Ask questions, get Socratic hints, and discuss course concepts in real time.
            {activeCourse && (
              <span style={{ fontStyle: 'italic' }}> Course: {activeCourse.title}</span>
            )}
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={startNewConversation}
          disabled={loading}
        >
          <PlusCircle size={16} /> New Chat
        </button>
      </div>

      {/* Non-blocking info banner when no enrollment is linked */}
      {!activeEnrollmentId && !loading && (
        <div style={{
          background: '#fff8e6',
          border: '1px solid #f0c040',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '0.85rem',
          color: '#7a5c00',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <AlertCircle size={15} />
          <span>You can chat freely here. For course-specific guidance, select a course from your Dashboard first.</span>
        </div>
      )}

      {/* Conversation error */}
      {conversationError && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '0.85rem',
          color: '#b91c1c',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <AlertCircle size={15} />
          <span>{conversationError}</span>
        </div>
      )}

      {/* Conversation list tabs (when multiple) */}
      {conversations.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {conversations.slice(0, 5).map((c) => (
            <button
              key={c._id}
              onClick={() => setActiveConversation(c)}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: activeConversation?._id === c._id ? 'var(--primary)' : '#fff',
                color: activeConversation?._id === c._id ? '#fff' : 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {c.title?.substring(0, 30) || 'Chat'}
            </button>
          ))}
        </div>
      )}

      {/* Chat container */}
      <div className="chat-container">
        {/* Messages scroll area */}
        <div className="chat-messages">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
              Loading conversations…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '440px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                marginBottom: '12px'
              }}>
                <Bot size={32} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Hello! I am your AI Mentor
              </h3>
              <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>
                Ask me to explain a concept from your lessons, guide you with hints, or test your understanding.
              </p>
              <p style={{ fontSize: '0.82rem', marginTop: '8px', color: '#888' }}>
                Type a message below and press <strong>Enter</strong> to start.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m._id} className={`chat-bubble ${m.role}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                  {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  <span>{m.role === 'user' ? 'You' : 'AI Mentor'}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>

                {m.contextMetadata?.suggestedAction && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: '#fff',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)',
                        fontWeight: 600
                      }}
                      onClick={() => {
                        const act = m.contextMetadata.suggestedAction;
                        if (act === 'open_assignment' || act === 'revise_submission') {
                          onNavigate('assignment-workspace');
                        } else {
                          onNavigate('learning-path');
                        }
                      }}
                    >
                      <ArrowRight size={12} />
                      <span>Suggested: {m.contextMetadata.suggestedAction.replace(/_/g, ' ')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={12} />
                <span>AI Mentor is thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <textarea
            ref={textareaRef}
            className="form-control"
            rows={2}
            placeholder={
              sending
                ? 'Waiting for AI Mentor…'
                : 'Ask a question about the lesson or assignment… (Enter to send, Shift+Enter for new line)'
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{ resize: 'vertical', minHeight: '60px' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 20px', alignSelf: 'flex-end', height: '42px' }}
            disabled={!inputMessage.trim() || sending}
            title="Send message (Enter)"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* General error banner */}
      {error && (
        <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--error, #dc2626)' }}>
          <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {error}
        </p>
      )}
    </div>
  );
};

export default MentorChat;
