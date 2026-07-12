import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, MessageSquare, X, Mic, Sparkles, Check, Play, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function AIAssistantWidget({ activeTab, setActiveTab, onSetDeptFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Pending AI agent actions count for the Orb badge
  const [pendingCount, setPendingCount] = useState(0);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('wfm_token');

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/conversations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingAgentActions = async () => {
    try {
      const res = await fetch(`${API_BASE}/agents/pending`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.actions?.length || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await fetch(`${API_BASE}/ai/conversations/${convId}/messages`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveConvId(convId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      let cleanText = text
        .replace(/###/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\|/g, ' ')
        .replace(/-{3,}/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .trim();

      if (text.includes('|')) {
        const lines = text.split('\n');
        const nonTableLines = lines.filter(l => !l.trim().startsWith('|'));
        cleanText = nonTableLines.join('\n').replace(/###/g, '').replace(/\*\*/g, '').trim();
        cleanText += ". I have displayed the detailed data table on your screen.";
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('google us english') ||
         v.name.toLowerCase().includes('samantha') ||
         v.name.toLowerCase().includes('zira') ||
         v.name.toLowerCase().includes('hazel'))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (userText, isVoice = false) => {
    if (!userText.trim()) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      const res = await fetch(`${API_BASE}/ai/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: userText,
          activeTab,
          conversationId: activeConvId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        
        if (isVoice) {
          speak(data.response);
        }

        if (data.navigationTab && typeof setActiveTab === 'function') {
          setActiveTab(data.navigationTab);
          if (data.navigationTab === 'employees' && data.filterDepartment && typeof onSetDeptFilter === 'function') {
            onSetDeptFilter(data.filterDepartment);
          }
        }
        if (!activeConvId) {
          setActiveConvId(data.conversationId);
          fetchConversations();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `### ⚠️ Rachel (Error)\n\nI encountered a server issue (${res.status}): ${errData.error || 'Request unauthorized or blocked.'}` 
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `### ⚠️ Rachel (Connection Offline)\n\nI couldn't establish a connection to the server. Please verify the backend is active and try again.` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const text = inputMsg;
    setInputMsg('');
    handleSendMessage(text, false);
  };

  const handleNewChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveConvId(null);
    setMessages([]);
  };

  const handleVoiceInput = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isListening) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access is blocked. Please click the camera/microphone icon in the browser URL bar and choose "Allow" to enable voice input.');
        } else if (event.error === 'no-speech') {
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          handleSendMessage(transcript.trim(), true);
        }
      };

      setRecognitionInstance(recognition);
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
    fetchPendingAgentActions();
    
    // Poll agent queue count occasionally for the badge
    const interval = setInterval(fetchPendingAgentActions, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageText = (text) => {
    if (!text) return '';
    let formatted = text;
    // Strip out ### 🤖 Rachel
    formatted = formatted.replace(/^###\s*🤖\s*Rachel\s*/i, '');
    
    // Strip out 📊 emoji
    formatted = formatted.replace(/📊/g, '');
    
    // Parse headers (e.g. ### Title)
    formatted = formatted.replace(/^### (.*$)/gim, '<h4 style="margin: 4px 0 8px 0; font-size: 13.5px; font-weight: 700; color: #6366F1;">$1</h4>');
    
    // Parse bold text (e.g. **bold**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Parse italic text (e.g. *italic*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Parse bullets (e.g. - list item)
    formatted = formatted.replace(/^- (.*$)/gim, '• $1');
    
    // Parse markdown tables
    if (formatted.includes('|')) {
      const paragraphs = formatted.split('\n');
      const processedParagraphs = [];
      let inTable = false;
      let tableHtml = '';
      
      for (let i = 0; i < paragraphs.length; i++) {
        const line = paragraphs[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          if (!inTable) {
            inTable = true;
            tableHtml = '<table style="width: auto; max-width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11.5px; border: 1px solid var(--sidebar-border);">';
          }
          
          if (line.includes('---') || line.includes(':---')) {
            continue;
          }
          
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          const isHeader = i === 0 || (i > 0 && paragraphs[i-1].includes('---'));
          const cellTag = isHeader ? 'th' : 'td';
          
          tableHtml += `<tr style="border-bottom: 1px solid var(--sidebar-border); ${isHeader ? 'background: var(--card-item-bg); font-weight: bold; color: var(--text-primary);' : 'color: var(--text-primary);'}">`;
          cells.forEach(cell => {
            let cellContent = cell;
            const linkMatch = cell.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
              cellContent = `<a href="${linkMatch[2]}" target="_blank" style="color: #6366F1; text-decoration: underline;">${linkMatch[1]}</a>`;
            }
            cellContent = cellContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            tableHtml += `<${cellTag} style="padding: 6px; text-align: left;">${cellContent}</${cellTag}>`;
          });
          tableHtml += '</tr>';
        } else {
          if (inTable) {
            inTable = false;
            tableHtml += '</table>';
            processedParagraphs.push(tableHtml);
          }
          processedParagraphs.push(line);
        }
      }
      if (inTable) {
        tableHtml += '</table>';
        processedParagraphs.push(tableHtml);
      }
      formatted = processedParagraphs.join('<br/>');
    } else {
      formatted = formatted.replace(/\n/g, '<br/>');
    }
    
    return formatted;
  };

  // Contextual tips based on current page
  const getContextualContent = () => {
    switch (activeTab) {
      case 'payroll':
        return {
          title: "Payroll Intelligence",
          intro: "I see you are reviewing payroll records.",
          actions: [
            { text: "Check anomalies", query: "Are there any salary payment anomalies in this draft?" },
            { text: "Explain tax deductions", query: "Can you detail the tax calculation formulas used?" },
            { text: "Generate payroll summary", query: "Give me a summary of total spending by department" }
          ]
        };
      case 'overview':
        return {
          title: "Command Center Assistant",
          intro: "Good day! How can I assist you with your day?",
          actions: [
            { text: "Check remaining leaves", query: "How many leaves do I have left?" },
            { text: "Get today's agenda", query: "What are my high priority tasks today?" },
            { text: "Ask HR Policy", query: "Explain the hybrid work office presence policy" }
          ]
        };
      case 'projects':
        return {
          title: "Project Operations Copilot",
          intro: "Reviewing active tasks and deadlines.",
          actions: [
            { text: "Find blocked tasks", query: "Are any project tasks currently marked as Blocked?" },
            { text: "Analyze team workload", query: "Who has the highest workload of pending tasks?" }
          ]
        };
      default:
        return null;
    }
  };

  const contextInfo = getContextualContent();

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1200 }}>
      
      {/* 5.2 AI Agent Orb Toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`orb-glow-purple ${loading ? 'animate-pulse' : ''}`}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            outline: 'none',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bot size={28} />
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
              animation: 'bounce 1s infinite alternate'
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      )}

      {/* 8. Context-Aware AI Sidebar Panel */}
      {isOpen && (
        <div 
          className="glass-card" 
          style={{
            width: '680px',
            height: '650px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--sidebar-border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={22} color="white" />
              <div>
                <span style={{ fontWeight: '700', fontSize: '15px', display: 'block', color: 'white' }}>Rachel</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Context: {activeTab}</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Left Session strip */}
            <div style={{ width: '130px', borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', background: 'var(--card-item-bg)' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', padding: '12px 8px 6px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>History</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px' }}>
                {conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => fetchMessages(c.id)}
                    style={{
                      padding: '8px',
                      fontSize: '11px',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: '6px',
                      background: activeConvId === c.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: activeConvId === c.id ? '#6366F1' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    💬 {c.title}
                  </button>
                ))}
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid var(--sidebar-border)' }}>
                <button
                  onClick={handleNewChat}
                  style={{
                    width: '100%',
                    padding: '8px 4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textAlign: 'center',
                    border: 'none',
                    borderRadius: '99px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366F1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; }}
                >
                  ➕ New Chat
                </button>
              </div>
            </div>

            {/* Chat screen */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card-bg)' }}>
              
              {/* Message scroll container */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {messages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                    
                    {/* Context State prompt cards */}
                    {contextInfo ? (
                      <div style={{ background: 'var(--sidebar-bg)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '12px', padding: '16px', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: '#6366F1', marginBottom: '8px' }}>
                          <Sparkles size={16} />
                          {contextInfo.title}
                        </div>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>{contextInfo.intro}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {contextInfo.actions.map((act, i) => (
                            <button
                              key={i}
                              onClick={() => handleSendMessage(act.query)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'var(--sidebar-bg)',
                                border: '1px solid var(--sidebar-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-item-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--sidebar-bg)'}
                            >
                              💡 {act.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', textAlign: 'center', marginTop: '40px' }}>
                        <Bot size={36} color="var(--text-secondary)" style={{ margin: '0 auto 12px auto' }} />
                        I'm here if you need me. Click history or ask a custom question below.
                      </div>
                    )}
                  </div>
                )}

                {messages.map((m, idx) => {
                  const hasTable = m.content.includes('|');
                  const showSenderLabel = idx === 0 || messages[idx - 1].role !== m.role;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        margin: '4px 0'
                      }}
                    >
                      {showSenderLabel && (
                        <span style={{ 
                          fontSize: '10.5px', 
                          fontWeight: 'bold', 
                          color: 'var(--text-secondary)', 
                          marginBottom: '3px',
                          alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                          padding: '0 4px'
                        }}>
                          {m.role === 'user' ? 'You' : '🤖 Rachel'}
                        </span>
                      )}
                      <div
                        style={{
                          background: m.role === 'user' ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'var(--sidebar-bg)',
                          color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                          padding: '10px 14px',
                          borderRadius: m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                          width: 'fit-content', // Keep adjusted to the length of the texts
                          overflowX: hasTable ? 'auto' : 'visible',
                          overflowY: 'hidden',
                          fontSize: '12.5px',
                          lineHeight: '1.45',
                          border: m.role === 'user' ? 'none' : '1px solid rgba(99, 102, 241, 0.15)',
                          boxShadow: m.role === 'user' ? '0 4px 10px rgba(99,102,241,0.2)' : '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatMessageText(m.content) }}
                      />
                    </div>
                  );
                })}

                {loading && (
                  <div style={{ alignSelf: 'flex-start', background: 'var(--sidebar-bg)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '10px 14px', borderRadius: '16px 16px 16px 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="animate-pulse">🤖 thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleFormSubmit} style={{ borderTop: '1px solid var(--sidebar-border)', padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '50%', 
                    border: 'none', 
                    background: isListening ? '#EF4444' : 'var(--card-item-bg)', 
                    color: isListening ? 'white' : 'var(--text-secondary)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                  title={isListening ? "Listening... click to stop" : "Use Voice Input"}
                >
                  <Mic size={16} style={{ transform: isListening ? 'scale(1.1)' : 'scale(1)' }} />
                </button>
                <style>{`
                  @keyframes wave-bar {
                    0% { transform: scaleY(0.25); }
                    100% { transform: scaleY(1.3); }
                  }
                  @keyframes pulse-dot {
                    0% { opacity: 0.4; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.15); }
                    100% { opacity: 0.4; transform: scale(0.9); }
                  }
                `}</style>
                {isListening ? (
                  <div
                    style={{
                      flex: 1,
                      height: '34px',
                      borderRadius: '99px',
                      border: '1px solid #EF4444',
                      background: 'rgba(239, 68, 68, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 14px',
                      gap: '10px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#EF4444',
                      animation: 'pulse-dot 1.2s infinite ease-in-out'
                    }} />
                    <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600', flex: 1 }}>
                      Listening... Speak now!
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '14px' }}>
                      {[1, 2, 3, 4, 5].map((bar) => {
                        const delays = ['0s', '0.2s', '0.4s', '0.1s', '0.3s'];
                        return (
                          <div
                            key={bar}
                            style={{
                              width: '3px',
                              height: '100%',
                              background: '#EF4444',
                              borderRadius: '2px',
                              transformOrigin: 'bottom',
                              animation: 'wave-bar 0.7s infinite ease-in-out alternate',
                              animationDelay: delays[bar - 1]
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Ask Rachel..."
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: '99px',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      background: 'var(--sidebar-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                )}
                <button
                  type="submit"
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#6366F1',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={15} />
                </button>
              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
