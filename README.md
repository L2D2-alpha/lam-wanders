# Lam Wanders

A travel diary kept by Spring Roll.

The live site is at [l2d2-alpha.github.io/lam-wanders](https://l2d2-alpha.github.io/lam-wanders/).

- Home, Highlights, Trips, and About are driven by `data/trips.json`, `data/years.json`, and `data/about.json`.
- Photos live in `images/<trip-slug>/`.
- Entries with `lat` and `lng` show a coordinates link to Google Maps.
- Clicking a stop opens `entry.html`, which can show several photos for one day.
- Optional `photos` on an entry lists those images; `styledImage` and `originalImage` still work on their own.
- The home timeline runs newest to oldest (left to right on desktop, top to bottom on a phone). Tiles open `entry.html`. An optional `photos` list can hold several images for one day.

- A private `/admin/` editor (noindex, not linked from these pages) can update the JSON and photos with a fine-grained GitHub token for this repo only.

To make a token for `/admin/`:

1. Open [GitHub’s fine-grained token form](https://github.com/settings/personal-access-tokens/new).
2. Name it something like `Lam Wanders admin`.
3. Set the resource owner to **L2D2-alpha**.
4. Set an expiration (90 days is a sensible default).
5. Under Repository access, choose **Only select repositories** and select **L2D2-alpha/lam-wanders** only.
6. Under Repository permissions, set **Contents** to **Read and write**. **Metadata** is included automatically as **Read-only**. Leave everything else as No access.
7. Generate the token and paste it into the admin sign-in form. Do not put the token in this repository.
