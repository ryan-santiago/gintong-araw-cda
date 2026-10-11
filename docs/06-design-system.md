# 06 — Design System: "Araw"

_Gintong Araw_ means "golden sun", and the design comes from that. The look takes from the Dribbble reference: a soft warm canvas, white floating cards, large numbers, rounded shapes and one bold accent. The reference's lime accent is replaced with **sun gold**, supported by a deep **palay green** taken from the house in the logo.

## 1. Principles

1. **Calm canvas, one bright accent.** The UI stays neutral and warm; gold marks the single most important action or number on a screen.
2. **Big numbers, small labels.** Stats are shown large (32–40px, semibold) with a small muted label above.
3. **Soft and round.** 20px card radius, pill chips, no hard borders on cards in light mode. Hierarchy comes from surface color.
4. **Fast on a phone at a meeting.** Large touch targets (44px min), the scanner reachable in one tap, and strong success/error feedback.
5. **Readable for everyone.** WCAG AA contrast. Gold is a fill color, never text on a light background.

## 2. Color palette

### Brand scales

| Step    | Ginto (gold)  | Palay (green) |
| ------- | ------------- | ------------- |
| 50      | `#FFFBEB`     | `#EEF8F1`     |
| 100     | `#FEF3C7`     | `#D5EEDD`     |
| 200     | `#FDE68A`     | `#AEDDBF`     |
| 300     | `#FCD34D`     | `#7CC69A`     |
| 400     | `#FFC727`     | `#4AAA74`     |
| **500** | **`#F5B700`** | `#2E8F5B`     |
| 600     | `#D99A00`     | **`#1F7A4D`** |
| 700     | `#A86F00`     | `#196140`     |
| 800     | `#7A5005`     | `#154D34`     |
| 900     | `#4F3407`     | `#0F3524`     |

### Semantic tokens (shadcn variables)

