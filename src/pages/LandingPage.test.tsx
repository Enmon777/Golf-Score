// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { LandingPage } from "./LandingPage";
test("welcome page links to all three entry points", () => {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
  ).toBe("/signup");
  expect(
    screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
  ).toBe("/signin");
  expect(
    screen
      .getByRole("link", { name: "Enter tournament code" })
      .getAttribute("href"),
  ).toBe("/tournament-access");
});
