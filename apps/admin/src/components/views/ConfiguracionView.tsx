import React, { useState } from 'react';
import { Card, Input, Select, Badge, Button, Switch } from '@paic/ui';
import { Icon } from '@paic/ui';

export function ConfiguracionView() {
  const [stripeKey, setStripeKey] = useState('sk_live_************************');
  const [mpKey, setMpKey] = useState('APP_USR-************************');
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [fromEmail, setFromEmail] = useState('noreply@paicai.com.co');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState('10');

  const sections = [
    {
      title: 'Pagos - Stripe',
      icon: 'credit-card',
      fields: [
        { label: 'Clave Secreta (Secret Key)', type: 'password', value: stripeKey, onChange: setStripeKey, placeholder: 'sk_live_...' },
        { label: 'Clave Publicable (Publishable Key)', type: 'text', value: 'pk_live_************************', onChange: () => {}, placeholder: 'pk_live_...' },
        { label: 'Webhook Secret', type: 'password', value: 'whsec_************************', onChange: () => {}, placeholder: 'whsec_...' },
      ]
    },
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
          onChange: setMaintenanceMode,
          description: 'Deshabilita el acceso a todos los usuarios excepto superadmins'
        },
        { 
          label: 'Permitir Registro Público', 
          type: 'switch', 
          value: allowRegistration, 
          onChange: setAllowRegistration,
          description: 'Permite que nuevos conjuntos se registren por su cuenta'
        },
        { label: 'Tamaño Máx. Archivos (MB)', type: 'number', value: maxFileSize, onChange: setMaxFileSize, placeholder: '10' },
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
  ];

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

      <Card className="p-5 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <Icon name="alert-triangle" className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Zona de Peligro</h3>
            <p className="text-sm text-red-600 mt-1">Acciones irreversibles que afectan a toda la plataforma</p>
            <div className="flex gap-3 mt-4">
              <Button variant="danger" className="flex items-center gap-2">
                <Icon name="trash-2" className="w-4 h-4" /> Eliminar Conjunto
              </Button>
              <Button variant="danger" className="flex items-center gap-2">
                <Icon name="user-x" className="w-4 h-4" /> Suspender Usuario
              </Button>
              <Button variant="ghost" className="text-red-600 hover:bg-red-100">
                Ver Auditoría
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}