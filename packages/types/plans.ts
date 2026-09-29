// @paic/types/plans - Planes de suscripción PAIC

export interface PAICPlan {
  name: string;
  minUnits: number;
  maxUnits: number;
  monthlyPrice: number;
  annualPrice: number;
  monthlyLink?: string;
  annualLink?: string;
  whatsapp?: string;
  popular?: boolean;
}

export const PLANS: PAICPlan[] = [
  {
    name: 'Torre',
    minUnits: 1,
    maxUnits: 50,
    monthlyPrice: 100000,
    annualPrice: 1020000,
    monthlyLink: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=5e037bc3e10e463ba7224cdcd44d3ad3',
    annualLink: 'https://mpago.la/14W5giX',
  },
  {
    name: 'Edificio',
    minUnits: 51,
    maxUnits: 120,
    monthlyPrice: 160000,
    annualPrice: 1632000,
    monthlyLink: 'https://mpago.la/12egePm',
    annualLink: 'https://mpago.la/1Y6fA8p',
  },
  {
    name: 'Copropiedad',
    minUnits: 121,
    maxUnits: 300,
    monthlyPrice: 280000,
    annualPrice: 2856000,
    monthlyLink: 'https://mpago.la/2XfeqEQ',
    annualLink: 'https://mpago.la/1YcQWGH',
    popular: true,
  },
  {
    name: 'Megaproyecto',
    minUnits: 301,
    maxUnits: 600,
    monthlyPrice: 450000,
    annualPrice: 4590000,
    monthlyLink: 'https://mpago.la/21DuR7Z',
    annualLink: 'https://mpago.la/2sfnFHz',
  },
  {
    name: 'Condominio',
    minUnits: 601,
    maxUnits: 1200,
    monthlyPrice: 750000,
    annualPrice: 7650000,
    monthlyLink: 'https://mpago.la/2uXRCUP',
    annualLink: 'https://mpago.la/2sJf9y1',
  },
  {
    name: 'Complejo',
    minUnits: 1201,
    maxUnits: 2500,
    monthlyPrice: 1200000,
    annualPrice: 12240000,
    monthlyLink: 'https://mpago.la/1f6mcWr',
    annualLink: 'https://mpago.la/237s6gd',
  },
];

export const formatCOP = (value: number): string =>
  '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export const getPlanCapacityText = (plan: PAICPlan): string => {
  return 'Diseñado para copropiedades de ' + plan.minUnits + ' a ' + plan.maxUnits + ' unidades';
};

export const getMonthlyEquivalent = (annualPrice: number): number =>
  Math.round(annualPrice / 12);

export const findPlanByName = (name?: string): PAICPlan | undefined =>
  PLANS.find(p => p.name === name);

export const findPlanByUnits = (units: number): PAICPlan | undefined => {
  if (!Number.isInteger(units) || units < 1) return undefined;
  return PLANS.find(plan => units >= plan.minUnits && units <= plan.maxUnits);
};