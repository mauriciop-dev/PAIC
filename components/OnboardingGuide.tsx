
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Icon } from './ui/Icon';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    target: '#main-navbar',
    content: '¡Bienvenido a PAIC! Esta es tu barra de navegación principal. Desde aquí puedes acceder a todos los módulos de gestión de tu conjunto.',
    position: 'bottom',
  },
  {
    target: '#chatbot-toggle-button',
    content: 'Este es tu Asistente de IA. Haz clic aquí en cualquier momento para pedirle que realice tareas, consulte información o te ayude a gestionar la plataforma.',
    position: 'right',
  },
  {
    target: '#user-menu-dropdown',
    content: 'Desde este menú puedes acceder a la configuración de tu cuenta, tu suscripción y cerrar sesión de forma segura.',
    position: 'bottom-right',
  },
];

interface TargetPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState<TargetPosition | null>(null);

  const currentStep = steps[stepIndex];
  
  useLayoutEffect(() => {
    if (!isOpen || !currentStep) return;

    const updatePosition = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        // If element is not found, skip to the next step or end tour
        handleNext();
      }
    };
    
    // Use a timeout to ensure the element is rendered before we measure it
    const timer = setTimeout(updatePosition, 100);
    
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };

  }, [stepIndex, isOpen, currentStep]);

  if (!isOpen || !targetPosition) return null;

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };
  
  const highlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${targetPosition.top - 4}px`,
    left: `${targetPosition.left - 4}px`,
    width: `${targetPosition.width + 8}px`,
    height: `${targetPosition.height + 8}px`,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    zIndex: 10000,
    transition: 'all 0.3s ease-in-out',
  };
  
  const getTooltipPosition = () => {
      const style: React.CSSProperties = {
          position: 'absolute',
          zIndex: 10001,
          transition: 'all 0.3s ease-in-out',
      };
      switch(currentStep.position) {
          case 'bottom':
              style.top = `${targetPosition.top + targetPosition.height + 12}px`;
              style.left = `${targetPosition.left}px`;
              break;
          case 'bottom-right':
              style.top = `${targetPosition.top + targetPosition.height + 12}px`;
              // The tooltip is w-72 which is 18rem = 288px.
              // Align the right edge of the tooltip with the right edge of the target.
              style.left = `${targetPosition.left + targetPosition.width - 288}px`;
              break;
          case 'right':
              style.top = `${targetPosition.top}px`;
              style.left = `${targetPosition.left + targetPosition.width + 12}px`;
              break;
          default:
              style.top = `${targetPosition.top + targetPosition.height + 12}px`;
              style.left = `${targetPosition.left}px`;
              break;
      }
      return style;
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <div style={highlightStyle}></div>
      <div 
        style={getTooltipPosition()} 
        className="bg-white rounded-lg shadow-2xl p-4 w-72"
      >
        <p className="text-sm text-gray-700 mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500">{stepIndex + 1} / {steps.length}</span>
          <div className="flex gap-2">
            {stepIndex > 0 && <button onClick={handlePrev} className="text-sm font-semibold text-gray-600 hover:text-gray-800">Anterior</button>}
            <button onClick={handleNext} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700">
              {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
