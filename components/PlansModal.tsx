import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { PLANS, PAICPlan, formatCOP, getPlanCapacityText, getMonthlyEquivalent } from '../services/plans';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface PendingPlan {
  name: string;
  billing: 'monthly' | 'annual';
  price: number;
}

export const PENDING_PLAN_KEY = 'paic_pending_plan';

export const savePendingPlan = (plan: PendingPlan) => {
  localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(plan));
};

export const getPendingPlan = (): PendingPlan | null => {
  try {
    const raw = localStorage.getItem(PENDING_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingPlan = () => {
  localStorage.removeItem(PENDING_PLAN_KEY);
};

const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<PAICPlan | null>(null);

  if (!isOpen) return null;

  const handlePay = (plan: PAICPlan, billing: 'monthly' | 'annual') => {
    const link = billing === 'monthly' ? plan.monthlyLink : plan.annualLink;
    if (!link || plan.monthlyPrice === null || plan.annualPrice === null) return;
    savePendingPlan({ name: plan.name, billing, price: billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice });
    window.location.href = link;
  };

  const handleWhatsApp = (plan: PAICPlan) => {
    if (!plan.whatsapp) return;
    const message = encodeURIComponent('Hola, quiero cotizar el Plan Corporativo de PAIC para mi copropiedad.');
    window.open(`https://wa.me/${plan.whatsapp}?text=${message}`, '_blank');
  };

  const isCurrentPlan = (plan: PAICPlan): boolean => selectedPlan?.name === plan.name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 md:w-4/5 lg:w-[880px] relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
            <Icon name="x" className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Elige tu plan</h2>
          <p className="text-sm text-gray-500 mt-1">Todos los planes incluyen acceso a todos los módulos de PAIC. La única diferencia es la cantidad de unidades a administrar.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                onClick={() => setSelectedPlan(plan)}
                className={`relative rounded-xl border-2 p-4 flex flex-col transition-all cursor-pointer ${
                  isCurrentPlan(plan)
                    ? 'border-blue-500 shadow-lg bg-blue-50/50'
                    : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    MÁS POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {plan.popular ? (
                    <span className="text-lg">🏢🏢</span>
                  ) : plan.name === 'Megaproyecto' ? (
                    <span className="text-lg">🏙️</span>
                  ) : plan.name === 'Corporativo' ? (
                    <span className="text-lg">🏗️</span>
                  ) : (
                    <span className="text-lg">🏢</span>
                  )}
                  <h3 className="font-bold text-gray-800">{plan.name}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3 min-h-[30px]">{getPlanCapacityText(plan)}</p>

                {plan.monthlyPrice !== null && plan.annualPrice !== null ? (
                  <>
                    <div className="space-y-2 mt-auto">
                      <button
                        onClick={() => handlePay(plan, 'monthly')}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        {formatCOP(plan.monthlyPrice)} / mes
                      </button>
                      <button
                        onClick={() => handlePay(plan, 'annual')}
                        className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        {formatCOP(plan.annualPrice)} / año
                      </button>
                      <p className="text-[11px] text-green-700 font-medium text-center">
                        Equivale a {formatCOP(getMonthlyEquivalent(plan.annualPrice))}/mes — Ahorras 15%
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-auto space-y-2">
                    <p className="text-xs text-gray-600 font-semibold text-center py-1">
                      Cotización a la medida con descuento
                    </p>
                    <button
                      onClick={() => handleWhatsApp(plan)}
                      className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Cotizar por WhatsApp
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Al hacer clic en un plan serás redirigido a Mercado Pago para completar el pago de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlansModal;
