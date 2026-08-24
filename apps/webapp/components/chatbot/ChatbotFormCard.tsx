import React, { useState, useEffect } from 'react';
import type { FormSpec } from './chatbotMenu';
import type { RecordOption } from './chatbotMenu';
import { loadOptionsForKey } from '../../utils/chatActions';

interface ChatbotFormCardProps {
  form: FormSpec;
  conjuntoId: string;
  onSubmit: (values: Record<string, any>, record?: RecordOption) => Promise<void>;
  onCancel: () => void;
}

const inputClasses =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const ChatbotFormCard: React.FC<ChatbotFormCardProps> = ({ form, conjuntoId, onSubmit, onCancel }) => {
  const [recordOptions, setRecordOptions] = useState<RecordOption[]>([]);
  const [fieldOptions, setFieldOptions] = useState<Record<string, RecordOption[]>>({});
  const [selectedRecordValue, setSelectedRecordValue] = useState('');
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecord = recordOptions.find(r => String(r.value) === String(selectedRecordValue));

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (form.loadKey) {
        const options = await loadOptionsForKey(conjuntoId, form.loadKey);
        if (active) setRecordOptions(options);
      }
      const dynamicFields = form.fields.filter(f => f.type === 'select' && f.loadKey);
      for (const f of dynamicFields) {
        const options = await loadOptionsForKey(conjuntoId, f.loadKey!);
        if (active) setFieldOptions(prev => ({ ...prev, [f.name]: options }));
      }
    };
    load();
    return () => { active = false; };
  }, [form, conjuntoId]);

  const handleRecordChange = (value: string) => {
    setSelectedRecordValue(value);
    const record = recordOptions.find(r => String(r.value) === String(value))?.record;
    if (record && form.action === 'edit') {
      const prefilled: Record<string, any> = {};
      form.fields.forEach(f => {
        if (record[f.name] !== undefined && !f.loadKey) prefilled[f.name] = record[f.name];
      });
      setValues(prefilled);
    }
  };

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    for (const f of form.fields) {
      if (f.required && (values[f.name] === undefined || String(values[f.name]).trim() === '')) {
        setError(`El campo "${f.label}" es obligatorio.`);
        return;
      }
    }
    if (form.action !== 'add' && !selectedRecord) {
      setError('Selecciona un registro.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(values, selectedRecord);
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción.');
    } finally {
      setSubmitting(false);
    }
  };

  const showRecordSelector = form.action === 'edit' || form.action === 'delete' || (form.action === 'add' && form.loadKey === 'areas');

  return (
    <div className="ml-10 mt-2 max-w-md">
      <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-md p-4 space-y-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-800">{form.title}</p>

        {showRecordSelector && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {form.action === 'delete' ? 'Registro a eliminar' : 'Selecciona un registro'}
            </label>
            <select
              data-testid="form-record-select"
              value={selectedRecordValue}
              onChange={e => handleRecordChange(e.target.value)}
              className={inputClasses}
            >
              <option value="">Seleccionar...</option>
              {recordOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {form.fields.map(f => {
          if (f.type === 'select') {
            const options = f.loadKey
              ? fieldOptions[f.name]?.map(o => ({ value: o.value, label: o.label }))
              : f.options?.map(o => ({ value: o, label: o }));
            return (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                <select
                  data-testid={`form-field-${f.name}`}
                  value={values[f.name] ?? ''}
                  onChange={e => setValue(f.name, e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Seleccionar...</option>
                  {(options || []).map((o, i) => (
                    <option key={`${o.value}-${i}`} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.type === 'textarea') {
            return (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                <textarea
                  data-testid={`form-field-${f.name}`}
                  value={values[f.name] ?? ''}
                  onChange={e => setValue(f.name, e.target.value)}
                  rows={3}
                  className={inputClasses}
                />
              </div>
            );
          }
          return (
            <div key={f.name}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
              <input
                data-testid={`form-field-${f.name}`}
                type={f.type}
                value={values[f.name] ?? ''}
                onChange={e => setValue(f.name, e.target.value)}
                className={inputClasses}
              />
            </div>
          );
        })}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            data-testid="form-submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Guardando...' : form.action === 'delete' ? 'Eliminar' : 'Guardar'}
          </button>
          <button
            data-testid="form-cancel"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotFormCard;
