import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { apiService } from '../services/apiService';

interface OnboardingStep {
  step: number;
  section: string;
  selector: string;
  action: 'click' | 'wait';
  duration?: number;
  audio_text: string;
}

const steps: OnboardingStep[] = [
  { step: 1, section: "Introducción", selector: "#paic-title", action: "wait", duration: 5000, audio_text: "Bienvenidos a PAIC, la Plataforma de Administración Inteligente de Copropiedades. PAIC está dirigida para administradores de conjuntos residenciales, torres de oficinas, torres mixtas y complejos de bodegas. Nuestra interfaz tiene dos grandes componentes: el chatbot y la interfaz principal." },
  { step: 2, section: "Chatbot - Apertura", selector: "#btn-chatbot", action: "click", audio_text: "Por favor, haga clic en el botón del chatbot para conocer sus funciones." },
  { step: 3, section: "Chatbot - Opciones", selector: "#chatbot-header-options", action: "wait", duration: 4000, audio_text: "En la parte superior del chat podrá ver el saludo y las opciones principales disponibles para interactuar de forma rápida." },
  { step: 4, section: "Chatbot - Interacción", selector: "#chatbot-input-box", action: "wait", duration: 4000, audio_text: "Aquí abajo encontrará la caja de texto. Podrá interactuar haciendo clic en las opciones sugeridas o escribiendo directamente sus preguntas." },
  { step: 5, section: "Chatbot - Cierre", selector: "#btn-close-chatbot", action: "click", audio_text: "Para continuar con el recorrido, haga clic en la equis de la parte superior derecha para cerrar el chat y regresar a la interfaz." },
  { step: 6, section: "Interfaz - Introducción", selector: "#main-navigation-tabs", action: "wait", duration: 4000, audio_text: "Ahora pasamos a la interfaz. Esta se compone de varios módulos que puede ver en cada una de las pestañas. A medida que avancemos, le pediré que haga clic en cada una para activar su explicación." },
  { step: 7, section: "Módulo Centro de Control", selector: "#tab-centro-de-control", action: "click", audio_text: "Haga clic en la pestaña Centro de Control. Este es un panel con el resumen general de la copropiedad: propietarios en mora, tareas pendientes, pagos vencidos, paquetes por entregar, notificaciones y un gráfico con cinco tipos de información clave." },
  { step: 8, section: "Módulo Base de Datos", selector: "#tab-base-de-datos", action: "click", audio_text: "Por favor, haga clic en la pestaña Base de Datos." },
  { step: 9, section: "Submódulo Residentes", selector: "#subtab-residentes", action: "wait", duration: 5000, audio_text: "En la pestaña Residentes puede registrar a los copropietarios. Cuenta con una opción para descargar una plantilla de Excel y cargar la información masivamente, o puede usar el botón Agregar Registro en la parte derecha para un ingreso individual." },
  { step: 10, section: "Módulo Áreas Comunes", selector: "#tab-areas-comunes", action: "click", audio_text: "Los submódulos de Estado de Cuentas, Proveedores e Internos se manejan igual. Pasemos ahora al módulo Áreas Comunes. Por favor, haga clic en él." },
  { step: 11, section: "Áreas Comunes - Reserva", selector: "#btn-agregar-reserva", action: "click", audio_text: "Este módulo se compone de un calendario y el botón Agregar Reserva. Haga clic en el botón para ver la ventana modal donde se diligencian los datos del espacio solicitado." },
  { step: 12, section: "Módulo Comunicaciones", selector: "#tab-comunicaciones", action: "click", audio_text: "Continuemos. Por favor, haga clic en el módulo de Comunicaciones." },
  { step: 13, section: "Comunicaciones - Formulario", selector: "#form-comunicaciones", action: "wait", duration: 5000, audio_text: "Desde aquí puede enviar correos electrónicos a los copropietarios. El formulario incluye campos específicos, destinatarios sugeridos y un botón para adjuntar archivos, actas o el reglamento de la copropiedad." },
  { step: 14, section: "Módulo Archivos", selector: "#tab-archivos", action: "click", audio_text: "Haga clic ahora en el módulo Archivos." },
  { step: 15, section: "Archivos - Repositorio", selector: "#repo-archivos", action: "wait", duration: 4000, audio_text: "Aquí puede subir actas de asambleas, reglamentos y circulares para tenerlos en un solo lugar. Estos documentos son los que podrá adjuntar en el módulo de comunicaciones. También puede descargarlos o eliminarlos." },
  { step: 16, section: "Módulo Finanzas", selector: "#tab-finanzas", action: "click", audio_text: "Pasemos al módulo de Finanzas, el cual cuenta con tres submódulos. Haga clic para ingresar." },
  { step: 17, section: "Submódulo Finanzas - Resumen", selector: "#subtab-finanzas-resumen", action: "click", audio_text: "Haga clic en Resumen. Verá un panel sencillo con la relación de Ingresos y Gastos de los últimos seis meses para conocer la salud financiera de la copropiedad." },
  { step: 18, section: "Submódulo Finanzas - Ingresos", selector: "#subtab-finanzas-ingresos", action: "click", audio_text: "Haga clic en Ingresos. En esta sección se cargan los flujos entrantes mediante una plantilla descargable o con el botón azul de la interfaz. Cada registro se puede editar o eliminar." },
  { step: 19, section: "Submódulo Finanzas - Gastos", selector: "#subtab-finanzas-gastos", action: "click", audio_text: "Haga clic en Gastos. Funciona exactamente igual, permitiendo registrar los egresos mediante plantillas o de forma manual con el botón azul." },
  { step: 20, section: "Módulo Seguridad", selector: "#tab-seguridad", action: "click", audio_text: "Ahora veamos el módulo de Seguridad, diseñado para el personal de custodia. Por favor, haga clic en él." },
  { step: 21, section: "Submódulo Seguridad - Visitantes", selector: "#subtab-seguridad-visitantes", action: "click", audio_text: "Haga clic en Visitantes. En el lado izquierdo se encuentra el formulario de registro y a la derecha se gestiona el estado, controlando los ingresos y salidas." },
  { step: 22, section: "Submódulo Seguridad - Paquetes", selector: "#subtab-seguridad-paquetes", action: "click", audio_text: "Haga clic en Paquetes. Permite registrar las encomiendas recibidas a la izquierda y gestionar en el panel derecho si ya fueron entregadas al propietario." },
  { step: 23, section: "Módulo Vencimientos", selector: "#tab-vencimientos", action: "click", audio_text: "Por favor, haga clic en el módulo Vencimientos." },
  { step: 24, section: "Vencimientos - Gestión", selector: "#panel-vencimientos", action: "wait", duration: 5000, audio_text: "Aquí puede agregar obligaciones pendientes como impuestos o pagos a proveedores con el botón azul. PAIC cuenta con una alerta en la barra superior que le recordará activamente estas fechas." },
  { step: 25, section: "Módulo Tareas", selector: "#tab-tareas-pendientes", action: "click", audio_text: "Haga clic en el módulo Tareas." },
  { step: 26, section: "Tareas - Flujo", selector: "#panel-tareas", action: "wait", duration: 4000, audio_text: "En esta sección puede añadir pendientes con su respectiva fecha límite o eliminarlos. Recuerde que estas tareas también aparecerán reflejadas en su Centro de Control." },
  { step: 27, section: "Módulo Configuración", selector: "#btn-configuracion", action: "click", audio_text: "Haga clic en el icono de engranaje para abrir la Configuración. Veremos una ventana modal con siete submódulos." },
  { step: 28, section: "Configuración - Perfil", selector: "#subtab-config-perfil", action: "wait", duration: 4000, audio_text: "En Perfil visualizará su foto, correo y nombre de registro, datos que son gestionados de forma segura a través de Google." },
  { step: 29, section: "Configuración - Conjunto", selector: "#subtab-config-conjunto", action: "click", audio_text: "Haga clic en Conjunto. Aquí gestionará los datos principales de la copropiedad: nombre, NIT, dirección, administrador, correo y teléfono." },
  { step: 30, section: "Configuración - Gestionar Áreas", selector: "#subtab-config-gestionar-areas", action: "click", audio_text: "Haga clic en Gestionar Áreas. Aquí dará de alta los espacios comunes como parque infantil, BBQ o salón social, los cuales alimentarán el módulo de Áreas Comunes que vimos antes." },
  { step: 31, section: "Configuración - Puntos de Acceso", selector: "#subtab-config-puntos-de-acceso", action: "click", audio_text: "Haga clic en Puntos de Acceso. Defina los lugares de control, como portería principal o visitantes. Esto es clave para asignar los permisos del personal de seguridad." },
  { step: 32, section: "Configuración - Usuarios", selector: "#subtab-config-usuarios", action: "click", audio_text: "Haga clic en Usuarios. Agregue al personal, como los guardias de seguridad, ingresando su nombre, correo y rol asignado." },
  { step: 33, section: "Configuración - Permisos", selector: "#subtab-config-permisos-de-usuario", action: "click", audio_text: "Haga clic en Permisos de Usuario. Aquí restringe o habilita el acceso a módulos específicos. Por ejemplo, acceso exclusivo de Seguridad para los guardias o de Finanzas para la contadora." },
  { step: 34, section: "Configuración - Suscripción", selector: "#subtab-config-suscripcion", action: "click", audio_text: "Haga clic en Suscripción. Una vez terminen sus catorce días de prueba, aquí podrá realizar el upgrade para continuar disfrutando de la administración de su copropiedad con PAIC." },
  { step: 35, section: "Botón Soporte", selector: "#btn-soporte", action: "click", audio_text: "Finalmente, cerremos la configuración. En la parte superior derecha encontrará el botón azul de Soporte. Este despliega videotutoriales, el activador del tour guiado y el contacto técnico." },
  { step: 36, section: "Botón Usuario", selector: "#btn-avatar-usuario", action: "click", audio_text: "Haciendo clic en su foto de perfil en la esquina superior derecha, podrá gestionar su cuenta o cerrar sesión de manera segura. ¡Con esto concluye nuestro recorrido general por PAIC!" },
];

