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
- The store uses `skipHydration` and is rehydrated by `HydrationGate` in `__root.tsx`, including matching storage events, so SSR stays consistent and merchant decisions reach other open prototype tabs.
- Role checks go through helpers in the store (`canAuthorMenus`, etc.) so later slices extend one place.
- Guest discovery, cart and order state stay in the shared persisted prototype store; snapshots are copied at submission and transitions check current state atomically to prevent duplicate decisions and deductions.
- Ordering admission requires active capacity; already admitted requests can use bounded continuity units at acceptance so zero capacity never removes public menus or contact.
