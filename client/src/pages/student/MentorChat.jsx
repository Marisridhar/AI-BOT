import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client.js';
import {
  Bot,
  Send,
  User,
  Sparkles,
  ArrowRight,
  RefreshCw,
  PlusCircle
} from 'lucide-react';

export const MentorChat = ({ activeEnrollmentId, activeCourse, onNavigate }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

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
    try {
      const data = await api.getConversations(activeEnrollmentId);
      setConversations(data || []);
      if (data && data.length > 0) {
        setActiveConversation(data[0]);
      } else if (activeCourse && activeEnrollmentId) {
        // Automatically start initial conversation
        startNewConversation();
      }
    } catch (err) {
      console.warn('Error loading conversations:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    if (!activeEnrollmentId || !activeCourse) return;
    try {
      const newConv = await api.startConversation({
        enrollmentId: activeEnrollmentId,
        courseId: activeCourse.id || activeCourse._id,
        title: `Learning Q&A: ${activeCourse.title}`
      });
      setConversations([newConv, ...conversations]);
      setActiveConversation(newConv);
    } catch (err) {
      console.warn('Error starting conversation:', err.message);
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

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !activeConversation || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistically append user message
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendMessage(activeConversation._id, text);
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I could not process your request: ${err.message}`
        }
      ]);
    } finally {
      setSending(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--primary)" />
            <span>AI Learning Mentor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Ask questions, get Socratic hints, and discuss course concepts in real time.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={startNewConversation}>
          <PlusCircle size={16} /> New Chat
        </button>
      </div>

      <div className="chat-container">
        {/* Messages scroll area */}
        <div className="chat-messages">
          {messages.length === 0 ? (
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
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m._id}
                className={`chat-bubble ${m.role}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                  {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  <span>{m.role === 'user' ? 'You' : 'AI Mentor'}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>

                {/* Suggested Action pill */}
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
              AI Mentor is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Ask a question about the lesson or assignment (Press Enter to send)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 20px', alignSelf: 'flex-end', height: '42px' }}
            disabled={!inputMessage.trim() || sending}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorChat;

