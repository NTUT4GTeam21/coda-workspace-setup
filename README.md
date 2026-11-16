# Read between the Signs (CODA Reading Toolkit)

A web toolkit that helps volunteers plan and run 1-to-1 reading sessions with children of Deaf adults (CODAs), and pick up where earlier volunteers left off.

Built by Team 21 of the NTU Honours College Tech for Good programme, in partnership with SADeaf (Singapore Association for the Deaf).

_Current as of 16 Nov 2026. See [PROGRESS.md](PROGRESS.md) for feature status and [CHANGELOG.md](CHANGELOG.md) for what changed and when._

Taking over this project? Start with [HOWTOUSE.md](HOWTOUSE.md).

## Why this exists

Children of Deaf adults often take on interpreting and other adult responsibilities from a young age, and some develop gaps in English literacy. SADeaf runs a reading programme to support them, but volunteers rotate and spend a lot of time preparing each session.

This toolkit answers one question:

> How might we reduce the stress of preparing reading sessions with CODAs for volunteers, so that they spend less time on preparation while sessions stay engaging and effective?

## Who it's for

- **Primary users:** volunteers who plan and run reading sessions.
- **Secondary users:** SADeaf programme staff who coordinate volunteers, review content and oversee children's progress.
- **Not users:** CODAs and their parents do not use the website directly.

There are three kinds of account:

| Role | Signs up with | Can do |
| --- | --- | --- |
| Volunteer | A volunteer code from staff | Read the guide, and once qualified, see assigned children and run their own sessions |
| Programme staff | A staff code | Everything on the Admin page: codes, children, assignments, content review, concerns, session transfers |
| Viewer | No code | Browse approved books only |

A volunteer must read the guide and pass its quiz before children and sessions unlock. This qualification lasts 1 year, and lapses earlier after about 6 months without signing in.

## What the site does now

A session follows three steps: pick a book, run the session, hand over. The volunteer never has to prepare word lists or questions by hand, because every book already carries them.

| Area | What it does |
| --- | --- |
| Library | 21 levelled books (levels 1 to 3). Each has an original story, word cards with a child-friendly definition and example sentence, CROWD discussion prompts and an illustrated cover. Books can be filtered by level, theme and length. |
| SgSL sign links | A word card links to its sign in the [SgSL Signbank](https://blogs.ntu.edu.sg/sgslsignbank/) when an exact entry exists. If none exists, it shows an ASL link that is labelled as ASL. Staff can re-check all words, review possible matches and set a link by hand. |
| Session page | A 30, 45 or 60-minute step plan, Quick Recap flip cards, the story with tappable key words, a floating prompts panel, tricky-word capture and a short quiz after the story. |
| Handover | Compulsory notes that save as the volunteer types, with ratings for engagement, confidence and level fit. |
| Child record | Reading level (a volunteer can change it with a reason), tricky words, suggested next books, session history and the last volunteer's note. |
| Volunteer guide | 12 scenario cards and a 12-question quiz. A "Raise a concern" button sits on every signed-in page and reports privately to staff. |
| Admin | Sign-up codes, volunteers, children and assignments, stories waiting for review, concerns, SgSL review and transfers of ongoing sessions. |

### Known limits

The site works, but it is not ready for real sessions yet.

- Word cards have no pictures.
- The volunteer guide and safeguarding steps are a learning draft. SADeaf has not yet reviewed them or confirmed the safeguarding contact and reporting procedure.
- Of 87 word cards, 26 have an SgSL link and 16 have possible matches waiting for a staff decision. The other 45 have no Signbank entry.
- The 21 stories were drafted with AI and approved by a person. A new draft stays hidden from volunteers until staff approve it.
- The shared test sign-up codes ADMIN and VOLUNTEER still work. Staff should cancel them on the Admin page before real children are added.

## Design principles

- **Teaching stays human.** The website prepares and records; volunteers teach.
- **Prepare once, reuse many times.** Content is created and checked once, not generated live.
- **A person checks anything a child sees.** No unreviewed AI output reaches a child.
- **Collect the least child data that works.** First names or codes only.
- **SADeaf can maintain it.** Content lives in editable tables, with no dependency on our team after the project ends.

## Tech stack

Built with [Lovable](https://lovable.dev) and [Claude Code](https://claude.com/claude-code).

- **App:** React 19 and TypeScript on TanStack Start (file-based routing, server functions), built with Vite.
- **Styling:** Tailwind CSS 4 with shadcn/ui components.
- **Backend:** Lovable Cloud (Supabase), which provides the Postgres database, sign-in and row-level security. Access rules are enforced in the database. Checks in the UI are for display only.
- **Tests:** Vitest with Testing Library.

See `package.json` for exact versions and [AGENTS.md](AGENTS.md) for the architecture rules.

## Repository layout

```
/                 README, HOWTOUSE.md, CLAUDE.md, AGENTS.md, CHANGELOG.md, PROGRESS.md, roadmap.md
/src/routes       one file per page; signed-in pages live under _authenticated/
/src/components   shared components; ui/ holds the shadcn/ui primitives
/src/lib          shared helpers (auth, labels, quiz, book suggestions, SgSL lookup)
/src/test         unit and routing tests
/src/integrations backend connection (auto-generated, do not edit)
/src/assets       cover art and illustrations
/drizzle          database schema and migrations
/supabase         backend project config
```

## Running locally

```bash
git clone https://github.com/NTUT4GTeam21/coda-workspace-setup.git
cd coda-workspace-setup
bun install        # or: npm install
bun run dev        # or: npm run dev
```

The committed `.env` holds only the public backend address and publishable key, which are meant to be public. Never commit a service-role key or any other secret.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build |
| `npm run test` | Run the test suite once |
| `npm run lint` | ESLint and Prettier checks |
| `npm run format` | Format files with Prettier |

## Contributing (team members)

1. Pull the latest `main`.
2. Create a branch: `feature/<name>` or `fix/<name>`.
3. Commit small changes with clear messages.
4. Add a line to `CHANGELOG.md`, and update `PROGRESS.md` if a feature's status or the file structure changed.
5. Run `npm run build`, `npm run lint` and `npm run test`.
6. Open a pull request and get one teammate's approval before merging.

Lovable edits go straight to `main`, so coordinate in the group chat before prompting Lovable. Full rules are in [CLAUDE.md](CLAUDE.md).

## Team

| Name | Role |
| --- | --- |
| Tang Zong Nan | Project Manager |
| Lee Chenhui | Partner Liaison |
| Tanya Deepak Chugani | Project Archivist |
| Elina Sim Si Ting | Financial & Logistics Head |
| Ryan Loh Ee Han | Technical Head |
| Chong Le Xuan, Chloe | User Interface & Research Head |

Supervisor: Dr Ho Shen Yong
