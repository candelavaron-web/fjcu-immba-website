# Midterm — "Landed" · speaking script (6 minutes)

The midterm is a **product design review for the final project**, not the imMBA
website we build each week. Product: **Landed — your first 30 days in Taiwan**.

Open `midterm.pptx` in PowerPoint, use **Presenter View** (⌥⌘P) to read these notes
— they are already attached to each slide. Budget: 360 s; the times below total 350 s.

---

### 1 · Title — 15 s
"I'm Candela Varón. For my final project I want to build **Landed**: a guide that
walks an arriving international student through their first 30 days in Taiwan — the
paperwork, in order, with the real deadlines."

### 2 · The problem — 40 s
"Three things make arriving hard. The information is **scattered**: immigration, the
university, the bank and the landlord each own one piece, nobody owns the sequence.
A lot of it is **out of date** — the answer you find in a Facebook group is from 2023,
in Chinese, and the office has moved. And the clock is **legal**: the ARC must be
filed within 15 days of entry. Every international student I asked had missed, or
nearly missed, a step."

### 3 · Product concept — 35 s
"Landed turns that into one personalised checklist. Five questions about your
situation generate the tasks that actually apply to you, scheduled from the day you
land. The international office keeps the catalogue current in a back office, and
every task shows the date it was last verified. Scope is deliberate: FJCU, from
acceptance to day 30 — not a general life-in-Taiwan app."

### 4 · Users & needs — 45 s
"Three users. The **arriving student** lands with a visa, a suitcase and no sequence;
they need to know what to do, in what order, with which documents. The
**international office** answers the same ten questions every semester — they need to
publish once, in both languages, and update when rules change. And **senior students**
have the practical tips no official page carries, which is why contributions are a
role, with moderation."

### 5 · Requirements — 30 s
"Students answer an intake and tick off a dated checklist. Staff manage the catalogue
in two languages, with deadlines, documents and dependencies. Contributors suggest
tips. And the system turns offsets into dates, locks tasks whose prerequisite is
unfinished, and records every content change. Non-functional: phone first — this is
read standing in a queue."

### 6 · MVP scope — 35 s
"Must-have is the loop that delivers the value: intake, dated checklist, task detail,
tick off, plus the back office that keeps it true. Reminders, tips and a document
wallet wait. The wallet is cut on purpose — it would store passport scans, and that
needs a privacy review before a single line of code."

### 7 · Product structure — 30 s
"Two surfaces over one catalogue. The student app is five screens. The back office is
where the office edits tasks, moderates tips and reads the log — that part is what
makes this a product rather than a blog post."

### 8 · User flow — 35 s
"The student flow is one loop: intake once, then open, do, tick, next. The staff flow
is what keeps it alive: a rule changes, they edit both languages together, preview,
publish — and the verification date resets, so students can see the information is
fresh."

### 9 · Screens — 35 s
"Two screens carry the product. The **checklist** answers 'what now' at a glance: due
this week, already done, and locked — the bank account is greyed out because it needs
the ARC first, which prevents the wasted trip every student makes once. The **task
page** answers 'what do I bring' before you queue: documents, cost, time, where, and
the date the office last verified it."

### 10 · UI/UX decisions — 45 s   ← the graded one, do not rush
"Three decisions. **Five questions, not forty tasks**: the catalogue is about forty
items and nobody needs them all — a scholarship holder has extra steps, an exchange
student staying four months needs no ARC at all. **Choices, not free text**: programme
and visa type are dropdowns, not for tidiness but because the rules that decide which
tasks apply can only match clean values. And **one record, two languages**, which
cannot be published with one side empty — otherwise the Chinese version ends up two
years older than the English one."

### 11 · Data design — 35 s
"Five entities. Tasks carry both languages, the prerequisite, and the rule that
decides who sees them. Deadlines are stored as **offsets**, never dates: '15 days
after entry' becomes a real date per student, so one edit fixes the rule for
everyone. Progress is one row per student per task, private to them. Tips wait for
moderation. And the log records every edit."

### 12 · System design — 30 s
"Phone-first front end, Supabase behind it for database, authentication and
permissions, and the same back-office pattern I have been building in class — so the
technical risk of the final project is already retired. Permissions live in the
database: published tasks are public, a student's progress is readable only by that
student, only staff may edit the catalogue."

### 13 · Next — 30 s
"The next step is not code. It is interviewing five students who arrived this
semester and the international office, to check the task list and its order. Then
build the loop, then the back office, and test it with real arrivals in February —
the only honest test is someone landing at Taoyuan with the app open. My open
question for you: should the catalogue be owned by the office, or crowd-maintained by
students with moderation?"

---

## Likely questions

**Isn't this just the university's website?** The university publishes pages; this
publishes a *sequence*, personalised and dated. The information exists — what is
missing is the order, the deadline and whether it is still true.

**How do you keep it accurate?** Two mechanisms: the office owns the catalogue, and
every task carries a last-verified date, so staleness is visible rather than silent.
Students can flag a step as out of date.

**Why only FJCU?** Rules differ by university and by city office. One campus makes the
content verifiable; the data model already allows more later.

**What if a student lies on the intake?** They only hurt their own checklist — and
they can change the answers; the checklist regenerates.

**Why not an app in the stores?** A website works on day one, with no download, on
whatever phone they arrive with, and updates without an app-store review.

**Biggest risk?** Content, not code. Forty tasks verified in two languages is the real
work, which is why validation with the office comes before building.
