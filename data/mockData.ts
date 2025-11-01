// FIX: Populate this file with mock data and export it to resolve module import errors.
// This file was empty, causing "is not a module" errors in components that tried to import from it.

export const monthlyCollectionData: { name: string; value: number }[] = [
  { name: 'Ene', value: 28000000 },
  { name: 'Feb', value: 25000000 },
  { name: 'Mar', value: 32000000 },
  { name: 'Abr', value: 30000000 },
  { name: 'May', value: 35000000 },
  { name: 'Jun', value: 33000000 },
];

export const pendingPaymentsData: { name: string; value: number; fill: string }[] = [
  { name: 'Vigilancia', value: 8000000, fill: '#ef4444' },
  { name: 'Aseo', value: 4500000, fill: '#f97316' },
  { name: 'Mantenimiento Ascensor', value: 1200000, fill: '#eab308' },
  { name: 'Servicios Públicos', value: 3500000, fill: '#8b5cf6' },
];

export const monthlyBudget = 25000000;
