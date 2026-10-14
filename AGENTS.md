<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Access control lives in the database (RLS + security-definer helpers `has_role`, `is_qualified`, `can_access_child`); UI checks are cosmetic only, so the qualification gate cannot be bypassed.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate); public pages stay top-level so they can be server-rendered.
- Roles live only in `user_roles`; admin-only changes go through security-definer RPCs that check `has_role`, so volunteers can't edit their own role or qualification.
- Book content (books, word_cards, discussion_prompts) has a draft/approved status; volunteers only see approved rows so AI drafts must be reviewed first.
- Sign-up role choice is enforced in the `handle_new_user` trigger (volunteer codes validated there, staff stay pending until an admin approves via RPC), so the client can't grant itself a role.

- Guide reads are available to authenticated users before qualification; quiz answers are column-restricted and scoring stays in the database RPC so access can be earned without exposing the answer key.
- Volunteer learning content stays in editable guide tables; the guide UI checks errors explicitly and preserves quiz choices while users revisit scenario cards.
