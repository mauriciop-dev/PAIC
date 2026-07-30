import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';

interface DetailedStep {
  step: number;
  section: string;
  selector?: string;
  action: 'click' | 'wait';
  text: string;
}

const optionLabels: Record<number, string> = {
  2: 'Configuraciones Iniciales',
  3: 'Base de Datos',
  4: 'Áreas Comunes',
  5: 'Comunicaciones',
  6: 'Archivos',
  7: 'Finanzas',
  8: 'Seguridad',
  9: 'Vencimientos',
  10: 'Tareas',
};

const stepsByOption: Record<number, DetailedStep[]> = {
  2: [
    { step: 1, section: 'Configuraciones Iniciales', selector: '#btn-configuracion', action: 'click', text: 'Para empezar, haz clic en el icono de Configuración (engranaje).' },
    { step: 2, section: 'Conjunto', action: 'wait', text: 'La pestaña "Conjunto" está abierta por defecto. Llena cada uno de los campos (nombre, NIT, dirección, teléfono, correo) y haz clic en "Guardar Cambios". Presiona Siguiente cuando termines.' },
    { step: 3, section: 'Gestionar Áreas', selector: '#subtab-config-gestionar-areas', action: 'click', text: 'Ahora haz clic en "Gestionar Áreas".' },
    { step: 4, section: 'Gestionar Áreas', action: 'wait', text: 'Agrega al menos un área común. Sugerencias: Salón comunal, Parque, BBQ, etc. Usa el botón + para añadir. Presiona Siguiente cuando termines.' },
    { step: 5, section: 'Puntos de Acceso', selector: '#subtab-config-puntos-de-acceso', action: 'click', text: 'Haz clic en "Puntos de Acceso".' },
    { step: 6, section: 'Puntos de Acceso', action: 'wait', text: 'Agrega al menos un punto de acceso. Sugerencias: Entrada principal, Entrada parqueadero, Entrada peatonal, etc. Presiona Siguiente cuando termines.' },
    { step: 7, section: 'Usuarios', selector: '#subtab-config-usuarios', action: 'click', text: 'Haz clic en "Usuarios".' },
    { step: 8, section: 'Usuarios', action: 'wait', text: 'Agrega un nuevo usuario. Debajo del título dice: "Agrega datos, rol y contraseña del nuevo usuario". Presiona Siguiente cuando termines.' },
    { step: 9, section: 'Permisos de Usuario', selector: '#subtab-config-permisos-de-usuario', action: 'click', text: 'Haz clic en "Permisos de Usuario".' },
    { step: 10, section: 'Permisos de Usuario', action: 'wait', text: 'Edita el usuario que acabas de crear. Se abrirá una ventana con los módulos a los que puedes darle acceso. Presiona Siguiente cuando termines.' },
    { step: 11, section: 'Suscripción', selector: '#subtab-config-suscripcion', action: 'click', text: 'Haz clic en "Suscripción".' },
    { step: 12, section: 'Suscripción', action: 'wait', text: 'Aquí ves tu plan actual y los planes disponibles para hacer upgrade. Cada uno tiene su botón correspondiente. Presiona Siguiente para continuar.' },
    { step: 13, section: 'Completado', action: 'wait', text: '¡Has completado la Configuración Inicial! Ahora cierra la ventana de Configuración. Presiona Siguiente para finalizar.' },
  ],
  3: [
    { step: 1, section: 'Base de Datos', selector: '#tab-base-de-datos', action: 'click', text: 'Haz clic en el módulo "Base de Datos".' },
    { step: 2, section: 'Residentes', selector: '#subtab-residentes', action: 'click', text: 'Ahora haz clic en "Residentes".' },
    { step: 3, section: 'Agregar Registro', action: 'wait', text: 'A la derecha de la pantalla verás un botón azul "Agregar Registro". Haz clic en él.' },
    { step: 4, section: 'Formulario', action: 'wait', text: 'Diligencia los campos: Apartamento, Nombre, Correo Electrónico y Teléfono. Luego haz clic en el botón azul "Guardar". Presiona Siguiente cuando termines.' },
    { step: 5, section: 'Completado', action: 'wait', text: '¡Listo! Has creado un nuevo residente o copropietario. Presiona Siguiente para finalizar.' },
  ],
  4: [
    { step: 1, section: 'Áreas Comunes', selector: '#tab-areas-comunes', action: 'click', text: 'Haz clic en el módulo "Áreas Comunes".' },
    { step: 2, section: 'Agregar Reserva', selector: '#btn-agregar-reserva', action: 'click', text: 'A la derecha verás un botón azul "Agregar Reserva". Haz clic en él.' },
    { step: 3, section: 'Formulario', action: 'wait', text: 'Diligencia todos los campos de la reserva y haz clic en el botón azul "Confirmar reserva". Presiona Siguiente cuando termines.' },
    { step: 4, section: 'Completado', action: 'wait', text: '¡Listo! Has reservado un área común. Presiona Siguiente para finalizar.' },
  ],
  5: [
    { step: 1, section: 'Comunicaciones', selector: '#tab-comunicaciones', action: 'click', text: 'Haz clic en el módulo "Comunicaciones".' },
    { step: 2, section: 'Destinatarios', action: 'wait', text: 'Selecciona "Todos los residentes" — verás que aparecen los correos de todos los residentes. Presiona Siguiente.' },
    { step: 3, section: 'Asunto', action: 'wait', text: 'Escribe un asunto para tu comunicado. Presiona Siguiente cuando lo hayas escrito.' },
    { step: 4, section: 'Mensaje', action: 'wait', text: 'Escribe el mensaje. También puedes pedirle a la IA que te ayude a mejorar la redacción con el botón "Mejorar redacción". Presiona Siguiente.' },
    { step: 5, section: 'Adjuntar Archivo', action: 'wait', text: 'Si quieres, puedes agregar un archivo desde tu repositorio con el botón "Adjuntar desde Archivos". Presiona Siguiente.' },
    { step: 6, section: 'Enviar', action: 'wait', text: 'Haz clic en "Enviar" para enviar tu primer comunicado. Presiona Siguiente cuando lo hayas hecho.' },
    { step: 7, section: 'Completado', action: 'wait', text: '¡Felicitaciones! Ya enviaste tu primer comunicado. Presiona Siguiente para finalizar.' },
  ],
  6: [
    { step: 1, section: 'Archivos', selector: '#tab-archivos', action: 'click', text: 'Haz clic en el módulo "Archivos".' },
    { step: 2, section: 'Subir Archivo', action: 'wait', text: 'Haz clic en el botón azul "Subir archivo". Presiona Siguiente cuando lo hayas hecho.' },
    { step: 3, section: 'Cargar Archivo', action: 'wait', text: 'Selecciona un archivo de tu computador para cargarlo a PAIC. Presiona Siguiente cuando se haya cargado.' },
    { step: 4, section: 'Completado', action: 'wait', text: '¡Listo! Ya tienes tu primer archivo cargado en PAIC para anexarlo a las comunicaciones. Presiona Siguiente para finalizar.' },
  ],
  7: [
    { step: 1, section: 'Finanzas', selector: '#tab-finanzas', action: 'click', text: 'Haz clic en el módulo "Finanzas".' },
    { step: 2, section: 'Ingresos', selector: '#subtab-finanzas-ingresos', action: 'click', text: 'Haz clic en "Ingresos".' },
    { step: 3, section: 'Agregar Ingreso', action: 'wait', text: 'A la derecha de la pantalla, haz clic en el botón "Agregar Ingreso". Presiona Siguiente.' },
    { step: 4, section: 'Formulario', action: 'wait', text: 'Diligencia todos los campos del formulario y haz clic en "Guardar". Presiona Siguiente cuando termines.' },
    { step: 5, section: 'Completado', action: 'wait', text: '¡Listo! Has agregado un ingreso a PAIC. Para agregar un gasto sigue el mismo procedimiento. Presiona Siguiente para finalizar.' },
  ],
  8: [
    { step: 1, section: 'Seguridad', selector: '#tab-seguridad', action: 'click', text: 'Haz clic en el módulo "Seguridad".' },
    { step: 2, section: 'Visitantes', selector: '#subtab-seguridad-visitantes', action: 'click', text: 'Haz clic en "Visitantes".' },
    { step: 3, section: 'Registro Visitante', action: 'wait', text: 'Registra la información del visitante en el formulario. Presiona Siguiente cuando termines.' },
    { step: 4, section: 'Autorizar Ingreso', action: 'wait', text: 'Haz clic en "Autorizar Ingreso" para registrar el ingreso del visitante. Presiona Siguiente.' },
    { step: 5, section: 'Paquetes', selector: '#subtab-seguridad-paquetes', action: 'click', text: 'Ahora haz clic en "Paquetes".' },
    { step: 6, section: 'Registro Paquete', action: 'wait', text: 'Diligencia el formulario de paquete en su totalidad. Presiona Siguiente cuando termines.' },
    { step: 7, section: 'Registrar Recepción', action: 'wait', text: 'Haz clic en "Registrar recepción" para guardar el paquete. Presiona Siguiente.' },
    { step: 8, section: 'Completado', action: 'wait', text: '¡Listo! Has registrado un visitante y un paquete. Presiona Siguiente para finalizar.' },
  ],
  9: [
    { step: 1, section: 'Vencimientos', selector: '#tab-vencimientos', action: 'click', text: 'Haz clic en el módulo "Vencimientos".' },
    { step: 2, section: 'Formulario', action: 'wait', text: 'Diligencia la información del formulario de vencimientos. Presiona Siguiente cuando termines.' },
    { step: 3, section: 'Guardar', action: 'wait', text: 'Haz clic en "Guardar" para registrar el vencimiento. Presiona Siguiente.' },
    { step: 4, section: 'Completado', action: 'wait', text: '¡Listo! Has agregado un nuevo vencimiento. Presiona Siguiente para finalizar.' },
  ],
  10: [
    { step: 1, section: 'Tareas', selector: '#tab-tareas-pendientes', action: 'click', text: 'Haz clic en el módulo "Tareas".' },
    { step: 2, section: 'Formulario', action: 'wait', text: 'Diligencia el formulario: escribe la tarea y selecciona una fecha. Presiona Siguiente cuando termines.' },
    { step: 3, section: 'Agregar', action: 'wait', text: 'Haz clic en "Agregar" para crear la tarea. Presiona Siguiente.' },
    { step: 4, section: 'Completado', action: 'wait', text: '¡Listo! Has agregado una nueva tarea. Revisa las alertas en el Centro de Control y en las notificaciones bajo tu nombre. Presiona Siguiente para finalizar.' },
  ],
};