interface TargetPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose, userProfile }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState<TargetPosition | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pulseIntervalRef = useRef<number | null>(null);

  const currentStep = steps[stepIndex];

  const getSpanishVoice = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang.startsWith('es')) || voices.find(v => v.lang.startsWith('es-')) || null;
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 0.9;
    const spanishVoice = getSpanishVoice();
    if (spanishVoice) utterance.voice = spanishVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getSpanishVoice]);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const handleNext = useCallback(() => {
    cancelSpeech();
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  }, [stepIndex, cancelSpeech]);

  const handlePrev = useCallback(() => {
    cancelSpeech();
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  }, [cancelSpeech]);

  const handleClose = useCallback(async () => {
    cancelSpeech();
    if (userProfile) {
      try {
        await apiService.updateUserProfile({ ...userProfile, onboardingCompleted: true } as any);
      } catch (e) {
        localStorage.setItem(`onboardingCompleted-${userProfile.id}`, 'true');
      }
    }
    setIsFinished(false);
    setStepIndex(0);
    setTargetPosition(null);
    onClose();
  }, [cancelSpeech, onClose, userProfile]);

  useLayoutEffect(() => {
    if (!isOpen || !currentStep || isFinished) return;
    const updatePosition = () => {
      const el = document.querySelector(currentStep.selector);
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
    if (!isOpen || !currentStep || isFinished) return;
    const timer = setTimeout(() => speak(currentStep.audio_text), 400);
    return () => clearTimeout(timer);
  }, [stepIndex, isOpen, currentStep, speak, isFinished]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.action !== 'click' || isFinished || isSpeaking) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(currentStep.selector)) {
        setTimeout(() => handleNext(), 500);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [stepIndex, isOpen, currentStep, handleNext, isFinished, isSpeaking]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.action !== 'wait' || isFinished || isSpeaking) return;
    const timer = setTimeout(() => handleNext(), currentStep.duration || 4000);
    return () => clearTimeout(timer);
  }, [stepIndex, isOpen, currentStep, handleNext, isFinished, isSpeaking]);

  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.action !== 'click' || isFinished) return;
    const el = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!el) return;
    let pulsePhase = 0;
    pulseIntervalRef.current = window.setInterval(() => {
      pulsePhase = pulsePhase === 0 ? 1 : 0;
      const shadow = pulsePhase === 0
        ? '0 0 0 4px rgba(59, 130, 246, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.6)'
        : '0 0 0 8px rgba(59, 130, 246, 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.6)';
      if (spotlightRef.current) {
        spotlightRef.current.style.boxShadow = shadow;
      }
    }, 800);
    return () => { if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current); };
  }, [stepIndex, isOpen, currentStep, isFinished]);

  useEffect(() => {
    if (!isOpen) {
      cancelSpeech();
      setStepIndex(0);
      setTargetPosition(null);
      setIsFinished(false);
    }
  }, [isOpen, cancelSpeech]);

  if (!isOpen) return null;

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center" onClick={handleClose}>
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Recorrido Completado!</h2>
          <p className="text-gray-600 mb-6">Ahora conoces todas las funcionalidades de PAIC. Empieza a gestionar tu copropiedad de forma inteligente.</p>
          <button onClick={handleClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">¡Comenzar!</button>
        </div>
      </div>
    );
  }

  const highlightStyle: React.CSSProperties = targetPosition ? {
    position: 'fixed',
    top: `${targetPosition.top - 4}px`,
    left: `${targetPosition.left - 4}px`,
    width: `${targetPosition.width + 8}px`,
    height: `${targetPosition.height + 8}px`,
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
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
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{currentStep.section}</span>
            <span className="text-xs font-bold text-gray-400">{stepIndex + 1} / {steps.length}</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{currentStep.audio_text}</p>
          {isSpeaking ? (
            <div className="flex items-center gap-2 mb-2 bg-blue-50 rounded-md px-2 py-1.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-blue-600 font-medium">Reproduciendo explicación...</span>
            </div>
          ) : (
            currentStep.action === 'click' ? (
              <p className="text-xs text-amber-600 font-semibold mb-2">👆 Haz clic en el elemento resaltado</p>
            ) : (
              <div className="flex items-center gap-1 mb-2 text-green-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-xs font-medium">Explicación completada</span>
              </div>
            )
          )}
          <div className="flex justify-between items-center border-t pt-2">
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button onClick={handlePrev} className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                  ◀ Anterior
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { cancelSpeech(); onClose(); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                Saltar
              </button>
              {currentStep.action === 'wait' && !isSpeaking && (
                <button onClick={handleNext} className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700">
                  Siguiente ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingGuide;