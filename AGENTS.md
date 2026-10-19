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
- PEWA prototype state lives in a single persisted Zustand store (`src/lib/pewa/store.ts`) seeded from scenario fixtures; no backend — the brief requires an isolated, deterministic prototype.
- The store uses `skipHydration` and is rehydrated by `HydrationGate` in `__root.tsx`, so SSR and client never disagree on localStorage state.
- Role checks go through helpers in the store (`canAuthorMenus`, etc.) so later slices extend one place.
