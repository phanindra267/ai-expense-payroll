import { test, expect } from '@playwright/test';

test.describe('FinAI Enterprise Full E2E Flow', () => {
  const testEmail = `test_${Date.now()}@e2e.com`;
  
  test('Complete user journey: Register -> Login -> Dashboard -> Add Expense -> Payroll', async ({ page }) => {
    // 1. Registration
    await page.goto('/register');
    await page.fill('#orgName', 'E2E Testing Corp');
    await page.fill('#reg-email', testEmail);
    await page.fill('#reg-password', 'StrongPass123!');
    await page.fill('#reg-confirm', 'StrongPass123!');
    await page.click('#register-btn');
    
    // Should navigate to dashboard automatically after registration
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.header-title')).toHaveText('Dashboard');

    // 2. Navigation to Expenses
    await page.click('text=Expenses');
    await expect(page).toHaveURL(/\/expenses/);

    // 3. Add an Expense
    await page.click('#add-expense-btn');
    // We wait for the modal to be visible
    await expect(page.locator('.modal')).toBeVisible();
    
    await page.fill('input[placeholder="e.g. Team lunch at The Grand"]', 'Business Dinner with Client');
    await page.fill('input[placeholder="0.00"]', '450.50');
    await page.fill('input[type="date"]', '2025-01-15');
    await page.fill('input[placeholder="Vendor name"]', 'Steakhouse');
    await page.selectOption('.form-select', 'Meals & Entertainment');
    
    await page.click('button:has-text("Add Expense")');
    // Ensure modal closes and toast appears (or modal disappears)
    await expect(page.locator('.modal')).not.toBeVisible();
    await expect(page.locator('text=Business Dinner with Client')).toBeVisible();

    // 4. Navigate to Payroll
    await page.click('text=Payroll');
    await expect(page).toHaveURL(/\/payroll/);
    
    // We might not have employees yet, but we verify the UI loads correctly
    await expect(page.locator('text=Approval Workflow')).toBeVisible();

    // 5. Navigate to AI Assistant
    await page.click('text=AI Assistant');
    await expect(page).toHaveURL(/\/ai/);
    await expect(page.locator('text=Acting as: 📊 Analyst')).toBeVisible();
    
    // Send a message
    await page.fill('#ai-chat-input', 'What is my total spending this month?');
    await page.click('#ai-send-btn');
    
    // Ensure thinking indicator appears
    await expect(page.locator('text=Thinking...')).toBeVisible();
    // Wait for it to disappear and a response to appear (we don't strictly verify content as it relies on Ollama in backend)
    await expect(page.locator('.chat-message.assistant').nth(1)).toBeVisible({ timeout: 15000 });
  });

  test('Login with existing user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'bad@email.com');
    await page.fill('#password', 'wrongpass');
    await page.click('#login-btn');
    
    // Toast error should appear
    await expect(page.locator('text=Login failed').or(page.locator('text=Invalid'))).toBeVisible();
  });
});
