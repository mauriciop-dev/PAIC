import { Page, Locator, expect } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleLoginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.googleLoginButton = page.locator('button:has-text("Continuar con Google")');
    this.errorMessage = page.locator('[role="alert"], .bg-red-50, .bg-amber-50');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async loginWithGoogle() {
    await this.googleLoginButton.click();
    // Note: Google OAuth will redirect - handle in test setup
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}

export class AdminDashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly header: Locator;
  readonly statsCards: Locator;
  readonly alertsSection: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside[class*="w-64"], aside[class*="w-20"]');
    this.header = page.locator('header');
    this.statsCards = page.locator('main >> text=/Conjuntos Totales|Activos|En Prueba|Usuarios Totales|Activos Hoy|MRR/');
    this.alertsSection = page.locator('main >> text=Alertas Activas').locator('..');
    this.quickActions = page.locator('main >> text=Acciones Rápidas').locator('..');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.sidebar).toBeVisible();
  }

  async navigateTo(tab: string) {
    const link = this.sidebar.locator(`a:has-text("${tab}"), button:has-text("${tab}")`).first();
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectStatsVisible() {
    await expect(this.statsCards.first()).toBeVisible();
  }

  async getStatValue(label: string): Promise<string> {
    const card = this.page.locator(`main >> text=${label}`).locator('..');
    const value = card.locator('text=/\\$?[\\d,.]+[MK]?/').first();
    return await value.textContent() || '';
  }
}

export class AdminLayoutPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly sidebarToggle: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly collapsedSidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside[class*="w-64"]');
    this.sidebarToggle = page.locator('button[aria-label*="Colapsar"], button[aria-label*="Expandir"]');
    this.userMenu = page.locator('button[aria-label="Menú de usuario"]');
    this.logoutButton = page.locator('button:has-text("Cerrar Sesión")');
    this.collapsedSidebar = page.locator('aside[class*="w-20"]');
  }

  async toggleSidebar() {
    await this.sidebarToggle.click();
    await this.page.waitForTimeout(300);
  }

  async expectSidebarVisible() {
    await expect(this.sidebar).toBeVisible();
  }

  async expectSidebarCollapsed() {
    await expect(this.collapsedSidebar).toBeVisible();
  }

  async openUserMenu() {
    await this.userMenu.click();
    await this.page.waitForTimeout(200);
  }

  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}

export class AgentesPage {
  readonly page: Page;
  readonly agentCards: Locator;
  readonly activeAgent: Locator;
  readonly informesList: Locator;
  readonly searchInput: Locator;
  readonly severityFilter: Locator;
  readonly statusFilter: Locator;
  readonly autoRefreshSwitch: Locator;
  readonly accionesPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentCards = page.locator('main >> .grid.grid-cols-2.lg\\:grid-cols-4 >> .rounded-xl');
    this.activeAgent = page.locator('main >> .grid.grid-cols-2.lg\\:grid-cols-4 >> .ring-2');
    this.informesList = page.locator('main >> .divide-y.divide-gray-100');
    this.searchInput = page.locator('input[placeholder="Buscar en informes..."]');
    this.severityFilter = page.locator('select').first();
    this.statusFilter = page.locator('select').nth(1);
    this.autoRefreshSwitch = page.locator('input[type="checkbox"]').first();
    this.accionesPanel = page.locator('main >> text=Acciones 1-Clic').locator('..');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.agentCards.first()).toBeVisible();
  }

  async selectAgent(agentName: string) {
    const card = this.agentCards.filter({ hasText: agentName });
    await card.click();
    await this.page.waitForTimeout(300);
  }

  async searchInformes(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  async filterBySeverity(severity: string) {
    await this.severityFilter.selectOption(severity);
    await this.page.waitForTimeout(300);
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(300);
  }

  async toggleAutoRefresh() {
    await this.autoRefreshSwitch.click();
  }

  async executeActionOnInforme(actionName: string, informeTitle: string) {
    const informeRow = this.informesList.locator('div', { hasText: informeTitle }).first();
    const button = informeRow.locator(`button:has-text("${actionName}"), button:has-text("Ejecutar Ya"), button:has-text("Aprobar")`).first();
    await button.click();
  }

  async openChatWithAgent(agentName: string) {
    const card = this.agentCards.filter({ hasText: agentName });
    const chatButton = card.locator('button:has-text("Chat")');
    await chatButton.click();
  }

  async expectInformeVisible(title: string) {
    await expect(this.informesList.locator('div', { hasText: title }).first()).toBeVisible();
  }

  async expectActionButtonEnabled(actionName: string) {
    const button = this.accionesPanel.locator(`button:has-text("${actionName}")`).first();
    await expect(button).toBeEnabled();
  }
}

