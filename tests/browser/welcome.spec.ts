import { expect, test } from "@playwright/test";

test("welcome links and protected routes work on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "From tee time to final standings." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await page.getByLabel("Full name").fill("Test Admin");
  await page.getByLabel("Email address").fill("tester@example.test");
  await page.getByLabel("Password", { exact: true }).fill("OnePassword1!");
  await page.getByLabel("Confirm password").fill("AnotherPassword2!");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("alert")).toHaveText("Passwords must match.");
  await page.goto("/dashboard/tournaments/new");
  await expect(page).toHaveURL("/signin");
  await page.goto("/tournament-access");
  await page.getByLabel("Tournament code").fill("bad");
  await page.getByRole("button", { name: "View tournament" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "provided by the organizer",
  );
});
