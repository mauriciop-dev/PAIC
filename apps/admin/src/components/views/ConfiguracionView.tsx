import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Badge, Button, Switch, Modal } from '@paic/ui';
import { Icon } from '@paic/ui';
import { usePostHog } from '../../hooks/usePostHog';
import { supabase } from '@paic/supabase';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

type DangerAction = 'eliminar_conjunto' | 'suspender_usuario' | 'resetear_plataforma' | 'eliminar_todos_logs' | 'revocar_todas_sesiones';

interface DangerActionConfig {
  id: DangerAction;
  label: string;
  description: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium';
  confirmText: string;
}

const DANGER_ACTIONS: DangerActionConfig[] = [
  {
    id: 'eliminar_conjunto',
    label: 'Eliminar Conjunto',
    description: 'Elimina permanentemente un conjunto y todos sus datos (usuarios, reservas, pagos, logs). NO SE PUEDE DESHACER.',
    icon: 'trash-2',
    severity: 'critical',
    confirmText: 'ELIMINAR CONJUNTO',
  },
  {
    id: 'suspender_usuario',
    label: 'Suspender Usuario Globalmente',
    description: 'Bloquea el acceso a un usuario en todos los conjuntos. Requiere revisión manual para reactivar.',
    icon: 'user-x',
    severity: 'high',
    confirmText: 'SUSPENDER USUARIO',
  },
  {
    id: 'revocar_todas_sesiones',
    label: 'Revocar Todas las Sesiones',
    description: 'Fuerza el logout de todos los usuarios en todas las apps (webapp, usuarios, admin). Útil en incidentes de seguridad.',
    icon: 'log-in',
    severity: 'high',
    confirmText: 'REVOCAR SESIONES',
  },
  {
    id: 'eliminar_todos_logs',
    label: 'Eliminar Todos los Logs de Auditoría',
    description: 'Purga permanentemente el historial de logs_auditoria. Afecta cumplimiento y debugging.',
    icon: 'trash-2',
    severity: 'critical',
    confirmText: 'ELIMINAR LOGS',
  },
  {
    id: 'resetear_plataforma',
    label: 'Resetear Plataforma (Factory Reset)',
    description: 'ELIMINA TODO: conjuntos, usuarios, pagos, logs, configuraciones. SOLO PARA ENTORNO DE PRUEBAS.',
    icon: 'alert-triangle',
    severity: 'critical',
    confirmText: 'RESETEAR PLATAFORMA',
  },
];

