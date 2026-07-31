import { test, expect } from '@playwright/test';

test.describe('CareerOS UI — smoke', () => {
  test('login page renders the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'CareerOS' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('invalid credentials surface an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('nobody@example.com');
    await page.getByPlaceholder('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText(/invalid credentials|erreur/i)).toBeVisible({ timeout: 10000 });
  });
});
