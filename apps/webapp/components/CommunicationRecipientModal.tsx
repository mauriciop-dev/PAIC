import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@paic/ui';
import { supabase } from '../services/supabaseClient';

export type CommunicationAudience = 'manual' | 'all_residents' | 'debtors';

export interface CommunicationRecipient {
  apartment: string;
  name: string;
  email: string | null;
  isDebtor: boolean;
  hasPwa: boolean;
}

export interface RecipientSelection {
  audience: CommunicationAudience;
  apartments: string[];
  emails: string[];
  emailsByApartment: Record<string, string | null>;
}

interface CommunicationRecipientModalProps {
  conjuntoId: string;
  open: boolean;
  initialSelection?: RecipientSelection;
  onClose: () => void;
  onConfirm: (selection: RecipientSelection) => void;
}

export default function CommunicationRecipientModal({
  conjuntoId,
  open,
  initialSelection,
  onClose,
  onConfirm,
}: CommunicationRecipientModalProps) {
  const [recipients, setRecipients] = useState<CommunicationRecipient[]>([]);
  const [audience, setAudience] = useState<CommunicationAudience>(initialSelection?.audience || 'manual');
  const [selectedApartments, setSelectedApartments] = useState<string[]>(initialSelection?.apartments || []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAudience(initialSelection?.audience || 'manual');
    setSelectedApartments(initialSelection?.apartments || []);
    setSearch('');
    setError(null);
    setLoading(true);
    void Promise.all([
      supabase.from('residents').select('apartment,name,email').eq('conjunto_id', conjuntoId).order('apartment'),
      supabase.from('account_status').select('apartment,outstanding_balance').eq('conjunto_id', conjuntoId),
      supabase.from('pwa_memberships').select('apartment').eq('conjunto_id', conjuntoId).eq('status', 'activo'),
    ]).then(([residentResult, accountResult, membershipResult]) => {
      if (residentResult.error) throw residentResult.error;
      if (accountResult.error) throw accountResult.error;
      if (membershipResult.error) throw membershipResult.error;
      const debts = new Set((accountResult.data || []).filter(row => Number(row.outstanding_balance || 0) > 0).map(row => row.apartment));
      const pwaApartments = new Set((membershipResult.data || []).map(row => row.apartment));
      setRecipients((residentResult.data || []).map(row => ({
        apartment: row.apartment,
        name: row.name,
        email: row.email || null,
        isDebtor: debts.has(row.apartment),
        hasPwa: pwaApartments.has(row.apartment),
      })));
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los destinatarios.');
    }).finally(() => setLoading(false));
  }, [conjuntoId, initialSelection, open]);

  const visibleRecipients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return recipients.filter(row => !normalizedSearch || [row.apartment, row.name, row.email || ''].some(value => value.toLowerCase().includes(normalizedSearch)));
  }, [recipients, search]);

  const matchingAudience = audience === 'all_residents'
    ? recipients.map(row => row.apartment)
    : audience === 'debtors'
      ? recipients.filter(row => row.isDebtor).map(row => row.apartment)
      : selectedApartments;

  const toggleApartment = (apartment: string) => {
    setAudience('manual');
    setSelectedApartments(current => current.includes(apartment) ? current.filter(value => value !== apartment) : [...current, apartment]);
  };

  const confirm = () => {
    const selected = new Set(matchingAudience);
    const emails = recipients.filter(row => selected.has(row.apartment) && row.email).map(row => row.email as string);
    if (!matchingAudience.length) {
      setError('Selecciona al menos un destinatario.');
      return;
    }
    onConfirm({
      audience,
      apartments: matchingAudience,
      emails: [...new Set(emails)],
      emailsByApartment: Object.fromEntries(recipients.filter(row => selected.has(row.apartment)).map(row => [row.apartment, row.email])),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="recipient-modal-title" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-5">
          <div>
            <h2 id="recipient-modal-title" className="text-xl font-semibold text-gray-900">Seleccionar destinatarios</h2>
            <p className="mt-1 text-sm text-gray-500">Elige una categoría o apartamentos específicos.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-gray-900"><Icon name="x" className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {([['all_residents', 'Todos los residentes'], ['debtors', 'Residentes en mora'], ['manual', 'Apartamentos']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setAudience(value)} className={`rounded border px-3 py-2 text-left text-sm ${audience === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                {label}
                <span className="mt-1 block text-xs text-gray-500">{value === 'all_residents' ? recipients.length : value === 'debtors' ? recipients.filter(row => row.isDebtor).length : selectedApartments.length} unidades</span>
              </button>
            ))}
          </div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar apartamento, nombre o correo" className="w-full rounded border border-gray-300 p-2 text-sm" />
          {loading && <p className="text-sm text-gray-500">Cargando unidades...</p>}
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!loading && <div className="space-y-1 rounded border border-gray-200 p-2">
            {visibleRecipients.map(row => {
              const checked = matchingAudience.includes(row.apartment);
              return <label key={row.apartment} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50">
                <input type="checkbox" checked={checked} onChange={() => toggleApartment(row.apartment)} className="h-4 w-4" />
                <span className="min-w-0 flex-1"><strong>{row.apartment}</strong> · {row.name}<span className="block truncate text-xs text-gray-500">{row.email || 'Sin correo'}{row.isDebtor ? ' · En mora' : ''}{row.hasPwa ? ' · PWA activa' : ''}</span></span>
              </label>;
            })}
            {!visibleRecipients.length && <p className="p-3 text-sm text-gray-500">No hay unidades que coincidan con la búsqueda.</p>}
          </div>}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 p-5">
          <p className="text-sm text-gray-600">{matchingAudience.length} unidad(es) seleccionada(s) · {recipients.filter(row => matchingAudience.includes(row.apartment) && row.email).length} correo(s)</p>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-white">Cancelar</button><button type="button" onClick={confirm} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Confirmar selección</button></div>
        </footer>
      </div>
    </div>
  );
}
