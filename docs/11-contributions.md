# Contributions (Phase 7)

Record-keeping for the monthly member contribution. **No online payments.** Collectors take the payment in person, then record it in the app by scanning the member's ID QR or by looking up their tracking number or name.

## Decisions

| Topic       | Decision                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| Kind        | Monthly contribution only (no one-time fees or special assessments yet).                   |
| Rate        | ₱1,000/month from January 2026; ₱1,500/month from November 2026. Rates change in Settings. |
| Start       | Dues count from **January 2026**. Past payments are imported from Excel.                   |
| Exemptions  | None. Every active household owes the same rate.                                           |
| Receipts    | None for now. An optional reference no. (e.g. GCash ref) can be recorded.                  |
| Public page | Member's card page lists their payments, then a balance summary at the bottom.             |
| Scope       | Collections only (no expenses or fund balance yet).                                        |

## Rules

**Dues.** A household owes the rate of each month from its **start month** through the **current month** (Manila time):

- start month = the later of the contribution start month (Settings) and the member's _Member Since_ month. If Member Since is empty, the contribution start month is used, so set Member Since for households that joined later.
- A deactivated member stops owing after the month they were deactivated.
- A month's due is the rate in effect for **that month**. Paying October in December still costs October's rate (₱1,000).

**Payments are applied oldest month first** and are never tied to a specific month when recorded. The ledger is derived from total payments, not stored:

- ₱3,000 paid in November with October unpaid → October ₱1,000 ✔, November ₱1,500 ✔, ₱500 toward December (partial).
- Paying more than is due becomes **advance credit** covering future months.
- **Balance** = total due through this month − total paid. If negative, it is credit.
- **Paid through** = the last month that is fully paid, with every earlier month also paid.

**Corrections.** Payments are never edited or deleted. A wrong entry is **voided** with a reason and re-entered. Voided payments stay visible (struck through), don't count toward totals, and are audited.

**Repeat warning.** Recording a payment for a member who already has one recorded in the last 10 minutes asks for confirmation. Imported payments don't trigger it.

**Money** is stored as integer centavos.

## Data

- `contribution_payment`:
  - member, amount (centavos), `paidOn` (`@db.Date`, Manila day);
  - method: `CASH | GCASH | BANK | OTHER`;
  - source: `QR | MANUAL | IMPORT`;
  - reference, notes, recordedBy, createdAt;
  - `voidedAt` / `voidedBy` / `voidReason`.
- Setting `contribution.schedule` = `{ startMonth: "2026-01", rates: [{ from: "2026-01", amount: 1000 }, { from: "2026-11", amount: 1500 }] }` (amounts in pesos).

## Permissions

| Key                    | For                                             |
| ---------------------- | ----------------------------------------------- |
| `contribution.view`    | Contributions overview, member ledgers, reports |
| `contribution.collect` | Record payments (scan / manual)                 |
| `contribution.void`    | Void a wrong payment                            |
| `contribution.export`  | Export payments and balances                    |
| `contribution.manage`  | Rates, start month, import past payments        |

## Screens

- **Contributions** (`/contributions`):
  - for a chosen month: expected, collected, collection rate, and members with a balance;
  - a payments list for a date range, with void and export.
- **Collect** (`/contributions/collect`): **Scan QR** or **Manual** (tracking no. or name).
  1. The screen shows the member, balance, unpaid months and paid-through month.
  2. Enter the amount (quick picks: this month, full balance), method, optional reference and date.
  3. Record.
  4. A warning appears if the same member was recorded in the last 10 minutes.
  5. "Collected today" totals stay on screen.
- **Member page:** a Contributions card with summary, the months of the current year, and payment history (void here).
- **Public card page:** the payment list, then a summary: total paid, paid through, balance or credit.
- **Import** (`/contributions/import`): past payments from Excel/CSV with a validation preview. Columns: Tracking No., Date Paid, Amount, Method, Reference, Notes.
- **Settings → Contributions:** start month and rate table.
- **Dashboard:** collected this month vs expected, and the number of members with unpaid past months.
