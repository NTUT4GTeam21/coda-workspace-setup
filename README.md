# CODA Reading Toolkit

A web toolkit that helps volunteers plan and run reading sessions with children of Deaf adults (CODAs), and pick up where earlier volunteers left off.

Built by Team 21 of the NTU Honours College Tech for Good programme, in partnership with SADeaf (Singapore Association for the Deaf).

## Why this exists

Children of Deaf adults often take on interpreting and other adult responsibilities from a young age, and some develop gaps in English literacy. SADeaf runs a reading programme to support them, but volunteers rotate and spend a lot of time preparing each session.

This toolkit answers one question:

> How might we reduce the stress of preparing reading sessions with CODAs for volunteers, so that they spend less time on preparation while sessions stay engaging and effective?

## Who it's for

- **Primary users:** volunteers who plan and run reading sessions.
- **Secondary users:** SADeaf staff who coordinate volunteers and oversee children's progress.
- **Not users:** CODAs and their parents do not use the website directly.

## Main features

- **Library by level** – books with key words, child-friendly definitions, example sentences and discussion prompts.
- **Session flow** – a simple structure for each session, quick capture of tricky words, and a short recap.
- **Child records** – session history, level, and a note for the next volunteer.
- **Volunteer guide** – short scenario cards for common situations, plus safeguarding guidance.

## Design principles

- **Teaching stays human.** The website prepares and records; volunteers teach.
- **Prepare once, reuse many times.** Content is created and checked once, not generated live.
- **A person checks anything a child sees.** No unreviewed AI output reaches a child.
- **Collect the least child data that works.** First names or codes only.
- **SADeaf can maintain it.** Content lives in editable tables, with no dependency on our team after the project ends.

## Tech stack

Built with [Lovable](https://lovable.dev) and [Claude Code](https://claude.com/claude-code). See `package.json` for the full stack.

## Running locally

```bash
git clone <repo-url>
cd <repo-folder>
npm install
npm run dev
```

You will need a `.env` file with the backend keys. Ask the Technical Head; never commit real secrets.

## Contributing (team members)

1. Pull the latest `main`.
2. Create a branch: `feature/<name>` or `fix/<name>`.
3. Commit small changes with clear messages.
4. Open a pull request and get one teammate's approval before merging.

Lovable edits go straight to `main`, so coordinate in the group chat before prompting Lovable.

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
