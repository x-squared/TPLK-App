import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outputFile = process.env.TPL_CREATED_PATIENT_FILE
  ? path.resolve(process.env.TPL_CREATED_PATIENT_FILE)
  : path.resolve(__dirname, '../../qa/reports/created-patient.json');

test('create patient from recipients view', async ({ page }) => {
  const pid = `AUTO-${Date.now()}`;
  const firstName = 'Spec';
  const name = 'Patient';
  const birthDate = '1990-01-01';

  await page.goto('/');

  const loginInput = page.getByPlaceholder('Enter your User ID (e.g. TKOORD)');
  if (await loginInput.isVisible().catch(() => false)) {
    await loginInput.fill('TKOORD');
    await page.getByRole('button', { name: 'Log in' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
  await page.getByRole('button', { name: '+ Add Patient' }).click();

  await page.getByPlaceholder('PID *').fill(pid);
  await page.getByPlaceholder('First name *').fill(firstName);
  await page.getByPlaceholder('Name *').fill(name);
  await page.locator('.patients-add-form input[type="date"]').fill(birthDate);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('table.data-table')).toContainText(pid);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ pid, first_name: firstName, name, date_of_birth: birthDate }, null, 2),
    'utf-8',
  );
});