| Token                    | Light     | Dark      | Use                                                    |
| ------------------------ | --------- | --------- | ------------------------------------------------------ |
| `--background`           | `#F4F3EE` | `#0E0F0C` | App canvas                                             |
| `--foreground`           | `#1C1B17` | `#F2F1EA` | Body text                                              |
| `--card`                 | `#FFFFFF` | `#171914` | Cards, panels                                          |
| `--card-foreground`      | `#1C1B17` | `#F2F1EA` |                                                        |
| `--popover`              | `#FFFFFF` | `#1D1F19` | Menus, dialogs                                         |
| `--muted`                | `#EFEDE6` | `#22251E` | Empty bar tracks, table stripes, skeletons             |
| `--muted-foreground`     | `#6B6A61` | `#A3A296` | Labels, captions                                       |
| `--border`               | `#E6E3D9` | `#2B2F26` | Dividers, inputs                                       |
| `--input`                | `#E6E3D9` | `#2B2F26` |                                                        |
| `--primary`              | `#F5B700` | `#FFC727` | Main CTA (Capture Attendance, Save), active highlights |
| `--primary-foreground`   | `#1C1B17` | `#16150F` | Text on gold — always dark                             |
| `--secondary`            | `#1F7A4D` | `#3FB27A` | Secondary emphasis, positive stats, active-nav icon    |
| `--secondary-foreground` | `#FFFFFF` | `#0E0F0C` |                                                        |
| `--accent`               | `#FEF3C7` | `#3A2F0E` | Hover/selected rows, soft gold chips                   |
| `--accent-foreground`    | `#7A5005` | `#FFD866` |                                                        |
| `--destructive`          | `#DC2626` | `#F05252` | Deactivate, errors, scan rejected                      |
| `--success`              | `#16A34A` | `#34C77B` | Scan OK, "Present"                                     |
| `--warning`              | `#EA7A0C` | `#F59E42` | Duplicate scan, at-risk members                        |
| `--info`                 | `#2563EB` | `#60A5FA` | Info banners                                           |
| `--ring`                 | `#F5B700` | `#FFC727` | Focus ring (2px + 2px offset)                          |
| `--ink`                  | `#1C1B17` | `#F2F1EA` | Dark pill buttons (like the reference's black CTA)     |
| `--sidebar`              | `#F4F3EE` | `#0E0F0C` | Same as canvas; active item = card-colored pill        |

**Chart colors:** `--chart-1` gold `#F5B700` / `#FFC727` · `--chart-2` green `#1F7A4D` / `#3FB27A` · `--chart-3` orange `#EA7A0C` / `#F59E42` · `--chart-4` blue `#3B82F6` / `#60A5FA` · `--chart-5` stone `#C9C6BA` / `#4A4D43`.

**Rules**

- Gold text on light surfaces fails contrast. For gold-tinted text use `--accent-foreground` (`#7A5005`).
- Status always pairs color with an icon or label (never color alone).
- Use only one gold-filled button per view.

### `globals.css` (Tailwind v4 + shadcn)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 1.25rem;
  --background: #f4f3ee;
  --foreground: #1c1b17;
  --card: #ffffff;
  --card-foreground: #1c1b17;
  --popover: #ffffff;
  --popover-foreground: #1c1b17;
  --primary: #f5b700;
  --primary-foreground: #1c1b17;
  --secondary: #1f7a4d;
  --secondary-foreground: #ffffff;
  --muted: #efede6;
  --muted-foreground: #6b6a61;
  --accent: #fef3c7;
  --accent-foreground: #7a5005;
  --destructive: #dc2626;
  --success: #16a34a;
  --warning: #ea7a0c;
  --info: #2563eb;
  --border: #e6e3d9;
  --input: #e6e3d9;
  --ring: #f5b700;
  --ink: #1c1b17;
  --chart-1: #f5b700;
  --chart-2: #1f7a4d;
  --chart-3: #ea7a0c;
  --chart-4: #3b82f6;
  --chart-5: #c9c6ba;
  --sidebar: #f4f3ee;
  --sidebar-foreground: #1c1b17;
  --sidebar-primary: #f5b700;
  --sidebar-primary-foreground: #1c1b17;
  --sidebar-accent: #ffffff;
  --sidebar-accent-foreground: #1c1b17;
  --sidebar-border: #e6e3d9;
  --sidebar-ring: #f5b700;
}

.dark {
  --background: #0e0f0c;
  --foreground: #f2f1ea;
  --card: #171914;
  --card-foreground: #f2f1ea;
  --popover: #1d1f19;
  --popover-foreground: #f2f1ea;
  --primary: #ffc727;
  --primary-foreground: #16150f;
  --secondary: #3fb27a;
  --secondary-foreground: #0e0f0c;
  --muted: #22251e;
  --muted-foreground: #a3a296;
  --accent: #3a2f0e;
  --accent-foreground: #ffd866;
  --destructive: #f05252;
  --success: #34c77b;
  --warning: #f59e42;
  --info: #60a5fa;
  --border: #2b2f26;
  --input: #2b2f26;
  --ring: #ffc727;
  --ink: #f2f1ea;
  --chart-1: #ffc727;
  --chart-2: #3fb27a;
  --chart-3: #f59e42;
  --chart-4: #60a5fa;
  --chart-5: #4a4d43;
  --sidebar: #0e0f0c;
  --sidebar-foreground: #f2f1ea;
  --sidebar-primary: #ffc727;
  --sidebar-primary-foreground: #16150f;
  --sidebar-accent: #171914;
  --sidebar-accent-foreground: #f2f1ea;
  --sidebar-border: #2b2f26;
  --sidebar-ring: #ffc727;
}

