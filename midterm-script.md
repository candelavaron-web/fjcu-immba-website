# Midterm — speaking script (6 minutes)

Open the deck, press **F** for fullscreen, **→** to advance.
Total budget: 360 s. Rehearse once with a timer; the slide times below add up to 350 s.

---

### 1 · Title — 15 s
"I'm Candela Varón. My product is the website of this program, the FJCU imMBA —
rebuilt so that the program itself can run it, without a developer."

### 2 · Product concept — 35 s
"Today the official site keeps its content inside the code: every edit needs a
developer, so pages age and the English and Chinese versions drift apart.
My product is two things in one: a bilingual public site for applicants, and a
back office where the program office edits faculty, announcements and alumni.
The value is simple — publish in a minute, safely."

### 3 · Users & needs — 45 s
"Three users. The **prospective student** wants three answers fast: is it in
English, when do I apply, who teaches. The **program office** is the daily user:
they need to publish in both languages at once and fix data without asking anyone.
The **director** is accountable: they decide who may edit and need to know who
changed what."

### 4 · Requirements — 30 s
"From those needs: visitors browse and search; admins manage records and import
data; super admins manage people; and the system enforces permissions and records
every change. Four non-functional rules, and the one I care most about: the public
site must stay up even if the backend is down."

### 5 · MVP scope — 35 s
"Must-have is everything an applicant sees plus the tools to keep it true: the
bilingual site, announcements, the back office with roles, faculty, alumni and the
activity log. Nice-to-have — the application form, machine translation, an alumni
portal — is cut not because it is hard, but because it needs other stakeholders:
the admissions office, alumni consent."

### 6 · Product structure — 30 s
"Two surfaces over one database. The public menu deliberately mirrors the official
site, so staff recognise where things live. The back office has five areas and is
reached from the logo — no public link."

### 7 · User flow — 35 s
"The applicant journey: home → announcements → admissions → faculty → apply.
The administrator journey is the interesting one: register, verify email, and then
you wait. A new account is **pending** until a super admin approves it. After that,
every edit is live on the site immediately and recorded in the log."

### 8 · UI/UX decisions — 50 s   ← the graded one, do not rush
"Three decisions. First, one announcement holds both languages in a single record,
and the editor previews them side by side and warns when one is missing — two
separate posts would drift apart. Second, degree is a dropdown with four values,
enforced again in the database: otherwise 'MBA', 'M.B.A.' and 'Master's' become
three different groups in a filter. Third, approval before access — authentication
answers who you are, authorization what you may do."

### 9 · Faculty screen — 25 s
"One professor per row, because applicants scan for a research field, so
Specialties gets its own line. Filter chips instead of a search box: 19 records is
too many to read, too few to search. And if the backend is unreachable, the page
falls back to a bundled copy — an applicant never sees an empty page."

### 10 · Data design — 30 s
"Five entities. Bilingual fields live in the same row. Alumni carry the eleven
fields of the brief. And the audit log stores who, what, which record, when, and
the exact field-level change — written by the database, so history cannot be
edited from the back office."

### 11 · System design — 25 s
"Visitor → static site on Vercel → Supabase API. Admin → the same site, gated by
role → Supabase → and the public site updates on the next load. The public key
ships inside the website, so the database policies — not the interface — are what
keep alumni and the log private."

### 12 · Status & next — 25 s
"Working today: four bilingual pages, 19 faculty with photos, 26 announcements,
the back office with roles, CSV import and export, and the activity log. Next is
validation: can someone from the office publish unaided, without me in the room?"

### 13 · Close — 10 s
"Content belongs to the program, not to the code. The site and the back office are
live at these addresses. Happy to take questions."

---

## Likely questions

**Why not WordPress?** It solves content, but not the two things that mattered
here: one bilingual record instead of two drifting posts, and a role system where
the database — not the interface — enforces who can do what.

**Is the public key a security problem?** No. It is designed to be public. Row
level security decides what it can read: published announcements and faculty, yes;
alumni and the audit log, only for a signed-in administrator.

**How do you prevent a bad CSV import?** Nothing is written until the file passes
validation: unknown columns, missing names, empty rows, invalid degree values,
out-of-range years and duplicate student IDs are listed first. The import button
stays disabled until there are zero errors.

**What if someone deletes 100 alumni?** The audit log records each deletion with
the full row, so the data can be reconstructed. Restoring from the log directly is
on the roadmap.

**Who maintains this after the course?** That is exactly the point of the back
office — the next person needs no code, only an approved account.
