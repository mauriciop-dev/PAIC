import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { Message, UserProfile } from '../types';
import { Icon } from './ui/Icon';

interface ChatbotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userProfile: UserProfile | null;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, setIsOpen, userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `¡Hola, ${userProfile?.name.split(' ')[0]}! Soy PAIC, tu asistente inteligente. ¿Cómo puedo ayudarte a administrar tu conjunto residencial hoy?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await getChatResponse(input, [...messages, userMessage], userProfile?.name);
      const aiMessage: Message = { sender: 'ai', text: aiResponseText };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = { sender: 'ai', text: 'Lo siento, ocurrió un error. Por favor, intenta de nuevo.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOutsideClick = (e: React.MouseEvent) => {
    if ((e.target as Element).id === 'chatbot-overlay') {
      setIsOpen(false);
    }
  };

  const renderMessageContent = (text: string) => {
    // Regex to find markdown-style links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = text.split(linkRegex);
    
    return (
        <p className="text-sm whitespace-pre-wrap">
            {parts.map((part, i) => {
                // Every 3rd part is the link text, and the 4th is the URL
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
                if (i % 3 === 2) {
                    return null; // This is the URL part, already handled
                }
                return part; // This is a regular text part
            })}
        </p>
    );
  };


  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-0 left-0 h-full w-4 md:w-5 bg-blue-600 hover:bg-blue-700 z-50 transition-all duration-300 ease-in-out flex items-center justify-center animate-subtle-pulse"
        aria-label="Open Chatbot"
      >
        <span className="text-white font-bold text-xs transform -rotate-90 whitespace-nowrap">PAIC IA</span>
      </button>
    );
  }

  return (
    <div id="chatbot-overlay" onClick={handleOutsideClick} className="fixed inset-0 bg-black bg-opacity-50 z-40 flex">
      <div className="bg-white w-full md:w-[35%] h-full flex flex-col shadow-2xl">
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
                 {renderMessageContent(msg.text)}
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
