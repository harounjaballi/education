\set ON_ERROR_STOP 0
-- seed (superuser)
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','admin@x','{"role":"super_admin"}','{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-0000000000b1','t1@x','{"role":"teacher"}','{"full_name":"Prof 1"}'),
 ('00000000-0000-0000-0000-0000000000b2','t2@x','{"role":"teacher"}','{}'),
 ('00000000-0000-0000-0000-0000000000c1','s1@x','{}','{"role":"super_admin"}'),
 ('00000000-0000-0000-0000-0000000000c2','s2@x','{}','{}');
\set A '00000000-0000-0000-0000-00000000000a'
\set T1 '00000000-0000-0000-0000-0000000000b1'
\set T2 '00000000-0000-0000-0000-0000000000b2'
\set S1 '00000000-0000-0000-0000-0000000000c1'
\set S2 '00000000-0000-0000-0000-0000000000c2'
select id, role from profiles order by email;
-- ===== Teacher 1 builds content
set role authenticated; select set_config('request.jwt.claim.sub', :'T1', false);
insert into classes(id,teacher_id,name) values ('10000000-0000-0000-0000-000000000001', :'T1','4 Info 1');
insert into classes(teacher_id,name) values (:'T2','HACK: class for T2');   -- expect RLS error
insert into enrollments(class_id,student_id) values ('10000000-0000-0000-0000-000000000001', :'S1');
insert into subjects(id,class_id,teacher_id,name) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',:'T1','Algo');
insert into courses(id,subject_id,teacher_id,title,is_published) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',:'T1','Cours 1',true);
insert into courses(subject_id,teacher_id,title) values ('20000000-0000-0000-0000-000000000001',:'T1','Brouillon');
insert into assignments(id,subject_id,teacher_id,title,is_published,due_at) values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',:'T1','Devoir 1',true, now()+interval '1 day');
insert into exams(id,subject_id,teacher_id,title,is_published,duration_minutes) values ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',:'T1','QCM 1',true,10);
insert into questions(id,exam_id,teacher_id,type,prompt,options,points) values
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',:'T1','single_choice','2+2 ?','[{"id":"a","label":"3"},{"id":"b","label":"4"}]',2),
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',:'T1','multiple_choice','Pairs ?','[{"id":"a","label":"2"},{"id":"b","label":"3"},{"id":"c","label":"4"}]',3);
insert into question_keys(question_id,teacher_id,correct_options) values
 ('60000000-0000-0000-0000-000000000001',:'T1','["b"]'),('60000000-0000-0000-0000-000000000002',:'T1','["a","c"]');
\echo '--- T1 sees students profiles (expect S1 + self):'
select email from profiles order by email;
-- ===== Teacher 2 isolation
select set_config('request.jwt.claim.sub', :'T2', false);
\echo '--- T2 sees classes/courses/exams/keys (expect 0 0 0 0):'
select (select count(*) from classes),(select count(*) from courses),(select count(*) from exams),(select count(*) from question_keys);
update courses set title='pwned';  -- 0 rows
insert into subjects(class_id,teacher_id,name) values ('10000000-0000-0000-0000-000000000001',:'T2','Intrus'); -- expect error
-- ===== Student 1
select set_config('request.jwt.claim.sub', :'S1', false);
\echo '--- S1 role (expect student despite user metadata):'
select role from profiles where id = auth.uid();
update profiles set role='super_admin', status='active' where id=auth.uid();
select role from profiles where id = auth.uid();
\echo '--- S1 sees courses (expect 1 published only), keys (0), questions before attempt (0):'
select (select count(*) from courses),(select count(*) from question_keys),(select count(*) from questions);
insert into submissions(assignment_id,student_id,content,status,score) values ('40000000-0000-0000-0000-000000000001',:'S1','ma copie','submitted',20);
\echo '--- S1 self-grade attempt (expect score null, submitted_at set):'
select status, score, submitted_at is not null as has_ts from submissions;
insert into exam_attempts(id,exam_id,student_id,deadline_at) values ('70000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',:'S1', now()+interval '10 years');
\echo '--- deadline forced to ~10 min (expect true):'
select deadline_at < now()+interval '11 minutes' from exam_attempts;
insert into exam_attempts(exam_id,student_id) values ('50000000-0000-0000-0000-000000000001',:'S1'); -- max_attempts=1 → error
\echo '--- questions now visible (expect 2):'
select count(*) from questions;
insert into answers(attempt_id,question_id,student_id,response,is_correct,points_awarded) values
 ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',:'S1','["b"]',true,999),
 ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',:'S1','["c"]',true,999);
\echo '--- self-graded answers stripped (expect nulls):'
select is_correct, points_awarded from answers order by question_id;
select status, score, max_score from submit_exam_attempt('70000000-0000-0000-0000-000000000001');
select submit_exam_attempt('70000000-0000-0000-0000-000000000001'); -- already submitted
update answers set response='["a","c"]'; -- after submit: 0 rows
\echo '--- final answers:'
select question_id, is_correct, points_awarded from answers order by question_id;
insert into messages(sender_id,recipient_id,body) values (:'S1',:'T1','Bonjour prof');
insert into messages(sender_id,recipient_id,body) values (:'S1',:'T2','spam'); -- no shared class → error
-- ===== Student 2 not enrolled
select set_config('request.jwt.claim.sub', :'S2', false);
\echo '--- S2 sees nothing (expect 0 0 0 0):'
select (select count(*) from courses),(select count(*) from assignments),(select count(*) from exams),(select count(*) from profiles where id<>auth.uid());
insert into exam_attempts(exam_id,student_id) values ('50000000-0000-0000-0000-000000000001',:'S2'); -- error
-- ===== T1 grades submission
select set_config('request.jwt.claim.sub', :'T1', false);
update submissions set score=15, feedback='Bien', status='graded';
select score, status, graded_by = auth.uid() from submissions;
-- ===== suspended teacher loses access
reset role; update profiles set status='suspended' where id=:'T1'; set role authenticated;
\echo '--- suspended T1 sees classes (expect 0):'
select count(*) from classes;
-- ===== storage
reset role; insert into documents(lesson_id,teacher_id,name,storage_path) select null,null,null,null where false;
\echo '--- admin sees all classes (expect 1):'
select set_config('request.jwt.claim.sub', :'A', false); set role authenticated;
select count(*) from classes;
