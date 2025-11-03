import React, { useState, useRef, useEffect } from 'react';
import { Message, UserProfile } from '../types';
import { Icon } from './ui/Icon';
import { geminiService } from '../services/geminiService';

interface ChatbotProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userProfile: UserProfile | null;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, setIsOpen, userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: `¡Hola! Soy PAIC, tu asistente inteligente. Estoy aquí para ayudarte a administrar tu conjunto.

¿Qué necesitas hacer hoy? Puedes escribirlo o elegir una de estas opciones comunes:

1. Registrar un gasto o ingreso.
2. Crear un recordatorio de tarea.
3. Consultar el saldo de un apartamento (ej: "cuánto debe el apto 101?")
4. Enviar un comunicado a los residentes.
5. Agendar un área común (ej: "reservar el BBQ para el sábado")

También puedo ayudarte a cargar datos desde un archivo Excel.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // FIX: Pass userProfile.conjuntoId to runChat for tenant-specific context.
      const aiResponseText = await geminiService.runChat(currentInput, userProfile?.conjuntoId);
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
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            </div>
            {msg.sender === 'user' && userProfile && <img src={userProfile.picture} alt="User" className="w-8 h-8 rounded-full flex-shrink-0" />}
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