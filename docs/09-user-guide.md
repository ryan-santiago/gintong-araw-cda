# Officer User Guide

A quick guide for HOA officers and staff. Open the app at **https://gintongaraw.coderyan.dev** on a laptop or phone. On a phone you can tap **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android) so it opens like an app.

What you see depends on your role. If a button or page is missing, ask an administrator for access.

## Signing in

- **New account:** tap _Request account_ on the sign-in page. An administrator must approve you before you can sign in.
- **Forgot your password?** The app sends no email. Ask an administrator. They will give you a temporary password, and you will be asked to choose a new one when you sign in.
- Too many wrong passwords in a row will lock sign-in for about a minute.

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