@theme inline {
  --font-sans: var(--font-jakarta);
  --font-mono: var(--font-geist-mono);
  --radius-sm: calc(var(--radius) - 10px); /* 10px: badges, small inputs */
  --radius-md: calc(var(--radius) - 8px); /* 12px: inputs, buttons */
  --radius-lg: calc(var(--radius) - 4px); /* 16px: inner panels */
  --radius-xl: var(--radius); /* 20px: cards */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-ink: var(--ink);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

## 3. Typography

| Role                 | Font              | Size / weight                                    |
| -------------------- | ----------------- | ------------------------------------------------ |
| Display stat         | Plus Jakarta Sans | 36–40px / 700, tracking -0.02em, tabular numbers |
| Page title           | Plus Jakarta Sans | 24px / 700                                       |
| Card title           | Plus Jakarta Sans | 16px / 600                                       |
| Body                 | Plus Jakarta Sans | 14px / 400–500                                   |
| Caption / label      | Plus Jakarta Sans | 12px / 500, `muted-foreground`                   |
| Codes (tracking no.) | Geist Mono        | 13px / 500                                       |

Use `font-variant-numeric: tabular-nums` on all numbers in tables and stats.

## 4. Layout

- **App shell:** canvas `--background`. The sidebar sits on the canvas with no border. The main area is a grid of white cards with 16px gaps (24px on desktop).
- **Sidebar (desktop):** logo + "Gintong Araw" at the top. Groups: _Overview_ (Dashboard), _Community_ (Members, Attendance, Meetings), _Administration_ (Users, Groups, Audit Trail, Settings). The active item is a card-colored pill with a soft shadow; the active icon is green. A "Capture Attendance" gold card is pinned at the bottom (like the reference's Upgrade card), and a collapse toggle sits under it.
- **Top bar:** search field (opens the ⌘K command palette), theme toggle, notifications (pending approvals), and a user chip with avatar, name and group.
- **Mobile:** bottom nav with a raised gold **Scan** button in the center.
- **Max content width:** 1440px. Cards use `p-5` on mobile and `p-6` on desktop.

## 5. Key components

| Component            | Spec                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **StatCard**         | Label (12px muted) → value (36px bold) → delta chip (green ↑ / red ↓ with "vs last month")                                                          |
| **Attendance chart** | Rounded vertical bars (radius 10) showing present (gold) vs absent (muted track), last 8 meetings, tooltip card                                     |
| **NextMeetingCard**  | Gold gradient surface (`#FFD54A → #F5B700`), date, countdown, dark ink "Capture Attendance" pill                                                    |
| **Progress bar**     | 10px tall, rounded, gold fill on muted track (attendance rate)                                                                                      |
| **MemberAvatar**     | Rounded-full thumbnail; initials on a palay-100 background when there is no photo                                                                   |
| **Status badge**     | Pill: Active (green soft), Inactive (stone), At risk (orange soft), Pending (gold soft)                                                             |
| **Data table**       | No vertical borders, 56px rows, sticky header, row hover `--accent`, avatar + name + mono tracking no. in the first column                          |
| **Scan result card** | Full-width, animated in. Success: green ring + check + photo + name + time. Duplicate: amber. Invalid: red shake                                    |
| **Empty state**      | Simple line illustration of a sun, a one-line message and a primary action                                                                          |
| **Buttons**          | Primary = gold with dark text. Ink = black pill (inverts in dark). Outline = border + card background. Ghost for toolbars. Height 40 (44 on mobile) |

## 6. Motion

- 150–200 ms ease-out for hovers and menus, and 250 ms for sheets and dialogs.
- Scan success: scale 0.96 → 1 plus a green ring pulse. Error: a 6px horizontal shake.
- Respect `prefers-reduced-motion`.

## 7. Dark mode

- `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- Toggle in the top bar (sun/moon/system menu). The choice is remembered.
- Dark surfaces are warm near-black, not pure black. Gold gets brighter (`#FFC727`) so it still stands out.
- Charts use the dark chart tokens. Photos get a subtle 1px border so they don't blend into the background.

## 8. Brand assets

- `design/brand/logo.png` (108×100) is the real association logo. A higher-resolution version (512px+ PNG or SVG) is needed for sharp icons.
- Favicon: `src/app/icon.png` (the logo on a transparent square canvas, 512×512) and `src/app/apple-icon.png` (180×180 on a white background).
