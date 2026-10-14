
-- Roles
create type public.app_role as enum ('admin', 'volunteer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  qualified boolean not null default false,
  guide_progress int not null default 0,
  quiz_passed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_qualified(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select qualified from public.profiles where id = _user_id), false)
$$;

create policy "Own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- New user: profile + role (first ever user becomes admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'volunteer');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin-only actions
create or replace function public.set_volunteer_qualified(_user_id uuid, _qualified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.profiles set qualified = _qualified,
    quiz_passed_at = case when _qualified then now() else quiz_passed_at end
  where id = _user_id;
end; $$;

create or replace function public.set_admin_role(_user_id uuid, _is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _is_admin then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  else
    if _user_id = auth.uid() then raise exception 'You cannot remove your own admin role'; end if;
    delete from public.user_roles where user_id = _user_id and role = 'admin';
  end if;
end; $$;

create or replace function public.touch_last_login()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_login_at = now() where id = auth.uid();
$$;

-- Children
create table public.children (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  age_band text not null,
  current_level int not null default 1 check (current_level between 1 and 3),
  communication_notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.children to authenticated;
grant all on public.children to service_role;
alter table public.children enable row level security;

create table public.child_assignments (
  child_id uuid not null references public.children(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  primary key (child_id, volunteer_id)
);
grant select, insert, delete on public.child_assignments to authenticated;
grant all on public.child_assignments to service_role;
alter table public.child_assignments enable row level security;

create or replace function public.can_access_child(_child_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin') or (
    public.is_qualified(auth.uid()) and exists (
      select 1 from public.child_assignments where child_id = _child_id and volunteer_id = auth.uid()))
$$;

create policy "Read assigned children" on public.children for select to authenticated using (public.can_access_child(id));
create policy "Admin manage children" on public.children for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Volunteer updates assigned child" on public.children for update to authenticated
  using (public.can_access_child(id)) with check (public.can_access_child(id));
create policy "Read own assignments" on public.child_assignments for select to authenticated
  using (volunteer_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin manage assignments" on public.child_assignments for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Content
create type public.content_status as enum ('draft', 'approved');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default 'CODA Toolkit Team',
  cover_url text,
  link_url text,
  level int not null check (level between 1 and 3),
  tags text[] not null default '{}',
  summary text not null default '',
  reading_time int not null default 10,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);
create table public.word_cards (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  word text not null,
  definition text not null,
  pronunciation text not null default '',
  example_sentence text not null default '',
  image_url text,
  sign_bank_url text,
  status content_status not null default 'draft',
  sort_order int not null default 0
);
create table public.discussion_prompts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  crowd_type text not null check (crowd_type in ('completion','recall','open_ended','wh','distancing')),
  prompt_text text not null,
  story_point text not null default 'middle' check (story_point in ('beginning','middle','end')),
  status content_status not null default 'draft'
);
grant select, insert, update, delete on public.books, public.word_cards, public.discussion_prompts to authenticated;
grant all on public.books, public.word_cards, public.discussion_prompts to service_role;
alter table public.books enable row level security;
alter table public.word_cards enable row level security;
alter table public.discussion_prompts enable row level security;

create policy "Qualified read approved books" on public.books for select to authenticated
  using (public.has_role(auth.uid(),'admin') or (status = 'approved' and public.is_qualified(auth.uid())));
create policy "Admin manage books" on public.books for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Qualified read approved words" on public.word_cards for select to authenticated
  using (public.has_role(auth.uid(),'admin') or (status = 'approved' and public.is_qualified(auth.uid())));
create policy "Admin manage words" on public.word_cards for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Qualified read approved prompts" on public.discussion_prompts for select to authenticated
  using (public.has_role(auth.uid(),'admin') or (status = 'approved' and public.is_qualified(auth.uid())));
create policy "Admin manage prompts" on public.discussion_prompts for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Sessions and records
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_minutes int not null,
  blocks jsonb not null default '[]',
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id),
  scheduled_at timestamptz not null default now(),
  book_id uuid references public.books(id),
  template_id uuid references public.session_templates(id),
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  created_at timestamptz not null default now()
);
create table public.tricky_words (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  word text not null,
  mastered boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question text not null,
  child_answer text not null,
  correct_answer text not null,
  word text,
  created_at timestamptz not null default now()
);
create table public.handover_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  engagement int not null check (engagement between 1 and 5),
  confidence int not null check (confidence between 1 and 5),
  level_fit text not null check (level_fit in ('too_easy','about_right','too_hard')),
  finished_book text not null check (finished_book in ('yes','partly','no')),
  worked_well text not null default '',
  try_next text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.session_templates, public.sessions, public.tricky_words, public.quiz_results, public.handover_feedback to authenticated;
grant all on public.session_templates, public.sessions, public.tricky_words, public.quiz_results, public.handover_feedback to service_role;
alter table public.session_templates enable row level security;
alter table public.sessions enable row level security;
alter table public.tricky_words enable row level security;
alter table public.quiz_results enable row level security;
alter table public.handover_feedback enable row level security;

create policy "Read shared or own templates" on public.session_templates for select to authenticated
  using (owner_id is null or owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Manage own templates" on public.session_templates for all to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "Sessions for accessible children" on public.sessions for all to authenticated
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Tricky words for accessible children" on public.tricky_words for all to authenticated
  using (public.can_access_child(child_id)) with check (public.can_access_child(child_id));
create policy "Quiz results for accessible sessions" on public.quiz_results for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_child(s.child_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_child(s.child_id)));
create policy "Handover for accessible sessions" on public.handover_feedback for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_child(s.child_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.can_access_child(s.child_id)));

