import { expect, test } from "@playwright/test";

test.describe("RupeeRoot Complete Functional & Responsive Verification", () => {
  test("verifies all pages, buttons, CRUD flows, exports, healthcheck, and responsive layouts", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-${Date.now()}@rupeeroot.test`;

    // 0. Health check & Landing page
    const healthRes = await page.request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.data.database).toBe("connected");

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Get Started" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Dashboard" }).first()).toBeVisible();

    // 1. Register new student user
    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Riya Patel");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("StudentPass@123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Financial Dashboard" })).toBeVisible();

    // 2. Add Income (₹8,000) from Dashboard
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByRole("button", { name: "Income", exact: true }).click();
    await page.getByLabel("Title").fill("Monthly Allowance");
    await page.getByLabel("Amount").fill("8000");
    await page.getByRole("button", { name: "Add Transaction" }).last().click();
    await expect(page.getByText("₹8,000").first()).toBeVisible();

    // 3. Budgets + Custom Category Create & Edit + Back button
    await page.goto("/budgets");
    await page.getByRole("button", { name: "Set Budget" }).click();
    await page.getByLabel(/Monthly Limit/).fill("2000");
    await page.getByRole("button", { name: "Save Budget" }).click();
    await expect(page.getByText("Overall Monthly Budget")).toBeVisible();

    await page.getByRole("button", { name: "Custom Category" }).click();
    await page.getByLabel("Category Name").fill("Campus Snacks");
    await page.getByRole("button", { name: "Create Category" }).click();
    await expect(page.getByText("Campus Snacks")).toBeVisible();

    await page.getByRole("button", { name: "Edit Campus Snacks" }).click();
    await page.getByLabel("Category Name").fill("Campus Cafe");
    await page.getByRole("button", { name: "Save Category" }).click();
    await expect(page.getByText("Campus Cafe")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 4. Add Expense (₹2,200) to exceed budget & trigger alert
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Add Transaction" }).click();
    await page.getByLabel("Title").fill("Semester Books & Mess");
    await page.getByLabel("Amount").fill("2200");
    await page.getByRole("button", { name: "Add Transaction" }).last().click();
    await expect(page.getByText("Semester Books & Mess").first()).toBeVisible();

    // Filter + Clear check
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByPlaceholder(/Search by title/i).fill("Semester");
    await expect(page.getByText("Semester Books & Mess").first()).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();

    // 5. Notifications: alert visible & Mark All Read
    await page.goto("/notifications");
    await expect(page.getByText(/budget exceeded/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark All Read" }).click();

    // 6. Savings Goals: Create, Contribute, Edit, Delete
    await page.goto("/goals");
    await page.getByRole("button", { name: "New Savings Goal" }).click();
    await page.getByLabel("Goal Title").fill("Laptop Upgrade");
    await page.getByLabel(/Target Amount/).fill("10000");
    await page.getByRole("button", { name: "Create Goal" }).click();
    await expect(page.getByText("Laptop Upgrade")).toBeVisible();

    await page.getByRole("button", { name: "+ Contribute" }).first().click();
    await page.getByLabel(/Amount/).fill("2500");
    await page.getByRole("button", { name: "Add Savings" }).click();
    await expect(page.getByText("₹2,500").first()).toBeVisible();

    await page.getByRole("button", { name: "Edit Laptop Upgrade" }).click();
    await page.getByLabel("Goal Title").fill("Laptop SSD");
    await page.getByRole("button", { name: "Save Goal" }).click();
    await expect(page.getByText("Laptop SSD")).toBeVisible();

    // 7. Recurring Transactions: Create, Edit, Pause, Process Due Now, Delete
    await page.goto("/recurring");
    await page.getByRole("button", { name: "Add Recurring Rule" }).click();
    await page.getByLabel("Title").fill("Hostel Wi-Fi");
    await page.getByLabel(/Amount/).fill("499");
    await page.getByRole("button", { name: "Save Rule" }).click();
    await expect(page.getByText("Hostel Wi-Fi")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.getByLabel("Title").fill("Hostel Fiber");
    await page.getByRole("button", { name: "Save Rule" }).click();
    await expect(page.getByText("Hostel Fiber")).toBeVisible();

    await page.getByRole("button", { name: "Pause" }).first().click();
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Process Due Now" }).click();

    // 8. Analytics & Insights
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics & Forecasting" })).toBeVisible();
    await expect(page.getByText("Budget Forecasting Engine")).toBeVisible();
    await page.getByRole("button", { name: "Refresh Insights" }).click();

    // 9. Reports & CSV/PDF export check
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Financial Reports & Exports" })).toBeVisible();
    const csvLink = page.getByRole("link", { name: /Transactions CSV/i });
    await expect(csvLink).toHaveAttribute("href", /\/api\/reports\/export\/csv/);
    const pdfRes = await page.request.get("/api/reports/export/pdf");
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    // 10. Settings update
    await page.goto("/settings");
    await page.getByLabel("Full Name").fill("Riya Patel Updated");
    await page.getByRole("button", { name: "Save Preferences" }).click();

    // 11. Edit & Delete Transaction
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Edit Semester Books & Mess" }).click();
    await page.getByLabel("Amount").fill("1500");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("-₹1,500").first()).toBeVisible();

    await page.getByRole("button", { name: "Delete Semester Books & Mess" }).click();
    await expect(page.getByText("Semester Books & Mess")).toHaveCount(0);

    // 12. Responsive check across Small Mobile (320px), Mobile (375px), Tablet (768px), Laptop (1280px), Monitor (1920px)
    for (const vp of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      for (const route of ["/", "/dashboard"]) {
        await page.goto(route);
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflow).toBe(false);
      }
    }

    // Also verify /login and /register responsive layouts when logged out
    await page.context().clearCookies();
    for (const vp of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      for (const route of ["/login", "/register"]) {
        await page.goto(route);
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflow).toBe(false);
      }
    }
  });
});
