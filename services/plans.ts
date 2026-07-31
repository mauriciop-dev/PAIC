export interface PAICPlan {
  name: string;
  minUnits: number | null;
  maxUnits: number | null;
  monthlyPrice: number | null;
  annualPrice: number | null;
  monthlyLink?: string;
  annualLink?: string;
  whatsapp?: string;
  popular?: boolean;
}

export const PLANS: PAICPlan[] = [
  {
    name: 'Edificio',
    minUnits: 1,
    maxUnits: 80,
    monthlyPrice: 130000,
    annualPrice: 1326000,
    monthlyLink: 'https://mpago.la/21DuR7Z',
    annualLink: 'https://mpago.la/1YcQWGH',
  },
  {
    name: 'Copropiedad',
    minUnits: 81,
    maxUnits: 250,
    monthlyPrice: 240000,
    annualPrice: 2448000,
    monthlyLink: 'https://mpago.la/2XfeqEQ',
    annualLink: 'https://mpago.la/1Y6fA8p',
    popular: true,
  },
  {
    name: 'Megaproyecto',
    minUnits: 251,
    maxUnits: 550,
    monthlyPrice: 380000,
    annualPrice: 3876000,
    monthlyLink: 'https://mpago.la/12egePm',
    annualLink: 'https://mpago.la/14W5giX',
  },
  {
    name: 'Corporativo',
    minUnits: 551,
    maxUnits: null,
    monthlyPrice: null,
    annualPrice: null,
    whatsapp: '573043509444',
  },
];

export const formatCOP = (value: number): string =>
  '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export const getPlanCapacityText = (plan: PAICPlan): string => {
  if (plan.maxUnits === null) {
    return 'Más de ' + plan.minUnits + ' unidades';
  }
  return 'Diseñado para copropiedades de ' + plan.minUnits + ' a ' + plan.maxUnits + ' unidades';
};

export const getMonthlyEquivalent = (annualPrice: number): number =>
  Math.round(annualPrice / 12);

export const findPlanByName = (name?: string): PAICPlan | undefined =>
  PLANS.find(p => p.name === name);
