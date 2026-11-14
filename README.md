# Lam Wanders

A travel diary kept by Spring Roll.

The live site is at [l2d2-alpha.github.io/lam-wanders](https://l2d2-alpha.github.io/lam-wanders/).

- Home, Highlights, Trips, and About are driven by `data/trips.json`, `data/years.json`, and `data/about.json`.
- Photos live in `images/<trip-slug>/`.
- Entries with `lat` and `lng` show a coordinates link to Google Maps.
- Clicking a stop opens `entry.html`, which can show several photos for one day.
- Optional `photos` on an entry lists those images; `styledImage` and `originalImage` still work on their own.
