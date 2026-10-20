-- =============================================================
-- FJCU imMBA — announcements (AI-ADPD class #5)
-- Run this in the Supabase SQL Editor after schema.sql.
-- One record holds both languages, as required by the brief.
-- =============================================================

create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  published_on date not null default current_date,  -- shared field: date
  category    text not null default 'notice'
              check (category in ('admissions', 'academics', 'partners', 'community', 'notice')),
  link_url    text,                                  -- shared field: link
  image_url   text,
  status      text not null default 'published'      -- shared field: display status
              check (status in ('draft', 'published')),
  sort_order  integer not null default 0,
  title_en    text not null,
  title_zh    text,
  summary_en  text,
  summary_zh  text,
  body_en     text,
  body_zh     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists news_date_idx on public.news (published_on desc);

drop trigger if exists news_touch_updated_at on public.news;
create trigger news_touch_updated_at
  before update on public.news
  for each row execute function public.touch_updated_at();

-- Row level security: everyone reads published items, admins manage them.
alter table public.news enable row level security;

drop policy if exists "published news are viewable by everyone" on public.news;
create policy "published news are viewable by everyone"
  on public.news for select
  using (status = 'published' or public.is_admin());

drop policy if exists "admins manage news" on public.news;
create policy "admins manage news"
  on public.news for all
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------
-- Seed: the announcements currently published on the website,
-- taken from the official imMBA news page.
-- -------------------------------------------------------------
insert into public.news
  (published_on, category, link_url, image_url, sort_order,
   title_en, title_zh, summary_en, summary_zh, body_en, body_zh)
values
  ('2026-09-15', 'admissions', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=422', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=70', 0, 'International students: get to know Fu Jen imMBA at our info session', '外籍生招生說明會：認識輔大國際經管 imMBA', 'Join us on Oct. 1 at noon. Free lunch for registered attendees — register by Sep. 29.', '10/1（四）中午舉行，報名並出席享免費午餐，報名截止 9/29。', 'Fu Jen''s International Management MBA (imMBA) is hosting an information session for international students on October 1.

If you have a bachelor''s degree (or are currently a junior or senior) and a TOEIC score of 700+ or equivalent English proficiency, come learn about imMBA.

Study in a fully English-taught environment with students from around the world, explore four scholarship opportunities, and pursue dual master''s degrees in the U.S., Spain or France.

<strong>Oct. 1 (Thu.) at noon</strong> · location emailed after registration closes · free lunch for registered attendees (limited) · registration deadline: <strong>Sep. 29 (Tue.)</strong>

<a href="https://docs.google.com/forms/d/e/1FAIpQLScTzMabBstLOquE0PlHaHCoCVM89Nc9VRpLO-JLLFA1A4v0-w/viewform" target="_blank" rel="noopener">Register via Google Form</a>. The session will be conducted in English.', '國際經管 imMBA 將於 10 月 1 日舉辦外籍生招生說明會，介紹外籍生申請 imMBA 的招生管道與學習機會。

如果你或身邊的外籍朋友已取得學士學位（或目前為大三、大四學生），並具 TOEIC 700 分以上或同級英語能力，歡迎來認識 imMBA。

imMBA 採全英語授課，與來自不同國家的學生一起學習；另有四類獎學金機會，以及前往美國、西班牙、法國攻讀雙碩士學位的選擇。

<strong>10/1（四）中午</strong>・地點於報名截止後 Email 通知・報名並出席享免費午餐（數量有限）・報名截止：<strong>9/29（二）</strong>

<a href="https://docs.google.com/forms/d/e/1FAIpQLScTzMabBstLOquE0PlHaHCoCVM89Nc9VRpLO-JLLFA1A4v0-w/viewform" target="_blank" rel="noopener">線上報名表單</a>。本場說明會以英文進行。'),
  ('2026-09-08', 'admissions', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=421', 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=1200&q=70', 10, 'How much is possible in two years?', '碩士兩年，可以有多大可能？', 'Local admissions info session: Sep. 29, 12:10 PM, LM202 Meeting Room.', '116 學年度甄試招生說明會：9/29（二）12:10，LM202 會議室。', 'If you''re choosing a graduate program, you may be looking for more than just a master''s degree.

imMBA offers a fully English-taught environment where you study with students from around the world, gain cross-cultural experience and build an international network — with opportunities to study abroad.

What is imMBA all about? Who is it for? Join us and discover where imMBA could take you.

<strong>Fu Jen imMBA 2027 Admissions Information Session</strong> — September 29 (Tue.), 12:10 PM, LM202 Meeting Room.', '如果你正在思考該怎麼選研究所，你期待的，也許不只是一張碩士文憑。

國際經管 imMBA 全英的學習環境，讓你和來自不同國家的同學一起上課，累積跨文化經驗與國際人脈；研究所兩年，還能透過跨國學習為自己打開更多可能。

imMBA 在學什麼？適合什麼樣的學生？歡迎來認識 imMBA，也許你會發現一條更加開闊的道路。

<strong>國際經管 imMBA 116 學年度甄試招生說明會</strong>：9/29（二）12:10，LM202 會議室。'),
  ('2026-09-02', 'academics', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=420', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=70', 20, '90 Seconds with the Professor | AI × Product', '90 Seconds with the Professor｜AI × Product', 'Our professor introduces AI-Assisted Digital Product Development in just 90 seconds.', '授課老師用 90 秒介紹新課 AI-Assisted Digital Product Development。', 'What is AI-Assisted Digital Product Development all about? Starting with a business idea, how can AI support the development of a digital product?

In just 90 seconds, our professor introduces the course and the key ideas behind AI × Product.

<a href="https://www.facebook.com/profile.php?id=61579964994616" target="_blank" rel="noopener">Watch the video on Facebook</a>', 'AI-Assisted Digital Product Development 到底在學什麼？從一個商業點子出發，AI 可以如何參與數位產品開發？

這次交給授課老師，用 90 秒帶你快速掌握 AI × Product 的學習重點。

<a href="https://www.facebook.com/profile.php?id=61579964994616" target="_blank" rel="noopener">前往 Facebook 觀看影片</a>'),
  ('2026-08-26', 'academics', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=419', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=70', 30, 'New course spotlight | Data Analytics for International Business', '新課介紹｜Data Analytics for International Business', 'Data visualization, statistics and machine learning applied to real business contexts.', '從資料視覺化、統計分析到機器學習，應用於真實商業情境。', 'Last week we explored AI × Product. This week we look at AI × Data — and how data supports better business decisions.

This academic year imMBA introduces <strong>Data Analytics for International Business</strong>, covering data collection, visualization, statistical analysis and machine learning applied to macroeconomics, industries, market segmentation, cross-border operations and social media.

From AI × Product to AI × Data, the two new courses help business students build the skills to solve problems and make better decisions in the AI era.', '上週的新課介紹從 AI × Product 出發，本週則從 AI × Data 的角度，看看數據如何成為商業決策的重要線索。

本學年國際經管新開設 <strong>Data Analytics for International Business</strong>，從資料蒐集、整理與視覺化開始，進一步學習統計分析與機器學習，並運用在總體經濟、產業、市場區隔、跨國營運及社群媒體等商業情境。

兩門新課從不同角度回應 AI 帶來的改變，讓商管學生具備更多解決問題與做出決策的能力。'),
  ('2026-08-19', 'admissions', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=187', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=70', 40, 'Spring 2027 applications open: Sep 14 – Oct 14 (international students)', 'Spring 2027 外籍生招生開放申請（9/14–10/14）', 'Apply online and submit the required documents. This track is open to international students only.', '即日起線上申請並上傳文件，本管道限外籍學生。', '<strong>When to apply:</strong> September 14 – October 14.

<strong>How to apply:</strong> apply online through the FJCU international admissions system and submit the required documents.

<strong>Required documents:</strong></p><ol><li>Certificate or diploma of your highest degree</li><li>Complete academic transcripts for each year of study</li><li>A financial statement showing sufficient funds to study in Taiwan</li><li>Receipt for the application fee</li><li>Verification of nationality</li><li>Declaration form (downloadable from the application system)</li><li>Two recommendation letters</li><li>English proficiency results</li><li>A biography with a study plan</li><li>Any other materials that may support your application</li></ol><p>

For full details see the <a href="admissions.html">How to Apply</a> page.', '<strong>申請期間：</strong>9 月 14 日至 10 月 14 日。

<strong>申請方式：</strong>於輔仁大學外籍生招生系統線上申請並上傳文件。

<strong>應備文件：</strong></p><ol><li>最高學歷證書</li><li>歷年成績單</li><li>足以在台就學之財力證明</li><li>報名費收據</li><li>國籍證明</li><li>聲明書（於申請系統下載）</li><li>推薦信兩封</li><li>英語能力證明</li><li>自傳暨讀書計畫</li><li>其他有助審查之資料</li></ol><p>

詳細資訊請見<a href="admissions.html">申請入學</a>頁面。'),
  ('2026-08-19', 'academics', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=418', 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=70', 50, 'New course spotlight | AI-Assisted Digital Product Development', '新課介紹｜AI-Assisted Digital Product Development', 'Turn a business idea into a working digital product — even without coding experience.', '不會寫程式，也能把商業點子做成可以使用的數位產品。', 'Want to turn a business idea into a working digital product — even without coding experience?

This semester imMBA introduces <strong>AI-Assisted Digital Product Development</strong>, where students learn product design, web and feature development and data management while building a functional digital product.

As AI reshapes the business world, this course equips business students to apply AI and solve real-world problems.', '不會寫程式，也能把一個商業點子做成真正可以使用的數位產品嗎？

本學期國際經管新開設 <strong>AI-Assisted Digital Product Development</strong>，帶領學生運用 AI 學習產品設計、網頁與功能建置、資料管理，最後實際做出可展示與操作的數位產品。

在 AI 快速改變商業世界的今天，培養商管學生運用 AI 解決問題的能力。'),
  ('2026-08-05', 'notice', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=416', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=70', 60, 'Summer pause: office closed for one week', 'Summer Pause：辦公室暑休一週', 'Emails received during the university-wide break will be answered from August 17.', '全校共休期間來信，將於 8/17 恢復上班後依序回覆。', 'Every August, Fu Jen Catholic University takes a one-week summer recess, giving the campus a chance to slow down before the new semester.

The imMBA Office will be closed next week. Emails received during the break will be answered after the office reopens on <strong>August 17</strong>. Enjoy the summer!', '輔大每年八月都有全校共休一週的傳統，為忙碌的節奏按下暫停鍵，也呼應天主教教育重視反思與身心平衡的精神。

下週適逢學校共休，國際經管辦公室將暫停服務一週。休假期間收到的來信，將於 <strong>8/17</strong> 恢復上班後依序回覆。祝大家暑假愉快！'),
  ('2026-07-29', 'partners', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=415', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=70', 70, 'Partner spotlight | IQS School of Management, Barcelona', '合作夥伴介紹｜西班牙 IQS 管理學院', 'Spend your second year in Barcelona and earn a master''s degree from both universities.', '碩二前往巴塞隆納，取得兩校碩士學位。', 'Barcelona is known for its architecture and vibrant culture — and it is also one of Europe''s leading hubs for innovation and entrepreneurship.

IQS School of Management is part of IQS, a founding member of Universitat Ramon Llull. Founded in 1905 and AACSB-accredited, it integrates management, technology and innovation.

Through the imMBA 1+1 Dual Master''s Degree, students may spend their second year at IQS, choosing between the Master in Industrial Business Management and the Master in International Marketing in a Digital Environment. imMBA dual-degree students are eligible for a tuition discount at IQS.

<a href="dual-degree.html#iqs">Learn more about the dual degree with IQS</a>', '提到西班牙，你可能會想到巴塞隆納的建築與文化；對商管學生而言，這座城市也是歐洲重要的創新與創業據點。

IQS School of Management 隸屬拉孟大學創始成員 IQS，創立於 1905 年並通過 AACSB 認證，結合管理、科技與創新。

國際經管學生可透過跨國雙碩士計畫，於碩二前往 IQS 修讀 Industrial Business Management 或 International Marketing in a Digital Environment，完成兩校規定即可取得雙學位，並享學費優惠。

<a href="dual-degree.html#iqs">了解 IQS 雙碩士計畫</a>'),
  ('2026-07-22', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=413', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=70', 80, 'What kind of leaders should we cultivate in a rapidly changing world?', '當世界快速變動，我們該培養什麼樣的領導者？', 'Reflections from the 2026 IAJBS World Forum: Disruption as a Catalyst for the Common Good.', '2026 IAJBS World Forum：以變革作為促進共同福祉的催化劑。', 'AI, sustainability, geopolitics and global industries are reshaping our world at an unprecedented pace.

Under the theme “Disruption as a Catalyst for the Common Good”, the 2026 IAJBS World Forum brought together Jesuit business schools worldwide to explore how business education can cultivate leaders with professional excellence, ethical judgment and a commitment to the common good.

Our mission is to prepare globally competitive professionals who are also reflective, compassionate and socially responsible leaders.', 'AI、永續、地緣政治與全球產業正以前所未有的速度改變世界。

今年 IAJBS World Forum 以「Disruption as a Catalyst for the Common Good」為主題，邀集全球耶穌會商學院，探討商管教育如何培育兼具專業、領導力與社會責任的人才。

我們期待培養的不只是具全球競爭力的商管人才，更是擁有國際視野、反思能力與社會責任的未來領袖。'),
  ('2026-07-15', 'partners', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=411', 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=70', 90, 'Across the Pacific: one more global partner', '跨越太平洋，國際夥伴再＋1', 'College of Management visits Cal Poly Pomona to discuss a future 1+1 dual master''s degree.', '管理學院拜訪美國加州州立理工大學波莫納分校，洽談 1+1 雙碩士。', 'Faculty from Fu Jen''s College of Management visited sister school California State Polytechnic University, Pomona (CPP) to discuss collaboration, including a possible 1+1 dual master''s degree for imMBA.

CPP''s College of Business Administration holds AACSB accreditation in business and accounting and is known for its Learn by Doing approach.

Both institutions will continue discussions on curriculum alignment, credit transfer and program planning.', '輔仁大學管理學院師長前往美國拜訪姊妹校 California State Polytechnic University, Pomona（CPP），討論未來推動 1+1 雙碩士學位的可能性。

CPP 商學院具 AACSB 商管及會計雙重認證，並以 Learn by Doing 的教學理念聞名。

雙方將持續討論課程銜接、學分承認與學程規劃。'),
  ('2026-07-07', 'partners', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=410', 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=70', 100, 'Building new global partnerships: Macquarie University visits', '拓展國際夥伴：澳洲麥覺理大學來訪', 'Discussions on a 1+1 dual master''s degree, student exchange and future collaboration.', '雙方就 1+1 雙碩士、學生交換與未來合作進行交流。', 'Macquarie University visited the College of Management to discuss a 1+1 dual master''s degree, student exchange and future collaboration with imMBA.

Located in Sydney, Macquarie''s business school holds AACSB and AMBA accreditations, with strong recognition in finance, marketing and business analytics.', '澳洲麥覺理大學（Macquarie University）拜訪輔大管理學院，與國際經管洽談 1+1 雙碩士、學生交換與未來合作。

麥覺理大學位於雪梨，商學院具 AACSB 與 AMBA 認證，在財務、行銷與商業分析領域備受肯定。'),
  ('2026-06-30', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=409', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=70', 110, 'Business insights | What are the SDGs?', '商業觀點｜什麼是 SDGs？', 'FJCU ranked 5th in Taiwan in the 2026 THE Impact Rankings and No. 1 in Taiwan for SDG 4, 5 and 11.', '輔大於 2026 THE 影響力排名全台第 5，SDG 4、5、11 全台第一。', 'The Sustainable Development Goals (SDGs) are 17 global goals adopted by the United Nations in 2015, covering areas such as quality education, gender equality, sustainable cities and climate action.

In the 2026 THE Impact Rankings, Fu Jen Catholic University ranked 101–200 globally and 5th in Taiwan, and No. 1 in Taiwan for SDG 4, SDG 5 and SDG 11.', '永續發展目標（SDGs）是聯合國於 2015 年通過的 17 項全球目標，涵蓋優質教育、性別平等、永續城市與氣候行動等領域。

在 2026 THE 世界大學影響力排名中，輔仁大學全球 101–200 名、全台第 5，並於 SDG 4、SDG 5、SDG 11 位居全台第一。'),
  ('2026-06-24', 'academics', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=407', 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=70', 120, 'imMBA''s international learning environment starts with a four-Palme business school', '國際經管的國際化學習環境，來自四棕櫚商學院', 'FJCU College of Management awarded 4 Palmes of Excellence in the 2026 Eduniversal ranking.', '輔大管理學院獲 2026 Eduniversal 四棕櫚卓越商學院肯定。', 'According to the 2026 Eduniversal Business Schools Ranking, the Fu Jen College of Management has been awarded <strong>4 Palmes of Excellence</strong> — “Top Business Schools with Significant International Influence” — one of few business schools in Taiwan at this level.

Fully English-taught courses, a 1:1 ratio of local and international students, overseas exchange and dual-degree partnerships are all supported by the College''s international network.', '依據 2026 Eduniversal 全球商學院排名，輔大管理學院榮獲<strong>四棕櫚</strong>（具重要國際影響力之頂尖商學院）肯定，為台灣少數獲此等級之商學院。

國際經管的全英授課、本地生與國際生 1:1 合班、海外交換與雙碩士合作，皆奠基於管理學院豐沛的國際網絡與資源。'),
  ('2026-06-16', 'academics', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=406', 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1200&q=70', 130, 'What would you do with two weeks for self-directed learning?', '如果有兩週自主學習，你會做什麼？', 'Fu Jen''s 16+2 flexible semester: 16 weeks in class, 2 weeks to explore.', '輔大 16+2 彈性自主學習週：16 週課堂、2 週探索。', 'With 16 weeks of classroom learning and 2 weeks set aside for self-directed learning, students are encouraged to explore industry visits, professional development, personal projects or future goals.

Learning how to explore and grow independently is an important part of university life. Happy Dragon Boat Festival!', '輔大 16+2 彈性自主學習週：16 週課堂學習，加上 2 週自主學習，鼓勵學生走出教室，進行企業參訪、專業發展、個人專案或思考未來方向。

學會自主探索與成長，是大學生活很重要的一部分。祝大家端午節快樂！'),
  ('2026-06-09', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=403', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=70', 140, 'As you move forward, take a piece of Fu Jen with you', '帶著輔大的祝福，勇敢向前', 'Congratulations to our 2026 graduates — and their special graduation bears.', '恭喜 2026 畢業生，以及專屬的畢業小熊。', 'The theme of Fu Jen''s 2026 Commencement, “Truth, Goodness, Beauty, and Holiness: Embarking on Excellence”, marks a new chapter for this year''s graduates.

Master''s graduates from the College of Management received a special graduation bear — a keepsake of late-night projects, guiding professors and memories made at imMBA.', '輔仁大學 2026 年畢業典禮以「真善美聖・邁向卓越」為主題，為畢業生開啟人生新篇章。

今年管理學院碩士畢業生獲贈專屬畢業小熊，願它成為在 imMBA 熬夜討論、師長指導與同窗回憶的溫暖紀念。'),
  ('2026-06-03', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=402', 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=70', 150, 'Outdoor English Corner | Internationalization at home', '戶外英語角｜在地國際化', 'Students from Taiwan, India, Vietnam, Poland, Guatemala and more spent two days together in Yilan.', '來自台灣、印度、越南、波蘭、瓜地馬拉等地的學生，在宜蘭共度兩天。', 'Through the College of Management EMI Center, students from many cultural backgrounds — including many from imMBA — gathered in Yilan for a two-day Outdoor English Corner.

River tubing, ATV rides, archery, BBQs and conversations under the stars brought everyone closer. English was the bridge; laughter became a shared language.

As one participant put it: “I like the warm vibe.”', '由管理學院 EMI 中心發起，來自多元文化背景的學生（其中許多為 imMBA 同學）前往宜蘭參加兩天的戶外英語角。

溯溪、越野車、射箭、烤肉與星空下的聊天，讓大家自然拉近距離；英文是溝通的橋樑，笑聲則是共同語言。

一位參與者說：「I like the warm vibe.」'),
  ('2026-05-28', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=401', 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=70', 160, 'Conversations across cultures broaden the way we see the world', '跨文化對話，拓寬看世界的方式', 'imMBA student Jestin George Vazhayil shares stories from across India at English Corner.', 'imMBA 印度籍同學在英語角分享走訪印度各地的經驗。', 'At this English Corner event, organized by the College of Management EMI Center, Indian imMBA student Jestin George Vazhayil shared his experiences living and traveling across India — from Kerala to Mysore, Assam and Arunachal Pradesh.

Through interaction with people from different cultural backgrounds, students naturally develop a broader understanding of the world.', '在管理學院 EMI 中心舉辦的英語角活動中，imMBA 印度籍同學 Jestin George Vazhayil 分享他在印度各地生活與旅行的經驗，從喀拉拉邦到邁索爾、阿薩姆與阿魯納恰爾邦。

透過與不同文化背景的人互動，同學們自然培養出更寬廣的世界觀。'),
  ('2026-05-21', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=400', 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=1200&q=70', 170, 'Same Italy. Different people. A richer journey.', '同一個義大利，不同的人，更豐富的旅程', 'Reflections from the College of Management''s 2026 International Field Trip to Italy.', '管理學院 2026 義大利海外企業參訪心得。', 'Students on the 2026 International Field Trip to Italy came from different academic backgrounds, ages and life experiences — and those differences shaped the journey.

At the same company visit, some focused on branding and markets, others on management, technology, culture, data or fashion, taking discussions far beyond the itinerary.', '參加 2026 義大利海外參訪的同學來自不同科系、年齡與生活經驗，這些差異讓旅程更加豐富。

同一場企業參訪，有人關注品牌與市場，有人關注管理、科技、文化、數據或時尚，激盪出遠超行程本身的討論。'),
  ('2026-05-12', 'community', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=399', 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=1200&q=70', 180, 'A good learning environment helps everyone grow together', '好的學習氛圍，讓大家一起成長', 'imMBA Chair Dr. Yi-Ning Tu meets first-year and graduating students.', '杜逸寧主任與碩一新生及應屆畢業生座談。', 'Dr. Yi-Ning Tu, Chair of imMBA, recently met with first-year and graduating students. Both groups shared a strong sense of community.

Studying in an all-English environment takes time to adapt to — yet after one semester, first-year students were already comfortable with each other''s accents and humor.', '國際經管杜逸寧主任近日與碩一及應屆畢業生座談，兩個年級都展現出強烈的班級凝聚力與學習氛圍。

全英環境需要時間適應，但僅僅一學期，新生們已熟悉彼此的口音與幽默。'),
  ('2025-01-30', 'notice', 'https://www.management.fju.edu.tw/esubweb/immbaengindex/news-detail.php?NID=398', 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70', 190, 'College of Management career platform – job openings', '管理學院職涯平台－職缺資訊', 'Browse internship and job openings shared with College of Management students.', '查看提供給管理學院學生的實習與工作職缺。', 'Browse current openings on the <a href="https://www.management.fju.edu.tw/zh-tw/job/opening.php" target="_blank" rel="noopener">College of Management Career Platform</a>.', '請至<a href="https://www.management.fju.edu.tw/zh-tw/job/opening.php" target="_blank" rel="noopener">管理學院職涯平台</a>查看最新職缺。');
