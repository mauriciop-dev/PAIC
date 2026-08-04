import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';
import { geminiService } from '../services/geminiService';
import { marked } from 'marked';
import { getMainMenuChips, getChipsForNode, getNodePrompt, findSpecById } from './chatbot/chatbotMenu';
import type { ChipDef, FormSpec, ListSpec } from './chatbot/chatbotMenu';
import ChatbotFormCard from './chatbot/ChatbotFormCard';
import { executeAction, loadListForKey, getListEmptyMessage } from '../utils/chatActions';
import type { ListPayload } from '../utils/chatActions';

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

interface UiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  chips?: ChipDef[];
  fallbackChips?: string[];
}

interface ChatbotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userProfile: UserProfile | null;
  conjuntoInfo: ConjuntoInfo | null;
}

const MENU_RESET_LABEL = '☰ Menú';

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, setIsOpen, userProfile, conjuntoInfo }) => {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<FormSpec | null>(null);
  const [activeList, setActiveList] = useState<{ title: string; payload: ListPayload | null; loadKey: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idCounter = useRef(0);

  const nextId = () => `m${++idCounter.current}`;

  const pushMessage = (msg: Omit<UiMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: nextId() }]);
  };

  useEffect(() => {
    if (userProfile && conjuntoInfo && messages.length === 0 && isOpen) {
        geminiService.loadHistory(userProfile, conjuntoInfo).then(saved => {
            if (saved && saved.length > 0) {
                setMessages(saved.map(m => ({ id: nextId(), sender: m.role as 'user' | 'ai', text: m.text })));
            } else {
                pushMessage({
                    sender: 'ai',
                    text: `Hola **${userProfile.fullName}**, soy PAIC y te ayudaré a administrar **${conjuntoInfo.name}**. Elige una opción o escribe tu pregunta.`,
                    chips: getMainMenuChips(),
                });
            }
        });
    } else if (!isOpen) {
        setMessages([]);
        setActiveForm(null);
        setActiveList(null);
        geminiService.resetSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, conjuntoInfo, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
  }, [messages, activeForm, activeList, isLoading]);

  const sendToGemini = async (text: string) => {
    setIsLoading(true);
    try {
      const initialAiMessage = messages[0]?.sender === 'ai' ? messages[0].text : undefined;
      const aiResponseText = await geminiService.runChat(text, userProfile, conjuntoInfo, initialAiMessage);
      pushMessage({ sender: 'ai', text: aiResponseText });
    } catch (error) {
      console.error('Error fetching AI response:', error);
      pushMessage({ sender: 'ai', text: 'Lo siento, ocurrió un error al procesar tu solicitud.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim() === '' || isLoading) return;
    const currentInput = input;
    setInput('');
    pushMessage({ sender: 'user', text: currentInput });
    sendToGemini(currentInput);
  };

  const showNode = (nodeId: string) => {
    const prompt = getNodePrompt(nodeId);
    const chips = getChipsForNode(nodeId);
    pushMessage({
      sender: 'ai',
      text: prompt || 'Elige una opción.',
      chips,
    });
  };

  const handleChipClick = (chip: ChipDef) => {
    if (isLoading) return;
    setActiveForm(null);
    setActiveList(null);
    if (chip.action) {
      openSpec(chip.id);
    } else {
      showNode(chip.id);
    }
  };

  const openSpec = (specId: string) => {
    const spec = findSpecById(specId);
    if (!spec) return;
    if ('submitKey' in spec) {
      pushMessage({ sender: 'ai', text: `**${spec.title}**` });
      setActiveForm(spec as FormSpec);
    } else {
      pushMessage({ sender: 'ai', text: `**${spec.title}**` });
      openList(spec as ListSpec);
    }
  };

  const openList = async (spec: ListSpec) => {
    setActiveList({ title: spec.title, payload: null, loadKey: spec.loadKey });
    if (!conjuntoInfo?.id) return;
    const payload = await loadListForKey(conjuntoInfo.id, spec.loadKey);
    setActiveList({ title: spec.title, payload, loadKey: spec.loadKey });
  };

  const resetToMain = () => {
    if (isLoading) return;
    setActiveForm(null);
    setActiveList(null);
    pushMessage({
      sender: 'ai',
      text: '¿En qué te puedo ayudar?',
      chips: getMainMenuChips(),
    });
  };

  const handleFormSubmit = async (values: Record<string, any>, record?: any) => {
    if (!conjuntoInfo?.id || !activeForm) return;
    const message = await executeAction(conjuntoInfo.id, activeForm.submitKey, values, record);
    setActiveForm(null);
    geminiService.notifyAction(`${activeForm.title}: ${message}`);
    try { window.dispatchEvent(new CustomEvent('data-changed')); } catch {}
    pushMessage({ sender: 'ai', text: `✅ ${message}`, chips: getMainMenuChips() });
  };

  const extractChips = (msg: UiMessage): string[] => {
    if (msg.sender !== 'ai' || msg.chips) return [];
    const text = msg.text;
    const numberedPattern = /^\d+\.\s+(.+)$/gm;
    const matches = text.match(numberedPattern);
    if (matches && matches.length >= 2 && matches.length <= 8) {
      return matches.map(m => m.replace(/^\d+\.\s+/, '').trim()).slice(0, 5);
    }
    return [];
  };

  const renderChips = (chips: ChipDef[] | undefined, fallback: string[]) => {
    if (chips && chips.length > 0) {
      return (
        <div className="ml-10 mt-2 flex flex-wrap gap-2">
          {chips.map((chip, ci) => (
            <button
              key={`${chip.id}-${ci}`}
              onClick={() => handleChipClick(chip)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>
      );
    }
    if (fallback.length > 0) {
      return (
        <div className="ml-10 mt-2 flex flex-wrap gap-2">
          {fallback.map((chip, ci) => (
            <button
              key={ci}
              onClick={() => { pushMessage({ sender: 'user', text: chip }); sendToGemini(chip); }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      );
    }
    return null;
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
        {messages.map((msg) => {
          const fallbackChips = extractChips(msg);
          return (
            <div key={msg.id}>
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
              {renderChips(msg.chips, fallbackChips)}
            </div>
          );
        })}

        {activeForm && conjuntoInfo?.id && (
          <ChatbotFormCard
            form={activeForm}
            conjuntoId={conjuntoInfo.id}
            onSubmit={handleFormSubmit}
            onCancel={() => setActiveForm(null)}
          />
        )}

        {activeList && (
          <div className="ml-10 mt-2 max-w-md">
            <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-md p-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-2">{activeList.title}</p>
              {activeList.payload === null ? (
                <p className="text-xs text-gray-500">Cargando...</p>
              ) : activeList.payload.rows.length === 0 ? (
                <p className="text-xs text-gray-500">{getListEmptyMessage(activeList.loadKey)}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs text-gray-700 w-full">
                    <thead>
                      <tr>
                        {activeList.payload.columns.map(col => (
                          <th key={col} className="text-left font-semibold text-gray-500 pr-3 py-1 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeList.payload.rows.slice(0, 15).map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {row.map((cell, j) => (
                            <td key={j} className="pr-3 py-1 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {activeList.payload.rows.length > 15 && (
                    <p className="text-xs text-gray-400 mt-1">Mostrando 15 de {activeList.payload.rows.length} resultados.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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

      <div id="chatbot-menu-bar" className="px-4 pt-2 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            data-testid="chatbot-menu-reset"
            onClick={resetToMain}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {MENU_RESET_LABEL}
          </button>
          <span className="text-[11px] text-gray-400">Elige una opción o escribe tu pregunta</span>
        </div>
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
