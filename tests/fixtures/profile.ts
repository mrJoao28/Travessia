import {expect,type Page} from "@playwright/test";
import type {ApiResponse} from "../../apps/web/lib/api.generated";

export async function setup(page: Page, failSave = false) {
  const profile: ApiResponse<'profile'> = { id: 'ui-profile-person', name: 'Pessoa fictícia', email: 'profile-long-email-for-reflow@example.invalid',
    emailVerified: true, phone: null, alternateEmail: null,
    student: { registration: null, institution: 'UEA', unit: null, course: 'Computação', period: null },
    teacher: { teachings: [{ subject: 'Cálculo I', course: 'Computação' }] } };
  let updates = 0;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/me') return route.fulfill({ json: { id: profile.id, name: profile.name, email: profile.email, course: profile.student?.course, demo: true, preferences: {} } });
    if (path === '/api/v1/me/profile' && route.request().method() === 'GET') return route.fulfill({ json: profile });
    if (path === '/api/v1/me/profile' && route.request().method() === 'PATCH') {
      updates++;
      if (failSave) return route.fulfill({ status: 503, json: { code: 'UNAVAILABLE', message: 'Falha simulada.' } });
      return route.fulfill({ json: { ...profile, ...route.request().postDataJSON() } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/perfil');
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(profile.name);
  return () => updates;
}