-- Guide
create table public.guide_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  steps text[] not null default '{}',
  avoid_tip text not null default '',
  sort_order int not null default 0
);
create table public.guide_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options text[] not null,
  correct_index int not null,
  guide_card_id uuid references public.guide_cards(id) on delete set null,
  sort_order int not null default 0
);
grant select, insert, update, delete on public.guide_cards, public.guide_quiz_questions to authenticated;
grant all on public.guide_cards, public.guide_quiz_questions to service_role;
alter table public.guide_cards enable row level security;
alter table public.guide_quiz_questions enable row level security;
create policy "Anyone signed in reads guide" on public.guide_cards for select to authenticated using (true);
create policy "Admin manage guide" on public.guide_cards for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Anyone signed in reads quiz" on public.guide_quiz_questions for select to authenticated using (true);
create policy "Admin manage quiz" on public.guide_quiz_questions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Safeguarding (admin-only read)
create table public.safeguarding_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id),
  child_id uuid references public.children(id) on delete set null,
  details text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.safeguarding_reports to authenticated;
grant all on public.safeguarding_reports to service_role;
alter table public.safeguarding_reports enable row level security;
create policy "Anyone signed in can report" on public.safeguarding_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "Only admin reads reports" on public.safeguarding_reports for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- ===== Sample data (fake) =====
insert into public.children (nickname, age_band, current_level, communication_notes) values
 ('Child A','6-7',1,'Prefers sign support when tired.'),
 ('Child B','8-9',2,'Chatty; likes to point at pictures.'),
 ('Child C','10-11',3,'Confident reader; enjoys talking about family.');

