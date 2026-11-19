import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * A complete four-player game in four independent browser contexts:
 * a clear win with a bid update, a tie settled by the host, a no-bid round
 * that restarts, and a final round. Includes refreshes at critical moments
 * and checks the final balances.
 */

const BID_SECONDS = 8; // honoured when the server runs with CB_TEST_TIMERS=1; otherwise 30
const REVEAL_TIMEOUT = 45_000;

interface Seat {
  name: string;
  page: Page;
}

async function openSeat(browser: Browser, name: string, mobile = true): Promise<Seat> {
  const context = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } },
  );
  return { name, page: await context.newPage() };
}

async function joinAs(seat: Seat, code: string) {
  await seat.page.goto(`/join?code=${code}`);
  await seat.page.getByLabel("Nickname").fill(seat.name);
  await seat.page.getByRole("button", { name: "Join game" }).click();
  await expect(seat.page).toHaveURL(new RegExp(`/room/${code}$`));
}

/** Wait for the pitch screen and work out who's pitching from each player's own view. */
async function waitForPitch(host: Seat, seats: Seat[]): Promise<Seat> {
  await expect(host.page.getByRole("button", { name: "Start bidding" })).toBeEnabled();
  for (const seat of seats) {
    // "Alex turn" for everyone else, "You're up, …!" for the pitcher.
    await expect(seat.page.getByText(/ turn$|You're up/).first()).toBeVisible();
  }
  for (const seat of seats) {
    if (await seat.page.getByText("You're up", { exact: false }).first().isVisible()) return seat;
  }
  throw new Error("No pitcher found");
}

async function placeBid(seat: Seat, amount: number) {
  const input = seat.page.locator("#bid-amount");
  await input.fill(String(amount));
  await seat.page.getByRole("button", { name: /^(Place bid|Update bid)$/ }).click();
  await expect(seat.page.getByText(`Your bid: ${amount}`)).toBeVisible();
}

async function startBidding(host: Seat, seats: Seat[]) {
  await host.page.getByRole("button", { name: "Start bidding" }).click();
  for (const seat of seats) await expect(seat.page.getByRole("timer")).toBeVisible();
}

test("a full Bidmas game", async ({ browser }) => {
  const host = await openSeat(browser, "Host", false);
  const alex = await openSeat(browser, "Alex");
  const jamie = await openSeat(browser, "Jamie");
  const sam = await openSeat(browser, "Sam");
  const seats = [host, alex, jamie, sam];
  const credits = new Map(seats.map((s) => [s.name, 20]));

  // 1. Host creates a room.
  await host.page.goto(`/create?timer=${BID_SECONDS}`);
  await host.page.getByLabel("Nickname").fill("Host");
  await host.page.getByRole("button", { name: "Create room" }).click();
  await expect(host.page).toHaveURL(/\/room\/\d{4}$/);
  const code = host.page.url().match(/\/room\/(\d{4})$/)![1]!;
  await expect(host.page.getByRole("button", { name: "Start game" })).toBeDisabled();

  // 2–3. Three players join; everyone sees everyone in the lobby.
  for (const seat of [alex, jamie, sam]) await joinAs(seat, code);
  for (const seat of seats) await expect(seat.page.getByRole("list", { name: "Players" }).getByRole("listitem")).toHaveCount(4);
  await expect(host.page.getByText("Waiting for players")).toBeVisible();

  // Duplicate names are refused.
  const dupe = await openSeat(browser, "alex");
  await dupe.page.goto(`/join?code=${code}`);
  await dupe.page.getByLabel("Nickname").fill("ALEX");
  await dupe.page.getByRole("button", { name: "Join game" }).click();
  await expect(dupe.page.getByText(/already called/)).toBeVisible();

  // 4. Host starts the game.
  await host.page.getByRole("button", { name: "Start game" }).click();

  const scenarios = ["update", "tie", "no-bids", "single"] as const;
  for (const [index, scenario] of scenarios.entries()) {
    // 5. A pitcher is drawn.
    const pitcher = await waitForPitch(host, seats);
    const bidders = seats.filter((s) => s !== pitcher);
    await expect(host.page.getByText(`Round ${index + 1} of 4`).first()).toBeVisible();
    // Everyone who can bid sees their up-to-date balance on the pitch screen.
    for (const seat of bidders) {
      await expect(seat.page.getByTitle("Your available credits")).toContainText(String(credits.get(seat.name)));
    }

    // 6. Bidding begins.
    await startBidding(host, seats);
    let winner: Seat | null = null;
    let amount = 0;

    if (scenario === "update") {
      // 7–8. Two bids, one of them updated; a refresh doesn't lose the bid.
      const [a, b] = bidders;
      await placeBid(a!, 5);
      await placeBid(b!, 6);
      await placeBid(a!, 8);
      await expect(pitcher.page.getByText(/bids? in so far/)).toHaveCount(0);
      await expect(pitcher.page.getByText("Your gift is up for bidding!")).toBeVisible();
      await a!.page.reload();
      await expect(a!.page.getByText("Your bid: 8")).toBeVisible();
      winner = a!;
      amount = 8;
    } else if (scenario === "tie") {
      const [a, b] = bidders;
      await placeBid(a!, 3);
      await placeBid(b!, 3);
      winner = b!;
      amount = 3;
    } else if (scenario === "no-bids") {
      // 17–18. Nobody bids; the host restarts the same round.
      await expect(host.page.getByText("No bids this round!")).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await host.page.getByRole("button", { name: "Restart bidding" }).click();
      for (const seat of seats) await expect(seat.page.getByRole("timer")).toBeVisible();
      await expect(host.page.getByText(`Round ${index + 1} of 4`)).toHaveCount(0); // eyebrow switches to "Second chance"
      await placeBid(bidders[0]!, 1);
      winner = bidders[0]!;
      amount = 1;
    } else {
      await placeBid(bidders[2]!, 2);
      winner = bidders[2]!;
      amount = 2;
    }

    // 9–10. Countdown expires; bids are revealed to everyone.
    await expect(host.page.getByText("The bids are in!")).toBeVisible({ timeout: REVEAL_TIMEOUT });
    for (const seat of seats) await expect(seat.page.getByText("The bids are in!")).toBeVisible();

    if (scenario === "tie") {
      // 14–15. Tie: the host refreshes, the tiebreaker survives, and the host picks the winner.
      await expect(host.page.getByText("It's a tie!")).toBeVisible();
      await host.page.reload();
      await expect(host.page.getByText("Choose the tiebreaker winner")).toBeVisible();
      await expect(host.page.getByRole("button", { name: "Confirm winner" })).toBeDisabled();
      await host.page.getByRole("radio", { name: new RegExp(winner.name) }).click();
      await expect(host.page.getByText(`${winner.name} pays ${amount} credit`)).toBeVisible();
      await host.page.getByRole("button", { name: "Confirm winner" }).click();
    } else {
      await expect(host.page.getByText(`${winner.name} has the highest bid!`)).toBeVisible();
      // 11. Host confirms.
      await host.page.getByRole("button", { name: "Confirm winner" }).click();
    }

    // 12/16. Credits transfer correctly and everyone sees the announcement.
    const before = { winner: credits.get(winner.name)!, pitcher: credits.get(pitcher.name)! };
    credits.set(winner.name, before.winner - amount);
    credits.set(pitcher.name, before.pitcher + amount);
    for (const seat of seats) {
      await expect(seat.page.getByRole("heading", { name: /takes home the gift!|You won/ })).toBeVisible();
    }
    const ledger = host.page.getByLabel("Credit transfer").locator("li");
    await expect(ledger.filter({ hasText: winner.name })).toHaveText(
      new RegExp(`${before.winner}${credits.get(winner.name)}−${amount}$`),
    );
    await expect(ledger.filter({ hasText: pitcher.name })).toHaveText(
      new RegExp(`${before.pitcher}${credits.get(pitcher.name)}\\+${amount}$`),
    );

    // 13. Next round (or wrap up after the last pitch).
    await host.page.getByRole("button", { name: index === scenarios.length - 1 ? "Wrap up" : "Next round" }).click();
  }

  // 19–20. Everyone has pitched; the host ends the game.
  await expect(host.page.getByText("That's a wrap!")).toBeVisible();
  await expect(host.page.getByRole("button", { name: "Next round" })).toHaveCount(0);
  await host.page.getByRole("button", { name: "End game" }).click();

  // 21. Everyone lands on the thank-you page. (Balances were verified round by round above.)
  for (const seat of seats) {
    await expect(seat.page).toHaveURL(new RegExp(`/room/${code}/results$`));
    await expect(seat.page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  }
  expect([...credits.values()].reduce((a, b) => a + b, 0)).toBe(80);
});
