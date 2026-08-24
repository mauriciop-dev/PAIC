import React, { useState, createContext, useContext } from 'react';
import { Icon } from './Icon';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const typeStyles: Record<ToastType, { bg: string; icon: string; iconBg: string; iconColor: string }> = {
  info: { bg: 'bg-blue-50', icon: 'mail', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  success: { bg: 'bg-green-50', icon: 'checkSquare', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  warning: { bg: 'bg-yellow-50', icon: 'alert-triangle', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  error: { bg: 'bg-red-50', icon: 'alert-triangle', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
};

const typeLabels: Record<ToastType, string> = {
  info: 'Notificación',
  success: 'Éxito',
  warning: 'Advertencia',
  error: 'Error',
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-2">
    {toasts.map((toast) => {
      const style = typeStyles[toast.type];
      return (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-2xl border max-w-lg break-words transition-all duration-300 animate-slide-in ${style.bg} border-gray-200`}
        >
          <div className={`p-2 rounded-full flex-shrink-0 ${style.iconBg}`}>
            <Icon name={style.icon} className={`w-5 h-5 ${style.iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-800">{typeLabels[toast.type]}</p>
            <p className="text-sm text-gray-600">{toast.message}</p>
          </div>
          <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
      );
    })}
  </div>
);

// Add keyframes via style tag (or use CSS file)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slide-in 0.3s ease-out; }
  `;
  document.head.appendChild(style);
}
