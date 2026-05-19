import React, { useState, useRef, useEffect } from 'react';
import { useChatMutation, useGetRolesQuery } from '../features/ai/aiApi';
import toast from 'react-hot-toast';

interface Message { role: 'user' | 'assistant'; content: string; toolsUsed?: string[]; }

const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Hello! I\'m your AI Financial Assistant. Ask me anything about your expenses, budgets, payroll trends, or financial health.\n\nTry: *"What are my top spending categories this month?"* or *"Detect any unusual expense patterns."*' },
  ]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('analyst');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: rolesData } = useGetRolesQuery();
  const [chat, { isLoading }] = useChatMutation();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);

    try {
      const res = await chat({ query: userMsg, role: selectedRole }).unwrap();
      setMessages(m => [...m, {
        role: 'assistant',
        content: res.answer,
        toolsUsed: res.toolsUsed,
      }]);
    } catch (err: any) {
      const msg = err?.data?.message || 'Something went wrong';
      toast.error(msg);
      setMessages(m => [...m, { role: 'assistant', content: `❌ Error: ${msg}` }]);
    }
  };

  const roleLabels: Record<string, string> = { cfo: '👔 CFO', auditor: '🔍 Auditor', analyst: '📊 Analyst' };
  const roles: string[] = rolesData?.roles || ['analyst', 'cfo', 'auditor'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Ask financial questions in plain English — powered by Llama 3</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role:</span>
          {roles.map(r => (
            <button key={r} className={`role-btn${selectedRole === r ? ' active' : ''}`} onClick={() => setSelectedRole(r)}>
              {roleLabels[r] || r}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Role context banner */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(99,102,241,0.06)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>
            🤖 Acting as: <strong>{roleLabels[selectedRole] || selectedRole}</strong> — All data is anonymised before processing
          </span>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {m.toolsUsed.map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 99 }}>🔧 {t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant">
              <div className="chat-bubble animate-pulse" style={{ color: 'var(--text-muted)' }}>⏳ Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <input
            id="ai-chat-input"
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about expenses, budgets, anomalies, payroll trends..."
            disabled={isLoading}
          />
          <button id="ai-send-btn" className="btn btn-primary" onClick={send} disabled={isLoading || !input.trim()}>
            {isLoading ? '⏳' : '➤ Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
