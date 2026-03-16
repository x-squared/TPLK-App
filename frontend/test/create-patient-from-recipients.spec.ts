/// <reference types="node" />

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));

const outputFile = process.env.TPL_CREATED_PATIENT_FILE
  ? path.resolve(process.env.TPL_CREATED_PATIENT_FILE)
  : path.resolve(thisDir, '../../qa/reports/created-patient.json');

test('create patient from recipients view', async ({ page }) => {
  const loginExtId = process.env.TPL_SPEC_LOGIN_EXT_ID ?? 'TKOORD';
  const openRecipientsView = (process.env.TPL_SPEC_OPEN_RECIPIENTS_VIEW ?? '1') !== '0';
  const pidPrefix = process.env.TPL_SPEC_PID_PREFIX ?? 'AUTO';
  const pid = `${pidPrefix}-${Date.now()}`;
  const firstName = process.env.TPL_SPEC_FIRST_NAME ?? 'Spec';
  const name = process.env.TPL_SPEC_NAME ?? 'Patient';
  const birthDate = process.env.TPL_SPEC_DATE_OF_BIRTH ?? '1990-01-01';

  await page.goto('/');

  const loginInput = page.getByPlaceholder('Enter your User ID (e.g. TKOORD)');
  if (await loginInput.isVisible().catch(() => false)) {
    await loginInput.fill(loginExtId);
    await page.getByRole('button', { name: 'Log in' }).click();
  }

  if (openRecipientsView) {
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
  }
  await page.getByRole('button', { name: '+ Add Patient' }).click();

  await page.getByPlaceholder('PID *').fill(pid);
  await page.getByPlaceholder('First name *').fill(firstName);
  await page.getByRole('textbox', { name: 'Name *', exact: true }).fill(name);
  await page.locator('.patients-add-form input[type="date"]').fill(birthDate);
  await page.getByRole('button', { name: 'Save' }).click();

  const patientTable = page.getByRole('table').filter({ hasText: 'PID' }).filter({ hasText: 'First Name' });
  await expect(patientTable).toContainText(pid);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ pid, first_name: firstName, name, date_of_birth: birthDate }, null, 2),
    'utf-8',
  );
});
