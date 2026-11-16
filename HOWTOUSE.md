# How to take over this repository

We built Read between the Signs in 5 weeks, mostly by prompting Lovable, and 6 of us were changing it at once. That speed left traps. This guide is for the next project group, so that you do not have to find the same traps the way we did. Read it once from top to bottom before touching anything.

_Written 16 Nov 2026 by Team 21. If something here no longer matches the site, trust the code and update this file._

## What you are inheriting

The website works. The programme around it is not ready. Volunteers can sign up, pass the guide quiz, run a reading session with a child and leave a note for the next volunteer. Staff can manage everything from the Admin page. What is missing is listed in [PROGRESS.md](PROGRESS.md) under "Known issues" and "Open questions for SADeaf", and most of it is waiting on a decision from SADeaf. More code will not close those items.

The project has three parts, and you need access to each one.

| Part | What it is | Who to ask |
| --- | --- | --- |
| This GitHub repository | All the code, the database migrations and the documents | An owner of the `NTUT4GTeam21` organisation |
| The Lovable project "Coda Start Foundation" | The AI builder that wrote most of the code. It also hosts the live site and the database (Lovable Cloud) | The owner of the Lovable workspace, Elina in Team 21 |
| A staff account on the site | Lets you see the Admin page and edit content | Any existing staff user, who can make you a staff sign-up code |

Without Lovable access you can still read and change the code, but you cannot publish the site or look at the live database.

## Read these first

Do not skip this. The four files below take about 20 minutes and will save you far more.

1. [README.md](README.md) explains what the site is for and what it does today.
2. [PROGRESS.md](PROGRESS.md) lists every feature with its status, the folder structure and the known issues.
3. [CLAUDE.md](CLAUDE.md) holds the team rules: branches, privacy, content and accessibility. They apply to people as much as to AI tools.
4. [AGENTS.md](AGENTS.md) holds the architecture rules, mainly how access control works.

[CHANGELOG.md](CHANGELOG.md) is the history. Use it when you need to know when and why something changed.

## Run the site on your own computer

