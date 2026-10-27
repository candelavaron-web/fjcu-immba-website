# FJCU imMBA — course website (AI-ADPD)

Student project for the course *AI-Assisted Digital Product Development* (Prof. Yi-Ning Tu,
Fu Jen Catholic University). It is a redesign of the official imMBA site
(<https://www.management.fju.edu.tw/esubweb/immbaengindex/>) — cleaner, more professional and
more international. **It is not the official website.**

## How to open it
Double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 5173
```

## Structure
```
index.html              Home page (every section of the menu)
about.html              Overview & Ranking · Our Learning Environment
admissions.html         How to apply · Tuition & Scholarships
curriculum.html         Courses & Requirements · Graduation
assets/css/styles.css   Design system: tokens, components, responsive rules
assets/js/layout.js     Notice bar + header/nav + footer (edit the menu here, once)
assets/js/main.js       Language switch, mobile menu, dropdowns, reveal, lightbox
assets/js/data/         Content data: faculty.js, news.js
```

## Homepage structure (as taught in class #4)
1. **Top notice bar** — teaching-site notice, link to the official website, "Collapse main menu" button
2. **Branding header** — logo + "Fu Jen Catholic University International MBA (imMBA)"
3. **Navigation bar** — the same tabs as the official site (About, Admissions, Courses, Faculty,
   imMBA Guide, Graduation, Dual Degree, Exchange, Highlights, News, Download), with hover dropdowns
   and a "College of Management" secondary link
4. **Action area** — language switch (EN / 中文) + **Apply Now**
5. **Hero** — headline, value proposition, two CTA buttons

Below the hero the page continues in the same order as the menu: accreditations, key figures,
Overview, Learning Environment, Admissions + Tuition, Curriculum, Faculty, imMBA Guide,
Graduation, Dual Degree, Exchange, Highlights, News, Downloads and Contact.

## Logo
`assets/img/logo.svg` — a compass rose on a navy disc, with two of its points in gold:
navigation, direction and a global outlook, with no letters. It is drawn inline in
`layout.js` (header and footer, the footer using a lighter disc), in `admin.html`, and as a
data-URI favicon in both pages.

## Bilingual content
Both languages live in the HTML side by side; the inactive one is hidden by CSS:

```html
<h2><span lang="en">Why imMBA</span><span lang="zh-Hant">為什麼選擇 imMBA</span></h2>
```

The choice is remembered in `localStorage`, and `?lang=zh` forces a language.

## Link types
- **Internal** — consistent menu/link styling, hover state.
- **External** — opens in a new tab, marked with an external-link icon automatically.
- **Resource** — document lists show the file type (PDF / XLS).
- **Action (CTA)** — button style, action verb (Apply Now, See admission steps).

## Cloud backend (class #6)
Faculty data, photos and administrators live in **Supabase**:

```
supabase/schema.sql      tables, roles, row level security, storage bucket
supabase/seed.sql        the 19 faculty members of the program
supabase/README.md       step-by-step setup
admin.html               back office: sign in, faculty CRUD, reorder, photos
assets/js/supabase-*.js  connection details and the data API
scripts/build-config.sh  writes the config from Vercel environment variables
```

The public Faculty section reads from Supabase and falls back to
`assets/js/data/faculty.js` if the backend is unreachable, so the site never
shows an empty page.

Administrator roles: `pending` → `admin` → `super_admin` (approves others).

## Alumni database and audit trail (class #7)
`supabase/alumni.sql` creates the `alumni` table (the eleven fields of the
brief, with `degree_program` constrained to Bachelor / Master / Doctoral /
Other) and the `audit_log` table. A database trigger writes one audit row for
every create, update and delete, recording **who, what action, which record,
when and exactly which fields changed** — the log is read-only, even for
administrators.

The back office adds two tabs:

- **Alumni** — add, edit, delete; search across every field; filter by degree,
  graduation year, department and company; choose which columns to display;
  export the filtered rows as CSV; download a CSV template and import a file
  in batches. Imports are validated first: unknown columns, missing required
  fields, empty rows, invalid degree values, out-of-range years and duplicate
  student IDs are reported before anything is written.
- **Activity log** — the audit trail, filterable by action and administrator.

## Announcements (class #5)
`supabase/news.sql` creates the `news` table, where **one record holds both
languages** (Chinese and English title, summary and content) plus the shared
date, link, status and display order. The back office has an **Announcements**
tab to create, preview, edit and delete them: deleting once removes both
language versions, and the preview shows the two side by side and warns when
they are not synchronised.

The home page shows the three most recent announcements as cards with date,
title, summary and a "View details" link to the original announcement, plus a
source reference.

## Still to do
- Faculty, imMBA Guide, Graduation and Highlights still live as sections of the
  home page rather than separate pages
