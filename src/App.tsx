import React, { useState, useEffect } from 'react';
import { Clock, Code, Send, User, ChevronDown, ChevronUp, Check, X, Copy } from 'lucide-react';
import { generateCodeResponse } from './services/gemini';
import { QAPair, fetchQAPairs, insertQAPair, subscribeToQAPairs } from './services/supabase';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ExtendedQAPair extends QAPair {
  expanded: boolean;
}

function App() {
  const [userName, setUserName] = useState('');
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [question, setQuestion] = useState('');
  const [code, setCode] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qaPairs, setQaPairs] = useState<ExtendedQAPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy code', 'error');
    }
  };

  // Subscribe to real-time Q&A pairs from Supabase
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        unsubscribe = await subscribeToQAPairs((data) => {
          const extendedData = data.map(pair => ({
            ...pair,
            expanded: false
          }));
          setQaPairs(extendedData);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error setting up subscription:', error);
        if (error instanceof Error && error.message.includes('Supabase not configured')) {
          showToast('Please connect to Supabase to use the shared Q&A feed', 'info');
        } else {
          showToast('Failed to connect to database', 'error');
        }
        setIsLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Load saved username on app start
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
      setIsWelcomeScreen(false);
    }
  }, []);

  const showToast = (message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const handleWelcomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName.trim());
      setIsWelcomeScreen(false);
      showToast(`Welcome, ${userName}!`, 'success');
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsGenerating(true);
    
    try {
      // Generate AI response using Gemini
      const aiResponse = await generateCodeResponse(question.trim(), code.trim() || undefined);
      
      // Save to Supabase
      await insertQAPair({
        question: question.trim(),
        code: code.trim() || undefined,
        answer: aiResponse.code,
        language: aiResponse.language,
        user_name: userName
      });

      setQuestion('');
      setCode('');
      setShowCodeEditor(false);
      showToast('Question posted to shared feed!', 'success');
    } catch (error) {
      console.error('Error generating response:', error);
      showToast('Failed to post question. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAnswer = (id: string) => {
    setQaPairs(prev => prev.map(pair => 
      pair.id === id ? { ...pair, expanded: !pair.expanded } : pair
    ));
  };

  const formatTimeRemaining = (timestamp: number) => {
    const now = new Date().getTime();
    const expiresAt = new Date(timestamp).getTime();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return '⏳ Expired';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return `⏳ ${hours}h ${minutes}m`;
  };

  if (isWelcomeScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-blue-400/10 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl hover:bg-white/10 transition-all duration-500 hover:border-blue-400/30">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mb-4 shadow-lg shadow-blue-500/25">
                <Code className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Code Q&A Assistant</h1>
              <p className="text-blue-200/80">Ask programming questions, get code-only answers</p>
            </div>

            <form onSubmit={handleWelcomeSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-blue-200/90 mb-2">
                  Enter your name to continue
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300/60" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Enter App
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-400/5 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 6 + 3}px`,
              height: `${Math.random() * 6 + 3}px`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 4 + 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Code Q&A Assistant</h1>
          <p className="text-blue-200/80">Welcome back, <span className="text-blue-300 font-semibold">{userName}</span></p>
        </div>

        {/* Question Submission Panel */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 shadow-2xl hover:bg-white/10 transition-all duration-500">
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Enter your programming question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300 resize-none"
                placeholder="e.g., How do I implement a binary search algorithm in Python?"
                rows={3}
                required
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className="inline-flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors duration-300"
              >
                <Code className="w-4 h-4" />
                <span>Include code snippet (optional)</span>
                {showCodeEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showCodeEditor && (
                <div className="mt-3 transition-all duration-300">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-green-300 placeholder-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300 font-mono text-sm resize-none"
                    placeholder="// Paste your code here..."
                    rows={6}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Answer...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Generate Answer</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Q&A Feed */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Live Q&A Feed</h2>
          
          {isLoading ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-blue-200/70">Loading shared Q&A feed...</p>
            </div>
          ) : qaPairs.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <Code className="w-12 h-12 text-blue-400/50 mx-auto mb-4" />
              <p className="text-blue-200/70">No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            qaPairs.map((pair) => (
              <div
                key={pair.id}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-300 font-medium">{pair.user_name}</span>
                      <span className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200">
                        {formatTimeRemaining(pair.expires_at)}
                      </span>
                    </div>
                    <p className="text-white mb-3">{pair.question}</p>
                    {pair.code && (
                      <div className="bg-black/30 border border-white/10 rounded-lg p-3 mb-3">
                        <pre className="text-green-300 text-sm font-mono overflow-x-auto">
                          {pair.code}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleAnswer(pair.id)}
                  className="inline-flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors duration-300 mb-4"
                >
                  <span>{pair.expanded ? 'Hide Answer' : 'View Answer'}</span>
                  {pair.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {pair.expanded && (
                  <div className="transition-all duration-300">
                    <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-green-400 font-medium uppercase tracking-wide">
                          {pair.language}
                        </span>
                        <button
                          onClick={() => copyToClipboard(pair.answer)}
                          className="inline-flex items-center space-x-1 text-green-400 hover:text-green-300 transition-colors duration-200 text-xs"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <pre className="text-green-300 text-sm font-mono overflow-x-auto leading-relaxed">
                        {pair.answer}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`backdrop-blur-xl bg-white/10 border rounded-lg p-4 shadow-xl transition-all duration-300 transform translate-x-0 ${
              toast.type === 'success' ? 'border-green-400/30' :
              toast.type === 'error' ? 'border-red-400/30' :
              'border-blue-400/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : toast.type === 'error' ? (
                <X className="w-5 h-5 text-red-400" />
              ) : (
                <Clock className="w-5 h-5 text-blue-400" />
              )}
              <span className="text-white text-sm">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;