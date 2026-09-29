import { describe, expect, it } from 'vitest';
import { PLANS, findPlanByUnits, getMonthlyEquivalent } from '../plans';

describe('PAIC plans', () => {
  it('assigns every supported boundary to the correct plan', () => {
    expect(findPlanByUnits(1)?.name).toBe('Torre');
    expect(findPlanByUnits(50)?.name).toBe('Torre');
    expect(findPlanByUnits(51)?.name).toBe('Edificio');
    expect(findPlanByUnits(120)?.name).toBe('Edificio');
    expect(findPlanByUnits(121)?.name).toBe('Copropiedad');
    expect(findPlanByUnits(300)?.name).toBe('Copropiedad');
    expect(findPlanByUnits(301)?.name).toBe('Megaproyecto');
    expect(findPlanByUnits(600)?.name).toBe('Megaproyecto');
    expect(findPlanByUnits(601)?.name).toBe('Condominio');
    expect(findPlanByUnits(1200)?.name).toBe('Condominio');
    expect(findPlanByUnits(1201)?.name).toBe('Complejo');
    expect(findPlanByUnits(2500)?.name).toBe('Complejo');
  });

  it('rejects quantities outside the supported range', () => {
    expect(findPlanByUnits(0)).toBeUndefined();
    expect(findPlanByUnits(-1)).toBeUndefined();
    expect(findPlanByUnits(2501)).toBeUndefined();
    expect(findPlanByUnits(50.5)).toBeUndefined();
  });

  it('keeps the annual prices at a 15 percent discount', () => {
    for (const plan of PLANS) {
      expect(getMonthlyEquivalent(plan.annualPrice)).toBe(plan.monthlyPrice * 0.85);
    }
  });
});
