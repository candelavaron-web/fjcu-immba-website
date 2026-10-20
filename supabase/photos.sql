-- =============================================================
-- FJCU imMBA — link each faculty member to their photo
-- Run this AFTER uploading supabase/faculty-photos/ to the
-- "faculty-photos" bucket in Supabase Storage.
-- =============================================================

update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/01-yi-ning-tu.jpg' where name = 'Yi-Ning Tu';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/02-michael-t-s-lee.jpg' where name = 'Michael T. S. Lee';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/03-yaonan-lin.jpg' where name = 'Yaonan Lin';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/04-yu-ming-hsu.jpg' where name = 'Yu-Ming Hsu';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/05-chih-an-lin.jpg' where name = 'Chih-An Lin';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/06-kai-ping-huang.jpg' where name = 'Kai-Ping Huang';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/07-hsiang-ching-tseng.png' where name = 'Hsiang-Ching Tseng';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/08-mei-chun-lin.jpg' where name = 'Mei-Chun Lin';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/09-shu-ling-cheng.jpg' where name = 'Shu-Ling Cheng';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/10-pi-chan-hu.jpg' where name = 'Pi-Chan Hu';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/11-tsui-lin-chiang.jpg' where name = 'Tsui-Lin Chiang';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/12-shu-wen-lin.png' where name = 'Shu-wen Lin';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/13-meng-hsien-yen.jpg' where name = 'Meng-Hsien Yen';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/14-hao-hsin-hsu.png' where name = 'Hao-Hsin Hsu';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/15-kai-pin-huang.jpg' where name = 'Kai-Pin Huang';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/16-lai-ferry-sugianto.png' where name = 'Lai Ferry Sugianto';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/17-tsang-hsien-wang.png' where name = 'Tsang-Hsien Wang';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/18-chia-hua-lin.jpg' where name = 'Chia-Hua Lin';
update public.faculty set image_url = 'https://edyyjiccwhwbqnedoeoq.supabase.co/storage/v1/object/public/faculty-photos/19-hui-mei-wang.jpg' where name = 'Hui-Mei Wang';

-- check: every row should now have a photo
select count(*) filter (where image_url is not null) as with_photo,
       count(*) as total
  from public.faculty;