insert into public.books (id, title, level, tags, summary, reading_time, status) values
 ('00000000-0000-0000-0000-0000000000b1','Mum''s Hands Talk',1,'{deaf family,family}','Lily watches her mum''s hands tell stories at bedtime.',8,'approved'),
 ('00000000-0000-0000-0000-0000000000b2','The Red Kite',1,'{outdoors,friendship}','Sam and his friend fly a red kite on a windy day.',8,'approved'),
 ('00000000-0000-0000-0000-0000000000b3','Bao and the Big Rain',1,'{weather,animals}','Bao the cat hides from a big rainstorm.',7,'approved'),
 ('00000000-0000-0000-0000-0000000000b4','Who Is at the Door?',1,'{deaf family,home}','A light flashes when someone rings the bell at Ana''s home.',8,'approved'),
 ('00000000-0000-0000-0000-0000000000b5','Lunch at the Hawker Centre',1,'{Singapore,food}','Jun picks his favourite food at the hawker centre.',9,'approved'),
 ('00000000-0000-0000-0000-0000000000b6','Mia Helps at the Bank',2,'{CODA,family,helping}','Mia helps her deaf dad talk to the bank teller, and learns big new words.',12,'approved'),
 ('00000000-0000-0000-0000-0000000000b7','The Lost Library Card',2,'{school,mystery}','Priya searches everywhere for her missing library card.',12,'approved'),
 ('00000000-0000-0000-0000-0000000000b8','Grandpa''s Garden Signs',2,'{deaf family,nature}','Grandpa teaches Wei the signs for every plant in his garden.',13,'approved'),
 ('00000000-0000-0000-0000-0000000000b9','Ravi''s Rainy Day Race',2,'{sport,weather}','Ravi keeps running in the school race even when it rains.',11,'approved'),
 ('00000000-0000-0000-0000-000000000b10','The Night Market Lantern',2,'{Singapore,festival}','Mei Ling chooses a lantern at the busy night market.',12,'approved'),
 ('00000000-0000-0000-0000-000000000b11','Two Languages, One Me',3,'{CODA,identity}','Aisha speaks at school and signs at home, and learns both make her who she is.',18,'approved'),
 ('00000000-0000-0000-0000-000000000b12','The Quiet Concert',3,'{deaf culture,music}','Daniel takes his deaf mum to a concert where everyone feels the music.',18,'approved'),
 ('00000000-0000-0000-0000-000000000b13','Captain Lin and the Sea Turtle',3,'{adventure,animals}','Captain Lin rescues a sea turtle caught in a net.',17,'approved'),
 ('00000000-0000-0000-0000-000000000b14','When the Phone Rings',3,'{CODA,family,feelings}','Ken answers calls for his parents and learns it is okay to ask for help.',19,'approved'),
 ('00000000-0000-0000-0000-000000000b15','The Secret of the Island Cave',3,'{adventure,mystery}','Two cousins explore a cave and find an old map.',20,'approved');

