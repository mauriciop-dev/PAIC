import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse, getInitialGreeting } from '../services/geminiService';
import { Message, UserProfile } from '../types';
import { Icon } from './ui/Icon';

interface ChatbotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userProfile: UserProfile | null;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, setIsOpen, userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessageForRetry, setLastUserMessageForRetry] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      // Show welcome menu only if the chat is empty when opened
      if (messages.length === 0) {
        setMessages([
          {
            sender: 'ai',
            text: getInitialGreeting(userProfile?.name),
          },
        ]);
      }
    }
  }, [isOpen, userProfile]); // Re-run if isOpen or userProfile changes

  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  const sendMessageAndGetResponse = async (messageText: string) => {
    const userMessage: Message = { sender: 'user', text: messageText };
    const currentMessages = [...messages.filter(m => !m.isApiKeyRequest), userMessage];
    
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      const aiResponseText = await getChatResponse(messageText, currentMessages, userProfile?.name);
      const aiMessage: Message = { sender: 'ai', text: aiResponseText };
      setMessages((prev) => [...prev, aiMessage]);
      setLastUserMessageForRetry(null); // Clear retry message on success
      setRetryCount(0); // Reset retry counter on success
    } catch (error: any) {
      if (error.message === 'API_KEY_NOT_SELECTED') {
        if (retryCount > 0) {
            const errorMessage: Message = {
                sender: 'ai',
                text: "Parece que hay un problema persistente para acceder a la Clave de API, incluso después de seleccionarla. Por favor, recarga la página e inténtalo de nuevo. Si el problema continúa, verifica la configuración de tu entorno de AI Studio."
            };
            setMessages((prev) => [...prev, errorMessage]);
        } else {
            setLastUserMessageForRetry(messageText); // Save message for retry
            setRetryCount(prev => prev + 1);
            const apiKeyMessage: Message = {
              sender: 'ai',
              text: `Para usar el asistente, por favor selecciona una Clave de API.\n\nTu clave se utiliza para acceder a los servicios de IA de Google y no se almacena en esta aplicación. Puedes encontrar más información sobre la facturación en [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing).`,
              isApiKeyRequest: true,
            };
            setMessages((prev) => [...prev, apiKeyMessage]);
        }
      } else {
        const errorMessageText = error.message || 'Lo siento, ocurrió un error. Por favor, intenta de nuevo.';
        const errorMessage: Message = { sender: 'ai', text: errorMessageText };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const messageText = input;
    setInput('');
    setRetryCount(0); // Reset for new messages
    await sendMessageAndGetResponse(messageText);
  };

  const handleSelectKeyAndRetry = async () => {
    if (!window.aistudio || isLoading) {
      return;
    }
    
    setIsLoading(true);

    try {
      await window.aistudio.openSelectKey();
      if (lastUserMessageForRetry) {
        // Optimistically remove the API key request message from UI
        setMessages(prev => prev.filter(m => !m.isApiKeyRequest));
        
        // Introduce a delay to allow the environment to update with the new API key
        setTimeout(async () => {
            await sendMessageAndGetResponse(lastUserMessageForRetry);
        }, 500); // 500ms delay

      } else {
          setIsLoading(false); // No message to retry, so reset state
      }
    } catch (e) {
      console.error("Error opening select key dialog", e);
       const errorMessage: Message = { sender: 'ai', text: 'No se pudo completar la selección de clave. Por favor, inténtalo de nuevo.' };
       setMessages((prev) => [...prev, errorMessage]);
       setIsLoading(false); // Reset on error
    }
  };

  const renderMessageContent = (msg: Message) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = msg.text.split(linkRegex);

    const content = (
      <p className="text-base whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (i % 3 === 1) {
            const linkText = parts[i];
            const linkUrl = parts[i + 1];
            return (
              <a
                key={i}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-700 font-medium"
              >
                {linkText}
              </a>
            );
          }
          if (i % 3 === 2) return null;
          return part;
        })}
      </p>
    );

    if (msg.isApiKeyRequest) {
      return (
        <div>
          {content}
          <button
            onClick={handleSelectKeyAndRetry}
            disabled={isLoading}
            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isLoading ? 'Procesando...' : 'Seleccionar Clave de API'}
          </button>
        </div>
      );
    }

    return content;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-0 left-0 h-full w-8 md:w-10 bg-blue-600 hover:bg-blue-700 z-50 transition-all duration-300 ease-in-out flex items-center justify-center animate-subtle-pulse"
        aria-label="Open Chatbot"
      >
        <span className="text-white font-bold text-xs transform -rotate-90 whitespace-nowrap">PAIC IA</span>
      </button>
    );
  }

  return (
    <div id="chatbot-overlay" onClick={(e) => { if ((e.target as Element).id === 'chatbot-overlay') setIsOpen(false); }} className="fixed inset-0 bg-black bg-opacity-50 z-40 flex">
      <div className="bg-white w-full md:w-[30%] h-full flex flex-col shadow-2xl">
        <header className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h2 className="text-lg font-semibold">Asistente Inteligente PAIC</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-blue-700">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </header>
        
        <div ref={chatWindowRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Icon name="bot" className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-gray-200 text-gray-800 rounded-br-none' : 'bg-blue-50 text-gray-800 rounded-bl-none'}`}>
                 {renderMessageContent(msg)}
              </div>
              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <img src={userProfile?.picture} alt="User" className="w-full h-full rounded-full" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="bot" className="w-5 h-5 text-blue-600" />
              </div>
              <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-blue-50 text-gray-800 rounded-bl-none flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2 delay-150"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu solicitud aquí..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isLoading || !input.trim()}
            >
              <Icon name="send" className="w-5 h-5"/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;