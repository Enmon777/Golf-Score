import { expect, test } from "@playwright/test";

const localUrl = process.env.VITE_SUPABASE_URL;
const enabled =
  process.env.GOLF_RUN_LOCAL_SUPABASE_E2E === "1" &&
  Boolean(localUrl && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(localUrl));

test("local Supabase owner creates and scores a tournament and a visitor views approved scores", async ({
  page,
  browser,
}, info) => {
  test.skip(
    !enabled || info.project.name !== "desktop",
    "Requires an explicitly configured local Supabase instance.",
  );
  test.setTimeout(120000);
  const suffix = crypto.randomUUID().slice(0, 8);
  const name = "Bent Creek Open " + suffix;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Tournament Owner");
  await page
    .getByLabel("Email address")
    .fill("owner-" + suffix + "@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("TournamentExample1!");
  await page.getByLabel("Confirm password").fill("TournamentExample1!");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("link", { name: "Create tournament" }).click();
  await page.getByLabel("Tournament name").fill(name);
  await page.getByLabel("Start date").fill("2026-11-18");
  await page.getByLabel("End date").fill("2026-11-19");
  await page.getByLabel("Tournament time zone").fill("America/Chicago");
  await page.getByLabel("Default holes").selectOption("9");
  await page.getByLabel("Counting players per team").fill("1");
  await page.getByRole("button", { name: "Create tournament" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const code = (await page.locator(".context-name").innerText()).match(
    /GOLF-[0-9A-F]{16}/,
  )?.[0];
  expect(code).toBeTruthy();
  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Teams", exact: true }).click();
  await page.getByLabel("Team name").fill("Green");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Green" })).toBeVisible();
  await nav.getByRole("link", { name: "Players", exact: true }).click();
  await page.getByLabel("Full name").fill("Alex Woods");
  await page
    .getByRole("combobox", { name: "Team", exact: true })
    .selectOption({ label: "Green" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Alex Woods" })).toBeVisible();
  await nav.getByRole("link", { name: "Courses", exact: true }).click();
  await page.getByLabel("Course name").fill("Bent Creek");
  for (const input of await page.getByLabel("Par", { exact: true }).all())
    await input.fill("4");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Bent Creek", exact: true }),
  ).toHaveCount(1);
  await nav.getByRole("link", { name: "Calendar", exact: true }).click();
  await page.getByLabel("Round name").fill("Opening Round");
  await page.getByLabel("Local start time").fill("2026-11-18T08:00");
  await page
    .getByRole("combobox", { name: "Course", exact: true })
    .selectOption({ label: "Bent Creek · 9 holes" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "1. Opening Round" }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Scorecards", exact: true }).click();
  const strokeTotal = page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: "Alex Woods", exact: true }),
    })
    .getByRole("cell")
    .nth(4);
  await page.getByRole("link", { name: "Manual entry" }).click();
  await page
    .getByRole("combobox", { name: "Round", exact: true })
    .selectOption({ label: "Opening Round" });
  await page
    .getByRole("combobox", { name: "Player", exact: true })
    .selectOption({ label: "Alex Woods" });
  for (const input of await page.getByRole("spinbutton").all())
    await input.fill("4");
  await page.getByRole("checkbox", { name: /verified every player/i }).check();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(strokeTotal).toHaveText("36");
  await page.reload();
  await expect(strokeTotal).toHaveText("36");
  const tournamentUrl = page.url().replace(/\/scorecards$/, "");
  const photo = await page.evaluate(() => {
    const image = document.createElement("canvas");
    image.width = 1400;
    image.height = 300;
    const context = image.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, image.width, image.height);
    context.fillStyle = "#000";
    context.font = "bold 34px Arial";
    context.textAlign = "center";
    const lines = [
      ["HOLE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "OUT"],
      ["PAR", "4", "4", "4", "4", "4", "4", "4", "4", "4", "36"],
      ["Alex Woods", "5", "4", "4", "4", "4", "4", "4", "4", "4", "37"],
    ];
    lines.forEach((line, row) =>
      line.forEach((cell, column) =>
        context.fillText(
          cell,
          column === 0 ? 145 : 205 + column * 105,
          75 + row * 80,
        ),
      ),
    );
    return image.toDataURL("image/png").split(",")[1];
  });
  await page.getByRole("link", { name: "Scan scorecard" }).click();
  await page
    .getByRole("combobox", { name: "Round", exact: true })
    .selectOption({ label: "Opening Round" });
  await page.getByLabel("Upload photo").setInputFiles({
    name: "scorecard.png",
    mimeType: "image/png",
    buffer: Buffer.from(photo, "base64"),
  });
  await expect(page.getByAltText("Cropped scorecard preview")).toBeVisible();
  await page.getByRole("button", { name: "Scan and review" }).click();
  await expect(
    page.getByRole("heading", { name: "Scorecard verification" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.getByAltText("Original uploaded scorecard")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Player", exact: true })
    .selectOption({ label: "Alex Woods" });
  const extractedScores = page.getByRole("spinbutton");
  await expect(extractedScores).toHaveCount(9);
  await expect(extractedScores.first()).toHaveValue("5");
  for (const input of (await extractedScores.all()).slice(1))
    await expect(input).toHaveValue("4");
  await page
    .getByLabel("Reason for revision")
    .fill("Checked uploaded scorecard");
  await page
    .getByRole("checkbox", { name: /Replace these approved scores/ })
    .check();
  await page.getByRole("checkbox", { name: /verified every player/i }).check();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(strokeTotal).toHaveText("37");
  const spectator = await browser.newContext();
  try {
    const visitor = await spectator.newPage();
    await visitor.goto("/tournament-access");
    await visitor.getByLabel("Tournament code").fill(code!);
    await visitor.getByRole("button", { name: "View tournament" }).click();
    await expect(
      visitor.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await visitor.getByRole("link", { name: "Round scores" }).click();
    await expect(visitor.getByText(/Alex Woods · 37 strokes/)).toBeVisible();
    await expect(
      visitor.getByRole("button", { name: /edit|approve|upload/i }),
    ).toHaveCount(0);
    await visitor.goto("/signup");
    await visitor.getByLabel("Full name").fill("Different Owner");
    await visitor
      .getByLabel("Email address")
      .fill("other-" + suffix + "@example.test");
    await visitor
      .getByLabel("Password", { exact: true })
      .fill("TournamentExample1!");
    await visitor.getByLabel("Confirm password").fill("TournamentExample1!");
    await visitor.getByRole("button", { name: "Create an account" }).click();
    await expect(visitor).toHaveURL("/dashboard");
    await visitor.goto(tournamentUrl);
    await expect(visitor.getByRole("alert")).toContainText(
      "Tournament unavailable",
    );
  } finally {
    await spectator.close();
  }
});