insert into public.word_cards (book_id, word, definition, pronunciation, example_sentence, sort_order, status, sign_bank_url)
select b, w, d, p, e, o, 'approved', 'https://aslsignbank.haskins.yale.edu/signs/search/?search=' || w from (values
 ('00000000-0000-0000-0000-0000000000b1'::uuid,'hands','The parts at the end of your arms that you use to hold things.','handz','Mum waves her hands to say hello.',1),
 ('00000000-0000-0000-0000-0000000000b1','story','Words that tell about things that happen.','STOR-ee','Mum tells a story every night.',2),
 ('00000000-0000-0000-0000-0000000000b1','bedtime','The time when you go to sleep.','BED-time','At bedtime, Lily hugs her teddy.',3),
 ('00000000-0000-0000-0000-0000000000b1','sign','To talk using your hands.','syne','Lily can sign "I love you".',4),
 ('00000000-0000-0000-0000-0000000000b1','smile','When your mouth curves up because you are happy.','smyle','Mum has a big smile.',5),
 ('00000000-0000-0000-0000-0000000000b2','kite','A toy that flies in the wind on a long string.','kyte','The kite went up high.',1),
 ('00000000-0000-0000-0000-0000000000b2','wind','Air that moves fast outside.','wind','The wind pushed the kite.',2),
 ('00000000-0000-0000-0000-0000000000b2','string','A long, thin rope.','string','Sam held the string tight.',3),
 ('00000000-0000-0000-0000-0000000000b2','high','Far up from the ground.','hy','Birds fly high in the sky.',4),
 ('00000000-0000-0000-0000-0000000000b2','friend','Someone you like and play with.','frend','Sam''s friend laughed.',5),
 ('00000000-0000-0000-0000-0000000000b3','rain','Water that falls from clouds.','rayn','The rain went drip, drop.',1),
 ('00000000-0000-0000-0000-0000000000b3','cat','A small furry pet that says meow.','kat','Bao is a grey cat.',2),
 ('00000000-0000-0000-0000-0000000000b3','hide','To go where no one can see you.','hyde','Bao likes to hide under the bed.',3),
 ('00000000-0000-0000-0000-0000000000b3','thunder','A loud boom in a storm.','THUN-der','The thunder was very loud.',4),
 ('00000000-0000-0000-0000-0000000000b3','dry','Not wet.','dry','The towel made Bao dry.',5),
 ('00000000-0000-0000-0000-0000000000b4','door','The thing you open to go into a room or house.','dor','Ana opened the door.',1),
 ('00000000-0000-0000-0000-0000000000b4','light','Something that helps you see; it can be bright.','lyte','The light flashed on and off.',2),
 ('00000000-0000-0000-0000-0000000000b4','flash','To shine quickly, on and off.','flash','The lamp will flash when the bell rings.',3),
 ('00000000-0000-0000-0000-0000000000b4','visitor','Someone who comes to see you.','VIZ-it-er','Our visitor brought a cake.',4),
 ('00000000-0000-0000-0000-0000000000b4','knock','To hit a door to let people know you are there.','nok','Grandma will knock three times.',5),
 ('00000000-0000-0000-0000-0000000000b5','hungry','When your tummy wants food.','HUNG-gree','Jun was very hungry.',1),
 ('00000000-0000-0000-0000-0000000000b5','noodles','Long, thin food made from flour.','NOO-dlz','He slurped his noodles.',2),
 ('00000000-0000-0000-0000-0000000000b5','stall','A small shop that sells food.','stawl','The chicken rice stall has a long line.',3),
 ('00000000-0000-0000-0000-0000000000b5','share','To give some of what you have to others.','shair','Jun will share his drink.',4),
 ('00000000-0000-0000-0000-0000000000b5','table','Furniture with a flat top where you eat.','TAY-bul','We sat at a round table.',5),
 ('00000000-0000-0000-0000-0000000000b6','bank','A place that keeps money safe.','bank','Dad keeps his money at the bank.',1),
 ('00000000-0000-0000-0000-0000000000b6','teller','A person at the bank who helps with money.','TEL-er','The teller smiled at Mia.',2),
 ('00000000-0000-0000-0000-0000000000b6','account','A record of your money at a bank.','uh-KOWNT','Dad opened a new account.',3),
 ('00000000-0000-0000-0000-0000000000b6','interpret','To change words from one language into another.','in-TER-prit','Mia helped interpret for Dad.',4),
 ('00000000-0000-0000-0000-0000000000b6','patient','Able to wait calmly.','PAY-shunt','The teller was patient with them.',5),
 ('00000000-0000-0000-0000-0000000000b7','library','A place with lots of books to borrow.','LY-brer-ee','Priya loves the library.',1),
 ('00000000-0000-0000-0000-0000000000b7','borrow','To take something and give it back later.','BOR-oh','You can borrow three books.',2),
 ('00000000-0000-0000-0000-0000000000b7','search','To look carefully for something.','serch','She searched under her bed.',3),
 ('00000000-0000-0000-0000-0000000000b7','clue','Something that helps you solve a problem.','kloo','The sticky note was a clue.',4),
 ('00000000-0000-0000-0000-0000000000b7','relieved','Feeling better after a worry goes away.','ri-LEEVD','Priya felt relieved.',5),
 ('00000000-0000-0000-0000-0000000000b8','garden','A place where plants and flowers grow.','GAR-den','Grandpa waters his garden.',1),
 ('00000000-0000-0000-0000-0000000000b8','seed','A tiny thing that grows into a plant.','seed','Wei planted a seed.',2),
 ('00000000-0000-0000-0000-0000000000b8','soil','The dirt that plants grow in.','soyl','The soil was soft and dark.',3),
 ('00000000-0000-0000-0000-0000000000b8','gentle','Soft and careful.','JEN-tul','Be gentle with the leaves.',4),
 ('00000000-0000-0000-0000-0000000000b8','bloom','When a flower opens.','bloom','The orchid will bloom soon.',5),
 ('00000000-0000-0000-0000-0000000000b9','race','A contest to see who is fastest.','rays','Ravi ran in the race.',1),
 ('00000000-0000-0000-0000-0000000000b9','puddle','A small pool of water on the ground.','PUD-ul','He splashed in a puddle.',2),
 ('00000000-0000-0000-0000-0000000000b9','slippery','Easy to slide on.','SLIP-er-ee','The track was slippery.',3),
 ('00000000-0000-0000-0000-0000000000b9','cheer','To shout happily for someone.','cheer','His class cheered for him.',4),
 ('00000000-0000-0000-0000-0000000000b9','finish','To come to the end.','FIN-ish','Ravi did finish the race.',5),
 ('00000000-0000-0000-0000-000000000b10','lantern','A light with a cover you can carry.','LAN-tern','Mei Ling held a rabbit lantern.',1),
 ('00000000-0000-0000-0000-000000000b10','market','A place where people buy and sell things.','MAR-kit','The market was busy.',2),
 ('00000000-0000-0000-0000-000000000b10','crowd','Lots of people together.','krowd','A crowd watched the show.',3),
 ('00000000-0000-0000-0000-000000000b10','glow','To shine with soft light.','gloh','The lanterns glow at night.',4),
 ('00000000-0000-0000-0000-000000000b10','choose','To pick one thing.','chooz','It was hard to choose.',5),
 ('00000000-0000-0000-0000-000000000b11','language','The words or signs people use to talk.','LANG-gwij','Aisha uses two languages.',1),
 ('00000000-0000-0000-0000-000000000b11','identity','Who you are and what makes you, you.','eye-DEN-ti-tee','Being a CODA is part of her identity.',2),
 ('00000000-0000-0000-0000-000000000b11','proud','Feeling good about who you are or what you did.','prowd','She felt proud of her family.',3),
 ('00000000-0000-0000-0000-000000000b11','between','In the middle of two things.','bi-TWEEN','She felt between two worlds.',4),
 ('00000000-0000-0000-0000-000000000b11','belong','To feel you are part of a group.','bi-LONG','Everyone wants to belong.',5),
 ('00000000-0000-0000-0000-000000000b12','concert','A show where people play music.','KON-sert','They went to a concert.',1),
 ('00000000-0000-0000-0000-000000000b12','vibration','A shaking you can feel.','vy-BRAY-shun','Mum felt the vibration of the drums.',2),
 ('00000000-0000-0000-0000-000000000b12','rhythm','A pattern of beats in music.','RITH-um','Clap to the rhythm.',3),
 ('00000000-0000-0000-0000-000000000b12','audience','The people watching a show.','AW-dee-ens','The audience waved their hands.',4),
 ('00000000-0000-0000-0000-000000000b12','applause','Clapping to show you enjoyed something.','uh-PLAWZ','Deaf audiences may wave for applause.',5),
 ('00000000-0000-0000-0000-000000000b13','captain','The leader of a ship.','KAP-tin','Captain Lin steered the boat.',1),
 ('00000000-0000-0000-0000-000000000b13','turtle','A sea animal with a hard shell.','TER-tul','The turtle swam away.',2),
 ('00000000-0000-0000-0000-000000000b13','tangled','Twisted up and stuck.','TANG-guld','The turtle was tangled in a net.',3),
 ('00000000-0000-0000-0000-000000000b13','rescue','To save someone from danger.','RES-kyoo','They worked together to rescue it.',4),
 ('00000000-0000-0000-0000-000000000b13','ocean','A very big sea.','OH-shun','The ocean was calm and blue.',5),
 ('00000000-0000-0000-0000-000000000b14','message','Words you send to someone.','MES-ij','Ken took a message.',1),
 ('00000000-0000-0000-0000-000000000b14','responsible','Trusted to do something important.','ri-SPON-si-bul','Ken felt very responsible.',2),
 ('00000000-0000-0000-0000-000000000b14','overwhelmed','Feeling that something is too much.','oh-ver-WELMD','The long call left him overwhelmed.',3),
 ('00000000-0000-0000-0000-000000000b14','appointment','A time set to meet someone.','uh-POINT-ment','Mum has a doctor''s appointment.',4),
 ('00000000-0000-0000-0000-000000000b14','advice','Ideas to help you decide what to do.','ad-VYSE','His teacher gave good advice.',5),
 ('00000000-0000-0000-0000-000000000b15','cave','A big hole in the side of a hill or rock.','kayv','The cave was dark inside.',1),
 ('00000000-0000-0000-0000-000000000b15','map','A drawing that shows where places are.','map','The map had an X on it.',2),
 ('00000000-0000-0000-0000-000000000b15','cousin','The child of your aunt or uncle.','KUZ-in','Tom explored with his cousin.',3),
 ('00000000-0000-0000-0000-000000000b15','echo','A sound that bounces back to you.','EK-oh','Their voices made an echo.',4),
 ('00000000-0000-0000-0000-000000000b15','brave','Able to do something even when scared.','brayv','They were brave in the dark.',5)
) as t(b,w,d,p,e,o);

