# Officer User Guide

A quick guide for HOA officers and staff. Open the app at **https://gintongaraw.coderyan.dev** on a laptop or phone. On a phone you can tap **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android) so it opens like an app.

What you see depends on your role. If a button or page is missing, ask an administrator for access.

## Signing in

- **New account:** tap _Request account_ on the sign-in page. An administrator must approve you before you can sign in.
- **Forgot your password?** The app sends no email. Ask an administrator. They will give you a temporary password, and you will be asked to choose a new one when you sign in.
- Too many wrong passwords in a row will lock sign-in for about a minute.

## Search and notifications

- **Search:** press **Ctrl K** (or tap the search bar) and type a name, tracking number (`2026-0012`), **Blk 4 Lot 12**, part of a phone number, or a meeting date (**Oct 12**). Members show their balance. Enter opens the record. Recently opened members appear when the box is empty.
- **Bell:** shows what needs attention for your role: accounts to approve, a meeting open for check-in or left open, members at risk, overdue contributions, an upcoming rate change, and failed sign-ins on your account. Each alert disappears once it is resolved.

## Members

**Members** lists one record per household. Search by name, tracking number or phone, or filter by block, position or _At risk_.

- **Add member:** only the fields marked \* are required: first name, last name, tracking number (`YYYY-NNNN`, e.g. `2026-0001`), block and lot. You can fill in the rest later.
- **Photo:** on the member page, tap the photo to take a picture or upload one. Crop it to the frame. _Remove background_ makes the background plain white for the ID card.
- **Deactivate:** use this when a household leaves. The record is kept and can be reactivated. Members are never permanently deleted.
- **Export:** download the current list (with your filters) as Excel or CSV.

### Importing many members at once

1. Go to **Members → Import** and tap **Download template**.
2. Fill in one row per household. Keep the column headers and type tracking numbers as `2026-0001`. Address names (city, barangay) are matched automatically. If a name can't be matched, it is kept as plain text.
3. Upload the file. You'll see a preview:
   - **Ready:** these rows will be added.
   - **Exists:** the tracking number is already in the system or appears twice in the file. These rows are skipped.
   - **Error:** a required field is missing or invalid. Fix the row in the file and upload it again.
4. Press **Import N members**. Nothing is saved before this step.

## ID cards

- On a member page, tap **ID card** to preview and download the front and back. Cards are print-ready (CR80 size, 600 DPI) for soft copies or PVC printing.
- From **Members**, use **Print ID cards** to download many cards as one PDF.
- The QR code on each card opens the member's own page, which shows their photo, name, block/lot and attendance dates. It never shows contact details.
- **Lost card?** Open the member and choose **Reissue card**. The old QR code stops working immediately. Print the new card.

## Meetings and attendance

1. **Meetings → New meeting.** The date, time and place are pre-filled from Settings. On the day itself you can instead tap **Start today's meeting** on the Attendance screen.
2. On meeting day, tap **Open** on the meeting. Only open meetings accept check-ins.
3. On **Attendance**, check members in with **Scan QR** (point the phone camera at their ID) or **Manual** (search by name). Scanning the same card twice is ignored.
4. Tap **Close** when the meeting ends. Members who didn't attend are counted as missed. Use **Reopen** if you closed it too early.
5. **Attendance → Export attendance:** choose a date range and download Excel/CSV.

If the camera doesn't start, allow camera access for the site in your browser settings. Use the address `https://…`, not a link opened inside another app.

## Contributions

Every household owes a monthly contribution (₱1,000 until October 2026, ₱1,500 from November 2026). The app only keeps records. No money is handled online.

1. **Contributions → Collect** (or **Record payment** on a member's page).
2. Find the member with **Scan QR** or **Manual** (tracking number or name). You'll see their balance, the months still unpaid and the month they're paid through.
3. Type the **amount received**, or tap a quick pick (1–3 months, or the full balance). Choose the method (Cash, GCash, Bank transfer, Other) and add a reference number for GCash or bank payments. Then press **Record**.
4. The amount is applied to the **oldest unpaid month first**. Overpayments count as advance payment for the coming months.
5. If the same member was recorded in the last 10 minutes, the app asks before recording again, to avoid double entries.

**Mistakes:** payments can't be edited or deleted. On the member page (or Contributions → Payments), tap the void icon, give a reason, then record the correct payment.

**Contributions page:** pick a month to see collected vs expected and the collection rate. **Balances** lists every household that owes, with overdue months. **Payments** lists payments by date range and exports them to Excel/CSV. The Excel file also has a Balances sheet.

**Past payments:** **Contributions → Import** loads payments from Excel/CSV (tracking number, date paid, amount). Importing the same file twice is safe because already-recorded payments are skipped.

**Rates:** **Settings → Contributions** sets the start month and the monthly rate, plus future increases. Members see their own payments and balance when they scan their ID card.

## Dashboard

The dashboard shows member totals, recent meeting turnout and **Members at risk**: households that missed the last _N_ closed meetings in a row. Set _N_ in **Settings → Missed meetings in a row**.

## Administration (administrators only)

- **Users:** approve or suspend accounts, assign groups, reset passwords.
- **Groups:** groups give permissions. A lower rank number means a higher role. You can only manage groups ranked below your own.
- **Audit log:** every change, with who made it, when, and from which device.
- **Settings:** usual meeting day, time, place and title, and the "at risk" threshold.

## Good practice

- Sign out on shared devices.
- Don't share accounts. Each officer should have their own, so the audit log stays meaningful.
- Correct records when members tell you. See the [Data Privacy Notice](https://gintongaraw.coderyan.dev/privacy) for members' rights.
- Questions about the system: contact the HOA office, +63 961 513 1328.