export function ConfiguracionView() {
  const { trackDangerZone, trackConfigChange } = usePostHog();
  
  const [stripeKey, setStripeKey] = useState('sk_live_************************');
  const [mpKey, setMpKey] = useState('APP_USR-************************');
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [fromEmail, setFromEmail] = useState('noreply@paicai.com.co');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState('10');

  // Push Notifications
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  // Zona Peligro - Re-autenticación
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [selectedDangerAction, setSelectedDangerAction] = useState<DangerActionConfig | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  // Push Notifications - Check support and load subscription
  useEffect(() => {
    const checkPushSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setPushSupported(supported);
      
      if (!supported) return;

      // Check existing subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setPushSubscription({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
          });
          setPushEnabled(true);
        }
      } catch (e) {
        console.error('[Config] Error checking push subscription:', e);
      }
    };

    checkPushSupport();
  }, []);

  // Helper functions for push
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!pushSupported) return;
    
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const pushSub: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: pushSub.endpoint,
          p256dh: pushSub.keys.p256dh,
          auth: pushSub.keys.auth,
        }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;

      setPushSubscription(pushSub);
      setPushEnabled(true);
      
      // Track in PostHog
      // trackConfigChange('pushNotifications', false, true);
    } catch (error) {
      console.error('[Config] Error subscribing to push:', error);
      alert(`Error al suscribirse: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setPushLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!pushSubscription) return;
    
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', pushSubscription.endpoint);
      }

      setPushSubscription(null);
      setPushEnabled(false);
      
      // Track in PostHog
      // trackConfigChange('pushNotifications', true, false);
    } catch (error) {
      console.error('[Config] Error unsubscribing from push:', error);
      alert(`Error al desuscribirse: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setPushLoading(false);
    }
  };

  const sections = [
    {
      title: 'Pagos - MercadoPago (Latam)',
      icon: 'dollar-sign',
      fields: [
        { label: 'Access Token', type: 'password', value: mpKey, onChange: setMpKey, placeholder: 'APP_USR-...' },
        { label: 'Public Key', type: 'text', value: 'APP_USR-************************', onChange: () => {}, placeholder: 'APP_USR-...' },
        { label: 'Webhook Secret', type: 'password', value: '************************', onChange: () => {}, placeholder: '...' },
      ]
    },
    {
      title: 'Email - SMTP',
      icon: 'mail',
      fields: [
        { label: 'Servidor SMTP', type: 'text', value: smtpHost, onChange: setSmtpHost, placeholder: 'smtp.sendgrid.net' },
        { label: 'Puerto', type: 'number', value: smtpPort, onChange: setSmtpPort, placeholder: '587' },
        { label: 'Usuario', type: 'text', value: 'apikey', onChange: () => {}, placeholder: 'apikey' },
        { label: 'Contraseña', type: 'password', value: '************************', onChange: () => {}, placeholder: '••••••••' },
        { label: 'Email Remitente', type: 'email', value: fromEmail, onChange: setFromEmail, placeholder: 'noreply@paicai.com.co' },
      ]
    },
    {
      title: 'Plataforma',
      icon: 'settings',
      fields: [
        { 
          label: 'Modo Mantenimiento', 
          type: 'switch', 
          value: maintenanceMode, 
          onChange: (v) => { 
            trackConfigChange('maintenanceMode', maintenanceMode, v);
            setMaintenanceMode(v); 
          },
          description: 'Deshabilita el acceso a todos los usuarios excepto superadmins'
        },
        { 
          label: 'Permitir Registro Público', 
          type: 'switch', 
          value: allowRegistration, 
          onChange: (v) => { 
            trackConfigChange('allowRegistration', allowRegistration, v);
            setAllowRegistration(v); 
          },
          description: 'Permite que nuevos conjuntos se registren por su cuenta'
        },
        { label: 'Tamaño Máx. Archivos (MB)', type: 'number', value: maxFileSize, onChange: (v) => { trackConfigChange('maxFileSize', maxFileSize, v); setMaxFileSize(v); }, placeholder: '10' },
        { 
          label: 'Versión de la API', 
          type: 'text', 
          value: 'v2.4.1', 
          onChange: () => {}, 
          placeholder: 'v2.4.1',
          readonly: true
        },
      ]
    },
    {
      title: 'Notificaciones Push',
      icon: 'bell',
      fields: [
        { 
          label: 'Notificaciones Push', 
          type: 'switch', 
          value: pushEnabled, 
          onChange: (v) => { 
            if (v) {
              subscribeToPush();
            } else {
              unsubscribeFromPush();
            }
          },
          description: pushSupported 
            ? (pushEnabled ? 'Recibirás alertas críticas en tiempo real' : 'Activa para recibir alertas en segundo plano')
            : 'Tu navegador no soporta notificaciones push'
        },
      ]
    },
  ];

  const handleOpenDanger = (action: DangerActionConfig) => {
    setSelectedDangerAction(action);
    setConfirmPassword('');
    setConfirmText('');
    setAuthError('');
    setDangerModalOpen(true);
  };

  const handleConfirmDanger = async () => {
    if (!selectedDangerAction) return;
    
    // Validar confirmación de texto
    if (confirmText !== selectedDangerAction.confirmText) {
      setAuthError(`Debes escribir exactamente: "${selectedDangerAction.confirmText}"`);
      return;
    }

    // Validar contraseña
    if (!confirmPassword) {
      setAuthError('Ingresa tu contraseña de superadmin');
      return;
    }

    setAuthenticating(true);
    setAuthError('');

    try {
      // En producción: llamar a Supabase para verificar contraseña
      // const { error } = await supabase.auth.updateUser({ password: confirmPassword });
      // if (error) throw error;
      
      // Simular verificación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ejecutar acción peligrosa
      await executeDangerAction(selectedDangerAction.id);
      
      trackDangerZone(selectedDangerAction.id, { success: true });
      
      setDangerModalOpen(false);
      setSelectedDangerAction(null);
      
      alert(`Acción "${selectedDangerAction.label}" ejecutada correctamente (simulado)`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error de autenticación');
      trackDangerZone(selectedDangerAction.id, { success: false, error: error instanceof Error ? error.message : 'unknown' });
    } finally {
      setAuthenticating(false);
    }
  };

  const executeDangerAction = async (actionId: DangerAction) => {
    // En producción: llamar Edge Functions específicas
    console.log('[ConfiguracionView] Ejecutando acción peligrosa:', actionId);
    
    switch (actionId) {
      case 'eliminar_conjunto':
        // await supabase.functions.invoke('admin-delete-conjunto', { body: { conjuntoId: ... } });
        break;
      case 'suspender_usuario':
        // await supabase.functions.invoke('admin-suspend-user', { body: { userId: ... } });
        break;
      case 'revocar_todas_sesiones':
        // await supabase.auth.admin.signOutAllUsers();
        break;
      case 'eliminar_todos_logs':
        // await supabase.from('logs_auditoria').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        break;
      case 'resetear_plataforma':
        // await supabase.functions.invoke('admin-factory-reset');
        break;
    }
  };

  const getSeverityBadge = (severity: DangerActionConfig['severity']) => {
    switch (severity) {
      case 'critical': return { variant: 'danger' as const, bg: 'bg-red-100 text-red-700 border-red-200' };
      case 'high': return { variant: 'warning' as const, bg: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { variant: 'info' as const, bg: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Plataforma</h1>
        <p className="text-gray-500 mt-1">Parámetros globales que afectan a toda la plataforma</p>
      </div>

      {sections.map((section, sectionIndex) => (
        <Card key={sectionIndex} className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Icon name={section.icon} className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex} className={field.type === 'switch' ? 'sm:col-span-2' : ''}>
                {field.type === 'switch' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Switch checked={field.value} onChange={field.onChange} />
                    <div>
                      <p className="font-medium text-gray-900">{field.label}</p>
                      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
                    </div>
                  </label>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <Input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                      readOnly={field.readonly}
                      className={field.readonly ? 'bg-gray-50' : ''}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <Button variant="primary" onClick={() => { /* guardar */ }}>
              <Icon name="save" className="w-4 h-4" /> Guardar Cambios
            </Button>
          </div>
        </Card>
      ))}

      {/* ZONA DE PELIGRO - Con re-autenticación */}
      <Card className="p-5 border-red-200 bg-red-50">
        <div className="flex items-start gap-3 mb-6">
          <Icon name="alert-triangle" className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Zona de Peligro</h3>
            <p className="text-sm text-red-600 mt-1">Acciones irreversibles que afectan a toda la plataforma. Requieren re-autenticación con contraseña de superadmin.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DANGER_ACTIONS.map((action) => {
            const severity = getSeverityBadge(action.severity);
            return (
              <div 
                key={action.id} 
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${severity.bg} border-opacity-50`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${severity.bg.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                    <Icon name={action.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severity.bg} border ${severity.bg.replace('bg-', 'border-')}`}>
                    {action.severity.toUpperCase()}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => handleOpenDanger(action)}
                  >
                    <Icon name={action.icon} className="w-3.5 h-3.5" />
                    Ejecutar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Auditoría */}
        <div className="mt-6 pt-4 border-t border-red-200">
          <Button variant="ghost" className="text-red-600 hover:bg-red-100 flex items-center gap-2" onClick={() => { /* abrir auditoría */ }}>
            <Icon name="file-text" className="w-4 h-4" />
            Ver Auditoría Completa
          </Button>
        </div>
      </Card>

      {/* Modal Re-autenticación */}
      <Modal
        isOpen={dangerModalOpen}
        onClose={() => { setDangerModalOpen(false); setSelectedDangerAction(null); setConfirmPassword(''); setConfirmText(''); setAuthError(''); }}
        title="⚠️ Confirmar Acción Peligrosa"
        size="lg"
      >
        {selectedDangerAction && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${getSeverityBadge(selectedDangerAction.severity).bg} border`}>
              <div className="flex items-start gap-3">
                <Icon name={selectedDangerAction.icon} className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedDangerAction.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedDangerAction.description}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-medium text-amber-800 mb-2">Para confirmar, debes completar AMBOS campos:</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Escribe exactamente: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">{selectedDangerAction.confirmText}</code>
                  </label>
                  <Input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={selectedDangerAction.confirmText}
                    className={confirmText && confirmText !== selectedDangerAction.confirmText ? 'border-red-300' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña de Superadmin</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {authError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <Icon name="alert-triangle" className="w-4 h-4" />
                    {authError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => { setDangerModalOpen(false); setSelectedDangerAction(null); setConfirmPassword(''); setConfirmText(''); setAuthError(''); }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDanger}
                disabled={authenticating}
                className="flex items-center gap-2"
              >
                {authenticating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Icon name={selectedDangerAction.icon} className="w-4 h-4" />
                    {selectedDangerAction.confirmText}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function getSeverityBadge(severity: DangerActionConfig['severity']) {
  switch (severity) {
    case 'critical': return { variant: 'danger' as const, bg: 'bg-red-100 text-red-700 border border-red-200' };
    case 'high': return { variant: 'warning' as const, bg: 'bg-amber-100 text-amber-700 border border-amber-200' };
    default: return { variant: 'info' as const, bg: 'bg-blue-100 text-blue-700 border border-blue-200' };
  }
}