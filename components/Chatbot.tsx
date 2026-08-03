import React, { useState, useRef, useEffect } from 'react';
import { Message, UserProfile, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';
import { geminiService } from '../services/geminiService';
import { marked } from 'marked';

// A simple renderer component defined within the Chatbot component file
// It uses the 'marked' library to parse markdown and Tailwind's prose classes for styling.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (typeof content !== 'string') {
    console.error('MarkdownRenderer received non-string content:', content);
    return null;
  }
  // marked.parse() converts Markdown string to HTML.
  const rawMarkup = marked.parse(content, { gfm: true, breaks: true });
  return (
    <div
      className="prose prose-sm prose-strong:font-semibold max-w-full"
      dangerouslySetInnerHTML={{ __html: rawMarkup as string }}
    />
  );
};


interface ChatbotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userProfile: UserProfile | null;
  conjuntoInfo: ConjuntoInfo | null;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, setIsOpen, userProfile, conjuntoInfo }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (userProfile && conjuntoInfo && messages.length === 0 && isOpen) {
        geminiService.loadHistory(userProfile, conjuntoInfo).then(saved => {
            if (saved && saved.length > 0) {
                setMessages(saved.map(m => ({ sender: m.role as 'user' | 'ai', text: m.text })));
            } else {
                setMessages([
                    { sender: 'ai', text: `Hola **${userProfile.fullName}**, soy PAIC y te ayudaré a administrar **${conjuntoInfo.name}**.\n\n¿En qué te puedo ayudar hoy?\n\n1. Base de datos\n2. Áreas comunes\n3. Comunicaciones\n4. Finanzas\n5. Seguridad\n6. Vencimientos\n7. Tareas\n\nPuedes elegir una opción o escribir tu solicitud.` }
                ]);
            }
        });
    } else if (!isOpen) {
        setMessages([]);
        geminiService.resetSession();
    }
  }, [userProfile, conjuntoInfo, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Set a timeout to focus the input after the panel transition is complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Corresponds to the transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Re-focus the input after the AI has responded
  useEffect(() => {
    if (!isLoading && isOpen) {
        inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Pass the initial AI message from the UI state to give context to the model
      const initialAiMessage = messages[0]?.sender === 'ai' ? messages[0].text : undefined;
      const aiResponseText = await geminiService.runChat(currentInput, userProfile, conjuntoInfo, initialAiMessage);
      const aiMessage: Message = { sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage: Message = { sender: 'ai', text: 'Lo siento, ocurrió un error al procesar tu solicitud.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (chipText: string) => {
    if (isLoading) return;
    setInput(chipText);
    // Allow state to settle, then send
    setTimeout(() => {
      const userMessage: Message = { sender: 'user', text: chipText };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      (async () => {
        try {
          const aiResponseText = await geminiService.runChat(chipText, userProfile, conjuntoInfo);
          const aiMessage: Message = { sender: 'ai', text: aiResponseText };
          setMessages(prev => [...prev, aiMessage]);
        } catch {
          setMessages(prev => [...prev, { sender: 'ai', text: 'Lo siento, ocurrió un error.' }]);
        } finally {
          setIsLoading(false);
        }
      })();
    }, 50);
  };

  const extractChips = (msg: Message): string[] => {
    if (msg.sender !== 'ai') return [];
    const text = msg.text;
    // Check if it has numbered options (e.g., "1. Base de datos\n2. ...")
    const numberedPattern = /^\d+\.\s+(.+)$/gm;
    const matches = text.match(numberedPattern);
    if (matches && matches.length >= 2 && matches.length <= 8) {
      return matches.map(m => m.replace(/^\d+\.\s+/, '').trim()).slice(0, 5);
    }
    return [];
  };

  const containerClasses = `
    fixed top-0 h-full bg-white shadow-2xl z-30 flex flex-col font-sans border-r border-gray-200
    transition-all duration-300 ease-in-out
    ${isOpen ? 'left-0 w-full md:w-[30%]' : '-left-full md:-left-[30%] w-full md:w-[30%]'}
  `;

  return (
    <aside className={containerClasses}>
      <header id="chatbot-header-options" className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
            <Icon name="bot" className="w-8 h-8 text-blue-600" />
            <div>
                <h2 className="text-lg font-bold text-gray-800">Asistente PAIC</h2>
                <p className="text-xs text-green-600 font-semibold">● Conectado</p>
            </div>
        </div>
        <button id="btn-close-chatbot" onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const chips = extractChips(msg);
          return (
            <div key={index}>
              <div className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm">
                    🤖
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-md px-4 py-3 break-words ${
                    msg.sender === 'ai'
                      ? 'bg-gray-100 text-gray-800 rounded-[18px] rounded-tl-md'
                      : 'bg-blue-600 text-white rounded-[18px] rounded-br-md'
                  }`}
                >
                  {msg.sender === 'user' 
                    ? <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                    : <MarkdownRenderer content={msg.text} />
                  }
                </div>
                {msg.sender === 'user' && userProfile && userProfile.avatarUrl && <img src={userProfile.avatarUrl} alt="User" className="w-8 h-8 rounded-full flex-shrink-0" />}
              </div>
              {chips.length > 0 && (
                <div className="ml-10 mt-2 flex flex-wrap gap-2">
                  {chips.map((chip, ci) => (
                    <button
                      key={ci}
                      onClick={() => handleChipClick(chip)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
            <div className="flex items-start gap-3">
                <Icon name="bot" className="w-8 h-8 p-1.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0" />
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-none">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div id="chatbot-input-box" className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder="Escribe tu mensaje o elige una opción..."
            className="flex-1 bg-transparent p-2 text-sm text-gray-800 focus:outline-none resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <Icon name="send" className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        data-testid="chatbot-bottom-spacer"
        className="md:hidden h-[calc(64px+env(safe-area-inset-bottom,0px))] flex-shrink-0"
        aria-hidden="true"
      />
    </aside>
  );
};

export default Chatbot;