You need [Node.js](https://nodejs.org) 22 or newer. [Bun](https://bun.sh) is optional but matches the lockfile.

```bash
git clone https://github.com/NTUT4GTeam21/coda-workspace-setup.git
cd coda-workspace-setup
bun install        # or: npm install
bun run dev        # or: npm run dev
```

The terminal prints a local address. Open it in a browser and you should see the welcome page.

Two things will surprise you.

Your local copy talks to the live database. The committed `.env` points at the real backend, so anything you add or delete while testing locally is added or deleted for everyone. Use fake children such as `Child A` and delete your test sessions afterwards.

`bun install` may also fail on addresses containing `pkg.dev`. This is because `bun.lock` points some packages at Lovable's own package mirror, which could not be reached from the machine we last tested on. If that happens, replace `https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/` with `https://registry.npmjs.org/` throughout `bun.lock`, run `bun install` again, then run `git checkout bun.lock` so the edit is not committed.

Before you change anything, confirm that these three commands behave as described. If they do not, fix that first.

| Command | Expected result on 16 Nov 2026 |
| --- | --- |
| `npm run build` | Finishes without errors |
| `npm run test` | 47 of 47 tests pass |
| `npm run lint` | 774 formatting errors, all inside `src/integrations/`. That folder is auto-generated and is left alone on purpose. Any error outside it is yours to fix |

## How the pieces fit together

Lovable and GitHub share one branch, `main`. When someone prompts Lovable, it commits straight to `main`. When you merge a pull request into `main`, Lovable picks the change up. This is convenient, and it is also the easiest way to lose work, because two people changing the same file through two routes will conflict.

The live site does not update by itself. After a change reaches `main`, someone with Lovable access must press **Publish**, then **Update**, in the Lovable editor. We learnt this the slow way. On 29 Oct a teammate could not finish a session because saving the handover note failed. The fix was already in the code, but nobody had published it, so she was still using the old version. A fix that is merged but not published does not exist for volunteers.

The database lives in Lovable Cloud, which is Supabase underneath. Its structure is recorded in `drizzle/schema.ts` and in the numbered SQL files in `drizzle/migrations/`. Access rules are enforced in the database with row-level security. The checks you see in the page code only decide what to show, so never rely on them to protect child data.

## Making a change

There are two routes. Pick one per change and tell your group which. Our advice is to use a branch for anything that touches logic and to keep Lovable for database changes and new screens. If your group has nobody comfortable with Git, Lovable alone will still work, but read every commit it makes.

| Route | Good for | Watch out for |
| --- | --- | --- |
| Prompt Lovable | New pages, anything that needs a database change, quick visual changes | It commits to `main` with no review. Of the 127 commits we handed over, most carry the message "Changes", so the Git history will not tell you what happened. CHANGELOG.md will |
| Edit the code (by hand or with Claude Code) on a branch | Bug fixes, careful changes to logic, anything you want reviewed | You must open a pull request, and someone must publish from Lovable after it merges |

Whichever route you take, the steps around it are the same.

1. Tell the group chat what you are about to change, so nobody prompts Lovable on the same files.
2. Pull the latest `main`.
3. For code edits, create a branch named `feature/<name>` or `fix/<name>`. Never commit to `main` yourself.
4. Make one small change. Stay inside one module where you can.
5. Add one line at the top of the "Unreleased" section of `CHANGELOG.md`. Update `PROGRESS.md` if a feature's status or the folder structure changed.
6. Run `npm run build`, `npm run test` and `npm run lint`.
7. Open a pull request, get one teammate to approve it, and merge.
8. Publish from Lovable, then check the live site on a phone as well as a laptop.

### Where things are

| You want to change | Look in |
| --- | --- |
| A page | `src/routes/`. Signed-in pages are under `_authenticated/` |
| A shared piece of a page (header, story reader, word pop-up) | `src/components/` |
| Logic with no screen (labels, quiz building, book suggestions, SgSL lookup) | `src/lib/`, with its tests in `src/test/` |
| Colours and fonts | `src/styles.css` |
| Buttons, dialogs and other basic controls | `src/components/ui/`. These are shadcn/ui parts. Reuse them and do not add another UI library |
| Database tables or access rules | Ask Lovable. See the next section |

Do not edit `src/integrations/` or `src/routeTree.gen.ts`. Both are generated and your edits will be overwritten.

### Changing the database

Let Lovable make database changes. It writes the migration file, applies it to the live database and regenerates the types in one step, and doing those three things by hand is where mistakes happen. In your prompt, ask it to include the migration file in the repository, to enable row-level security on any new table that holds child data, and to say what it changed.

Never edit or delete an existing file in `drizzle/migrations/`. Those files have already run against the live database.

## Changing content without code

Most day-to-day upkeep can be done by a staff user on the site itself. This was a design choice, so that SADeaf can maintain the site after a student group leaves.

| Task | Where a staff user does it |
| --- | --- |
| Create or cancel sign-up codes | Admin, "Sign-up codes" |
| Make someone staff, mark them qualified, or deactivate them | Admin, "People" |
| Add a child and assign volunteers | Admin, "Children and assignments" |
| Read and approve a draft story | Admin, "Content to review" |
| Read concerns raised by volunteers | Admin, "Concerns" |
| Move an ongoing session to another volunteer | Admin, session transfers |
| Re-check SgSL links, or accept and reject possible signs | Admin, SgSL sections |
| Edit a book's link, word cards and prompts | The book's own page in the Library |
| Edit a volunteer guide card | The Guide page |

To get your first staff account, ask an existing staff user to create a staff code under "Sign-up codes". Sign up, tick "Programme Staff" and enter the code.

## What to do first

These are ordered by how much harm they prevent, not by how interesting they are.

1. Cancel the shared test codes. The sign-up codes `ADMIN` and `VOLUNTEER` are reusable, and both are named in a public file in this repository. Anyone who reads it can make themselves staff. We left them active for testing, and they must be cancelled on the Admin page before any real child is added.
2. Get SADeaf's answers to the open questions in PROGRESS.md: what child information may be stored, who handles parental consent, what the safeguarding procedure is, and who maintains the site.
3. Replace the safeguarding placeholder. The "Raise a concern" confirmation still reads "[safeguarding contact to be confirmed by SADeaf]".
4. Ask staff to review the 16 possible SgSL matches on the Admin page.
5. Add pictures to word cards. This is the largest feature that was planned and never built.

## What caught us out

None of these were hard problems. Each one cost us time only because nobody had written it down.

Unpublished fixes caused the most confusion. In the 29 Oct case above, the "bug" on the live site had already been fixed in the code.

Draft content hides itself. On 23 Oct all 15 stories were still drafts, so a volunteer account could not read a single book and the Library looked broken. It was working as designed: staff had not approved anything yet. If a volunteer reports that something is missing, check its status before you look for a bug.

Formatting drifted quietly. Lovable does not run the project's formatter, and by 16 Nov `npm run lint` showed 1,313 errors, every one of them formatting. We cleaned the hand-edited files in one pass. Run `npx prettier --write` on each file you touch and it will not build up again. Avoid `npm run format`, which rewrites every file including the generated ones.

The SgSL Signbank has fewer entries than we expected. Of 87 words, 45 have no entry at all, including plain ones such as "garden" and "ocean", and its entry names are inconsistent. Do not promise SADeaf full coverage.

## Rules that are not negotiable

These come from [CLAUDE.md](CLAUDE.md). They are repeated here because breaking one of them harms a child or the programme.

- Never put a real child's data in the repository, in a screenshot, in a prompt or in a test. Use `Child A`, `Child B`.
- Store the minimum: a first name or code, level, words and short session notes. No surnames, photos, addresses or family details.
- Never commit a secret. The keys in `.env` are public by design. A service-role key is not, and it must stay in Lovable's secret settings.
- A person must check anything a child might see before it is used. New stories stay hidden until staff approve them, and that gate should stay.
- Do not store copyrighted book files. Store titles, levels, links and your own notes.
- Use Singapore Sign Language (SgSL) references. ASL appears only as a labelled fallback.

## When something goes wrong

| What you see | Likely cause | What to do |
| --- | --- | --- |
| A fix is merged but the live site has not changed | Nobody published | In Lovable, press Publish, then Update, and reload the site |
| A volunteer cannot see any children | They have not passed the guide quiz, their qualification has lapsed, or no child is assigned to them | Check the person and the child's assignments on the Admin page |
| A volunteer cannot continue a session | It belongs to another volunteer | A staff user transfers it on the Admin page |
| A save fails with a permission error | The database refused it. The page and the access rules disagree | Read the matching policy in `drizzle/migrations/` before changing any page code |
| An SgSL re-check reports many failures | The Signbank limits fast requests, so the lookup already waits 3 seconds between words | Run the re-check again later. Failed words keep their old result |
| `git pull` shows conflicts in `CHANGELOG.md` or `PROGRESS.md` | You and Lovable both added a line | Keep both sides' lines. Never delete another person's entry |

## Who built this

Team 21, NTU Honours College Tech for Good, with SADeaf, October to November 2026. The team list is at the bottom of [README.md](README.md). Module owners are in [CLAUDE.md](CLAUDE.md), which tells you whom to ask about each part.