insert into public.discussion_prompts (book_id, crowd_type, prompt_text, story_point, status)
select b, c, t, s, 'approved' from (values
 ('00000000-0000-0000-0000-0000000000b1'::uuid,'completion','Mum''s hands can tell a ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b1','wh','What story did Mum tell?','middle'),
 ('00000000-0000-0000-0000-0000000000b1','recall','What did Lily do at bedtime?','end'),
 ('00000000-0000-0000-0000-0000000000b1','open_ended','Look at this picture. What is happening?','middle'),
 ('00000000-0000-0000-0000-0000000000b1','distancing','What is a sign you know? Can you show me?','end'),
 ('00000000-0000-0000-0000-0000000000b2','completion','The kite went up ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b2','wh','What colour is the kite?','beginning'),
 ('00000000-0000-0000-0000-0000000000b2','recall','What happened when the wind stopped?','end'),
 ('00000000-0000-0000-0000-0000000000b2','open_ended','Tell me about this picture.','middle'),
 ('00000000-0000-0000-0000-0000000000b2','distancing','What do you like to play outside?','end'),
 ('00000000-0000-0000-0000-0000000000b3','completion','Bao does not like the ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b3','wh','Where did Bao hide?','middle'),
 ('00000000-0000-0000-0000-0000000000b3','recall','How did Bao get dry?','end'),
 ('00000000-0000-0000-0000-0000000000b3','open_ended','How do you think Bao feels here?','middle'),
 ('00000000-0000-0000-0000-0000000000b3','distancing','What do you do when it rains?','end'),
 ('00000000-0000-0000-0000-0000000000b4','completion','When the bell rings, the light will ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b4','wh','Who was at the door?','middle'),
 ('00000000-0000-0000-0000-0000000000b4','recall','How did Ana''s family know someone was there?','end'),
 ('00000000-0000-0000-0000-0000000000b4','open_ended','What do you see in this house?','middle'),
 ('00000000-0000-0000-0000-0000000000b4','distancing','How does your family know when someone visits?','end'),
 ('00000000-0000-0000-0000-0000000000b5','completion','Jun was very ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b5','wh','Which food did Jun choose?','middle'),
 ('00000000-0000-0000-0000-0000000000b5','recall','Who did Jun share with?','end'),
 ('00000000-0000-0000-0000-0000000000b5','open_ended','What food can you see in this picture?','middle'),
 ('00000000-0000-0000-0000-0000000000b5','distancing','What is your favourite hawker food?','end'),
 ('00000000-0000-0000-0000-0000000000b6','completion','Mia went with Dad to the ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b6','wh','Why did Dad need Mia''s help?','middle'),
 ('00000000-0000-0000-0000-0000000000b6','recall','What new words did Mia learn?','end'),
 ('00000000-0000-0000-0000-0000000000b6','open_ended','How do you think Mia felt at the bank?','middle'),
 ('00000000-0000-0000-0000-0000000000b6','distancing','Have you ever helped someone understand something? How did it feel?','end'),
 ('00000000-0000-0000-0000-0000000000b7','completion','Priya could not find her library ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b7','wh','Where did Priya look first?','middle'),
 ('00000000-0000-0000-0000-0000000000b7','recall','What clue helped her?','end'),
 ('00000000-0000-0000-0000-0000000000b7','open_ended','Where do you think the card is?','middle'),
 ('00000000-0000-0000-0000-0000000000b7','distancing','What do you do when you lose something?','end'),
 ('00000000-0000-0000-0000-0000000000b8','completion','Grandpa planted a tiny ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b8','wh','What sign did Grandpa teach for flower?','middle'),
 ('00000000-0000-0000-0000-0000000000b8','recall','What happened to the seed at the end?','end'),
 ('00000000-0000-0000-0000-0000000000b8','open_ended','What is Wei doing in this picture?','middle'),
 ('00000000-0000-0000-0000-0000000000b8','distancing','Who teaches you new things at home?','end'),
 ('00000000-0000-0000-0000-0000000000b9','completion','The track was wet and ___.','beginning'),
 ('00000000-0000-0000-0000-0000000000b9','wh','Why did Ravi keep running?','middle'),
 ('00000000-0000-0000-0000-0000000000b9','recall','What did his class do at the end?','end'),
 ('00000000-0000-0000-0000-0000000000b9','open_ended','How do you think Ravi feels now?','middle'),
 ('00000000-0000-0000-0000-0000000000b9','distancing','Tell me about a time you kept trying.','end'),
 ('00000000-0000-0000-0000-000000000b10','completion','The lanterns ___ at night.','beginning'),
 ('00000000-0000-0000-0000-000000000b10','wh','Which lantern did Mei Ling choose?','middle'),
 ('00000000-0000-0000-0000-000000000b10','recall','Why was it hard to choose?','end'),
 ('00000000-0000-0000-0000-000000000b10','open_ended','What can you see at the market?','middle'),
 ('00000000-0000-0000-0000-000000000b10','distancing','Which festival does your family enjoy?','end'),
 ('00000000-0000-0000-0000-000000000b11','completion','At home Aisha signs; at school she ___.','beginning'),
 ('00000000-0000-0000-0000-000000000b11','wh','Why did Aisha feel between two worlds?','middle'),
 ('00000000-0000-0000-0000-000000000b11','recall','What helped Aisha feel proud?','end'),
 ('00000000-0000-0000-0000-000000000b11','open_ended','What do you think Aisha should tell her friend?','middle'),
 ('00000000-0000-0000-0000-000000000b11','distancing','What languages do you use? What do you like about each?','end'),
 ('00000000-0000-0000-0000-000000000b12','completion','Mum could feel the ___ of the drums.','middle'),
 ('00000000-0000-0000-0000-000000000b12','wh','How did the audience clap without sound?','middle'),
 ('00000000-0000-0000-0000-000000000b12','recall','Why did Daniel choose this concert?','end'),
 ('00000000-0000-0000-0000-000000000b12','open_ended','How can people enjoy music in different ways?','end'),
 ('00000000-0000-0000-0000-000000000b12','distancing','What activities do you enjoy with your family?','end'),
 ('00000000-0000-0000-0000-000000000b13','completion','The turtle was ___ in a net.','beginning'),
 ('00000000-0000-0000-0000-000000000b13','wh','How did Captain Lin free the turtle?','middle'),
 ('00000000-0000-0000-0000-000000000b13','recall','Where did the turtle go at the end?','end'),
 ('00000000-0000-0000-0000-000000000b13','open_ended','What would you do if you found the turtle?','middle'),
 ('00000000-0000-0000-0000-000000000b13','distancing','Have you seen the sea? What was it like?','end'),
 ('00000000-0000-0000-0000-000000000b14','completion','When the phone rang, Ken took a ___.','beginning'),
 ('00000000-0000-0000-0000-000000000b14','wh','Why did Ken feel overwhelmed?','middle'),
 ('00000000-0000-0000-0000-000000000b14','recall','What advice did his teacher give?','end'),
 ('00000000-0000-0000-0000-000000000b14','open_ended','What else could Ken''s family do to get help?','end'),
 ('00000000-0000-0000-0000-000000000b14','distancing','Who can you ask for help when something feels like too much?','end'),
 ('00000000-0000-0000-0000-000000000b15','completion','Their voices made an ___.','middle'),
 ('00000000-0000-0000-0000-000000000b15','wh','What did the cousins find in the cave?','middle'),
 ('00000000-0000-0000-0000-000000000b15','recall','How did they get out of the cave?','end'),
 ('00000000-0000-0000-0000-000000000b15','open_ended','Where do you think the map leads?','end'),
 ('00000000-0000-0000-0000-000000000b15','distancing','When have you felt brave?','end')
) as x(b,c,t,s);