interface TargetPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DetailedOnboardingProps {
  optionId: number | null;
  onComplete: (optionId: number) => void;
  onClose: () => void;
  userProfile: UserProfile | null;
}

const DetailedOnboarding: React.FC<DetailedOnboardingProps> = ({ optionId, onComplete, onClose, userProfile }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState<TargetPosition | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pulseIntervalRef = useRef<number | null>(null);

  const steps = optionId ? stepsByOption[optionId] : [];
  const label = optionId ? optionLabels[optionId] : '';
  const currentStep = steps[stepIndex];
  const isOpen = optionId !== null;

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  }, [stepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  }, []);

  const handleClose = useCallback(() => {
    setStepIndex(0);
    setTargetPosition(null);
    setIsFinished(false);
    onClose();
  }, [onClose]);

  const handleFinish = useCallback(() => {
    if (optionId) {
      onComplete(optionId);
    }
    setIsFinished(false);
    setStepIndex(0);
    setTargetPosition(null);
  }, [optionId, onComplete]);

  useLayoutEffect(() => {
    if (!isOpen || !currentStep || isFinished || !currentStep.selector) return;
    const updatePosition = () => {
      const el = document.querySelector(currentStep.selector!);
      if (!el) {
        handleNext();
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updatePosition); };
  }, [stepIndex, isOpen, currentStep, handleNext, isFinished]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.action !== 'click' || isFinished || !currentStep.selector) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(currentStep.selector!)) {
        setTimeout(() => handleNext(), 500);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [stepIndex, isOpen, currentStep, handleNext, isFinished]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.action !== 'click' || isFinished || !currentStep.selector) return;
    const el = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!el) return;
    let pulsePhase = 0;
    pulseIntervalRef.current = window.setInterval(() => {
      pulsePhase = pulsePhase === 0 ? 1 : 0;
      const shadow = pulsePhase === 0
        ? '0 0 0 4px rgba(251, 191, 36, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.6)'
        : '0 0 0 8px rgba(251, 191, 36, 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.6)';
      if (spotlightRef.current) {
        spotlightRef.current.style.boxShadow = shadow;
      }
    }, 800);
    return () => { if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current); };
  }, [stepIndex, isOpen, currentStep, isFinished]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setTargetPosition(null);
      setIsFinished(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center" onClick={handleFinish}>
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡{label} Completado!</h2>
          <p className="text-gray-600 mb-6">Continúa con las siguientes opciones del listado para conocer toda la plataforma.</p>
          <button onClick={handleFinish} className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">Continuar</button>
        </div>
      </div>
    );
  }

  const highlightStyle: React.CSSProperties = currentStep?.selector && targetPosition ? {
    position: 'fixed',
    top: `${targetPosition.top - 4}px`,
    left: `${targetPosition.left - 4}px`,
    width: `${targetPosition.width + 8}px`,
    height: `${targetPosition.height + 8}px`,
    boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    zIndex: 10000,
    transition: 'box-shadow 0.3s ease-in-out, top 0.3s ease-in-out, left 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out',
    pointerEvents: 'none',
  } : { display: 'none' };

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetPosition) return { display: 'none' };
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10001,
      transition: 'all 0.3s ease-in-out',
      maxWidth: '320px',
    };
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 288;
    if (targetPosition.top > 300) {
      style.bottom = `${window.innerHeight - targetPosition.top + 8}px`;
      style.left = `${Math.max(16, Math.min(targetPosition.left, viewportWidth - tooltipWidth - 16))}px`;
    } else {
      style.top = `${targetPosition.top + targetPosition.height + 12}px`;
      style.left = `${Math.max(16, Math.min(targetPosition.left, viewportWidth - tooltipWidth - 16))}px`;
    }
    return style;
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div ref={spotlightRef} style={highlightStyle} />
      {currentStep && (
        <div style={getTooltipStyle()} className="bg-white rounded-lg shadow-2xl p-4 w-72 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">{currentStep.section}</span>
            <span className="text-xs font-bold text-gray-400">{stepIndex + 1} / {steps.length}</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{currentStep.text}</p>
          {currentStep.action === 'click' && (
            <p className="text-xs text-amber-600 font-semibold mb-2">Haz clic en el elemento resaltado</p>
          )}
          <div className="flex justify-between items-center border-t pt-2">
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={handlePrev} className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                  Anterior
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                Saltar
              </button>
              {currentStep.action === 'wait' && (
                <button onClick={handleNext} className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700">
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedOnboarding;
