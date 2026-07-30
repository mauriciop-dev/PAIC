import React from 'react';
import { Icon } from './ui/Icon';

interface OptionItem {
  id: number;
  label: string;
  description: string;
  icon: string;
  completed: boolean;
  glowing: boolean;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (optionId: number) => void;
  options: OptionItem[];
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSelectOption, options }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 md:w-[520px] relative max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
            <Icon name="x" className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Inicia aquí</h2>
              <p className="text-sm text-gray-500">Elige lo que quieres hacer</p>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          <style>{`
            @keyframes option-glow {
              0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4), 0 0 0 0 rgba(251, 191, 36, 0.1); }
              50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.3), 0 0 0 8px rgba(251, 191, 36, 0.05); }
            }
            @keyframes option-shimmer {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            .option-glow {
              animation: option-glow 2s ease-in-out infinite;
              border-color: #fbbf24;
            }
            .option-shimmer {
              background: linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.1) 50%, transparent 100%);
              background-size: 200% 100%;
              animation: option-shimmer 2s ease-in-out infinite;
            }
          `}</style>

          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSelectOption(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
                opt.completed
                  ? 'bg-green-50 border-green-200 opacity-75'
                  : opt.glowing
                    ? 'bg-white border-amber-300 option-glow shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                opt.completed
                  ? 'bg-green-100'
                  : opt.id === 1
                    ? 'bg-blue-100'
                    : opt.glowing
                      ? 'bg-amber-100'
                      : 'bg-gray-100'
              }`}>
                {opt.completed ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`text-sm font-bold ${
                    opt.id === 1 ? 'text-blue-600' : opt.glowing ? 'text-amber-600' : 'text-gray-500'
                  }`}>{opt.id}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${
                  opt.completed ? 'text-green-800' : opt.glowing ? 'text-amber-900' : 'text-gray-800'
                }`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{opt.description}</p>
              </div>
              {opt.glowing && !opt.completed && (
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Completados: {options.filter(o => o.completed).length} / {options.length - 1}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