insert into public.session_templates (name, total_minutes, blocks) values
 ('Short session',30,'[{"type":"recap","minutes":5},{"type":"key_words","minutes":5},{"type":"read","minutes":15},{"type":"quiz","minutes":3},{"type":"handover","minutes":2}]'),
 ('Standard session',45,'[{"type":"recap","minutes":5},{"type":"key_words","minutes":10},{"type":"read","minutes":20},{"type":"quiz","minutes":5},{"type":"handover","minutes":5}]'),
 ('Long session',60,'[{"type":"recap","minutes":10},{"type":"key_words","minutes":10},{"type":"read","minutes":30},{"type":"quiz","minutes":5},{"type":"handover","minutes":5}]');

insert into public.guide_cards (id, title, steps, avoid_tip, sort_order) values
 ('00000000-0000-0000-0000-0000000000c1','The child is distracted or refuses to read',
  '{"Pause and ask what they would like to do first.","Offer a choice: you read a page, then they read a page.","Use the pictures and prompt cards to spark interest."}',
  'Don''t force them to keep reading or show frustration.',1),
 ('00000000-0000-0000-0000-0000000000c2','The child signs instead of speaking',
  '{"Welcome the sign — it is their home language.","Repeat the word aloud warmly, then invite them to try it.","Use the sign link on the word card to sign it together."}',
  'Don''t tell them to stop signing or correct them harshly.',2),
 ('00000000-0000-0000-0000-0000000000c3','The child tells you something worrying',
  '{"Stay calm and listen.","Write down what they said in their own words.","Report it to the SADeaf contact the same day using Raise a concern."}',
  'Don''t promise to keep it secret, and don''t investigate yourself.',3);

insert into public.guide_quiz_questions (question, options, correct_index, guide_card_id, sort_order) values
 ('A child pushes the book away and says "boring". What do you do first?','{"Insist they finish the page","Offer a choice of how to read together","End the session early","Tell their parent"}',1,'00000000-0000-0000-0000-0000000000c1',1),
 ('A child signs a word instead of saying it. What is the best response?','{"Ask them to stop signing","Ignore it","Welcome the sign, then say the word together","Move on to the next book"}',2,'00000000-0000-0000-0000-0000000000c2',2),
 ('A child tells you something worrying and asks you to keep it secret. You should…','{"Promise to keep it secret","Ask lots of questions to find out more","Explain you may need to tell someone who can help, and report it the same day","Wait until next week to decide"}',2,'00000000-0000-0000-0000-0000000000c3',3),
 ('Where should you record a safeguarding worry?','{"In the child''s session notes","In the private Raise a concern form","In a group chat","Nowhere"}',1,'00000000-0000-0000-0000-0000000000c3',4),
 ('Which word card link should you use to show a sign?','{"Any video online","The Sign Bank link on the card","Make up a sign","Skip signs entirely"}',1,'00000000-0000-0000-0000-0000000000c2',5);
