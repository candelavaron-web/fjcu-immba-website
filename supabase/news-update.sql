-- =============================================================
-- FJCU imMBA — use the official photos and link the class post
-- Run this in the Supabase SQL Editor.
-- =============================================================

-- 1. Kickoff Lunch: the official photo from the imMBA news page
update public.news
   set image_url = 'assets/img/news/kickoff-lunch-2026.jpg'
 where title_en like 'imMBA Kickoff Lunch%';

-- 2. Fall 2027 admissions: the official photo of the Matteo Ricci
--    building lobby, from the imMBA learning environment page
--    (that announcement carries no photo of its own)
update public.news
   set image_url = 'assets/img/news/admissions-md-lobby.jpg'
 where title_en like 'Fall 2027 admissions%';

-- 3. "What I learnt this week": point View details at the page
--    written for it, and use the back-office screenshot
update public.news
   set link_url  = 'what-i-learnt.html',
       image_url = 'assets/img/news/back-office.png'
 where title_en like 'What I learnt this week%';

select published_on, title_en, image_url, link_url
  from public.news
 order by published_on desc
 limit 4;
