import React, { useState, useRef, useEffect } from 'react';
import { Message, UserProfile, ConjuntoInfo } from '../types';
import { Icon } from './ui/Icon';
import { geminiService } from '../services/geminiService';
import { marked } from 'marked';

// A simple renderer component defined within the Chatbot component file
// It uses the 'marked' library to parse markdown and Tailwind's prose classes for styling.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // marked.parse() converts Markdown string to HTML.
  // By default, marked sanitizes the HTML to prevent XSS attacks,
  // making it safe to use with dangerouslySetInnerHTML.
  // gfm: true enables GitHub Flavored Markdown (like tables, strikethrough).
  // breaks: true makes line breaks in the source appear as <br> tags.
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
        setMessages([
            // FIX: Property 'name' does not exist on type 'UserProfile'. Use 'fullName' instead.
            { sender: 'ai', text: `Hola **${userProfile.fullName}**, soy PAIC y te ayudaré a administrar **${conjuntoInfo.name}**.\n\n¿En qué te puedo ayudar hoy?\n\n1. Base de datos\n2. Áreas comunes\n3. Comunicaciones\n4. Finanzas\n5. Seguridad\n6. Vencimientos\n7. Tareas\n\nPuedes elegir una opción o escribir tu solicitud.` }
        ]);
    } else if (!isOpen) {
        // Clear messages when chatbot is closed to ensure it re-initializes with the welcome message
        setMessages([]);
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

       // If the response indicates a successful action, notify other components.
      if (!aiResponseText.startsWith('Lo siento') && !aiResponseText.startsWith('No entendí')) {
          window.dispatchEvent(new CustomEvent('data-changed'));
      }

    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage: Message = { sender: 'ai', text: 'Lo siento, ocurrió un error al procesar tu solicitud.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = `
    fixed top-0 h-full bg-white shadow-2xl z-30 flex flex-col font-sans border-r border-gray-200
    transition-all duration-300 ease-in-out
    ${isOpen ? 'left-0 w-full md:w-[30%]' : '-left-full md:-left-[30%] w-full md:w-[30%]'}
  `;

  return (
    <aside className={containerClasses}>
      <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
            <Icon name="bot" className="w-8 h-8 text-blue-600" />
            <div>
                <h2 className="text-lg font-bold text-gray-800">Asistente PAIC</h2>
                <p className="text-xs text-green-600 font-semibold">● Conectado</p>
            </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <Icon name="bot" className="w-8 h-8 p-1.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0" />}
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words ${
                msg.sender === 'ai'
                  ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                  : 'bg-blue-600 text-white rounded-br-none'
              }`}
            >
              {msg.sender === 'user' 
                ? <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                : <MarkdownRenderer content={msg.text} />
              }
            </div>
            {/* FIX: Property 'picture' does not exist on type 'UserProfile'. Use 'avatarUrl' instead. */}
            {msg.sender === 'user' && userProfile && userProfile.avatarUrl && <img src={userProfile.avatarUrl} alt="User" className="w-8 h-8 rounded-full flex-shrink-0" />}
          </div>
        ))}
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

      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
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
    </aside>
  );
};

export default Chatbot;