export class ConfiguracionPage {
  readonly page: Page;
  readonly sections: Locator;
  readonly dangerZone: Locator;
  readonly pushNotificationsSwitch: Locator;
  readonly pushLoadingSpinner: Locator;
  readonly dangerActions: Locator;
  readonly dangerModal: Locator;
  readonly confirmPasswordInput: Locator;
  readonly confirmTextInput: Locator;
  readonly confirmDangerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sections = page.locator('main >> .space-y-6 >> .rounded-xl');
    this.dangerZone = page.locator('main >> text=Zona de Peligro').locator('..');
    this.pushNotificationsSwitch = page.locator('main >> text=Notificaciones Push').locator('..').locator('input[type="checkbox"]').first();
    this.pushLoadingSpinner = page.locator('main >> text=Notificaciones Push').locator('..').locator('.animate-spin');
    this.dangerActions = page.locator('main >> .grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3 >> .rounded-xl');
    this.dangerModal = page.locator('[role="dialog"]:has-text("Confirmar Acción Peligrosa")');
    this.confirmPasswordInput = page.locator('input[type="password"]').first();
    this.confirmTextInput = page.locator('input[placeholder*="ELIMINAR"], input[placeholder*="SUSPENDER"], input[placeholder*="REVOCAR"], input[placeholder*="RESETEAR"]').first();
    this.confirmDangerButton = page.locator('[role="dialog"] >> button:has-text("ELIMINAR"), [role="dialog"] >> button:has-text("SUSPENDER"), [role="dialog"] >> button:has-text("REVOCAR"), [role="dialog"] >> button:has-text("RESETEAR")').first();
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.sections.first()).toBeVisible();
  }

  async scrollToPushNotifications() {
    await this.page.locator('text=Notificaciones Push').scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
  }

  async togglePushNotifications() {
    await this.pushNotificationsSwitch.click();
    if (await this.pushLoadingSpinner.isVisible()) {
      await this.page.waitForTimeout(2000);
    }
  }

  async expectPushEnabled(enabled: boolean) {
    if (enabled) {
      await expect(this.pushNotificationsSwitch).toBeChecked();
    } else {
      await expect(this.pushNotificationsSwitch).not.toBeChecked();
    }
  }

  async scrollToDangerZone() {
    await this.page.locator('text=Zona de Peligro').scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
  }

  async clickDangerAction(actionName: string) {
    const action = this.dangerActions.filter({ hasText: actionName }).first();
    await action.locator('button:has-text("Ejecutar")').click();
    await this.page.waitForTimeout(300);
  }

  async fillDangerModal(confirmText: string, password: string) {
    await expect(this.dangerModal).toBeVisible();
    await this.confirmTextInput.fill(confirmText);
    await this.confirmPasswordInput.fill(password);
  }

  async confirmDangerAction() {
    await this.confirmDangerButton.click();
    await this.page.waitForTimeout(2000);
  }

  async expectDangerModalClosed() {
    await expect(this.dangerModal).not.toBeVisible();
  }
}

export class ConjuntosPage {
  readonly page: Page;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly planFilter: Locator;
  readonly estadoFilter: Locator;
  readonly pagination: Locator;
  readonly newButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('table');
    this.searchInput = page.locator('input[placeholder*="Buscar"]');
    this.planFilter = page.locator('select').first();
    this.estadoFilter = page.locator('select').nth(1);
    this.pagination = page.locator('nav[aria-label="pagination"], .flex.items-center.justify-between').last();
    this.newButton = page.locator('button:has-text("Nuevo Conjunto")');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.table).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async filterByPlan(plan: string) {
    await this.planFilter.selectOption(plan);
    await this.page.waitForTimeout(500);
  }

  async filterByEstado(estado: string) {
    await this.estadoFilter.selectOption(estado);
    await this.page.waitForTimeout(500);
  }

  async goToPage(pageNum: number) {
    const button = this.pagination.locator(`button:has-text("${pageNum}")`);
    if (await button.isVisible()) {
      await button.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickNewConjunto() {
    await this.newButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount(): Promise<number> {
    return await this.table.locator('tbody tr').count();
  }

  async expectRowVisible(conjuntoName: string) {
    await expect(this.table.locator('tr', { hasText: conjuntoName }).first()).toBeVisible();
  }
}

// Test helpers
export async function loginAsSuperAdmin(page: Page, email: string, password: string) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await loginPage.expectRedirectToDashboard();
}

export async function loginAsRegularUser(page: Page, email: string, password: string) {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  // Should redirect to dashboard but with limited access
}

export async function waitForToast(page: Page, message: string) {
  const toast = page.locator('[role="alert"], .fixed.bottom-4').filter({ hasText: message });
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}