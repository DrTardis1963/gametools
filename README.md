# Prime Mover Game Tools

Free calculators for Minecraft and Kerbal Space Program, funded by AdSense.
Live address (once DNS is set): https://games.primemoverindustries.com

Same stack as AusCalc: static site, no server, no npm packages. Python builds it, Node tests the maths,
GitHub Pages hosts it.

## Run it

```bash
node tests/check.js     # all maths checks, incl. every worked example on the pages
node tests/check.js mc  # just Minecraft (or: ksp)
py build.py             # src/ -> dist/
py -m http.server 8066 --directory dist
```

## Layout

- `site.json`: name, address, contact, AdSense switch.
- `src/assets/mc.js`: all Minecraft maths and game data (enchantments, portal search, XP curve, slime chunks).
- `src/assets/ksp.js`: all KSP maths and game data (engines, bodies, orbits, antennas).
- `src/assets/ui.js`: wires a form to its result box; `Calc.drawGrid` draws block maps.
- `src/pages/*.html`: one file per page. A JSON header comment gives the title, description, home-page
  card and `game` (the home page groups tools by it); a `<script>` at the end is moved below the layout.
  `{{ad}}` marks an ad spot.
- `tests/*.test.js`: one file per game, run by `tests/check.js`.
- `build.py`: writes `dist/` plus `sitemap.xml`, `robots.txt`, `ads.txt`, `CNAME`.
- `.github/workflows/deploy.yml`: on push to `main`, tests, builds and deploys to Pages.

## Adding a tool

1. Add pure functions and data to `mc.js` / `ksp.js`, and checks to the matching test file.
2. Copy a page in `src/pages/`, change the header, form and render function.
3. Write a real explainer: the formula, a worked example with numbers from the checks, what it
   leaves out, the game version, and sources with a checked date. No copied wiki text, no game art.

## Keeping data current

- **Minecraft** changes a few times a year. After a release ("drop"), check the Minecraft Wiki's
  "Anvil mechanics", "Enchanting", "Nether Portal", "Experience" and "Slime" pages for changes, update
  `mc.js`, the `version` lines and the checked dates, then run the checks. New enchantments go in
  `ENCHANTS`, `CONFLICTS` and `ITEMS`.
- **KSP 1.12.5** is the final version, so its data should not change.

## Going live

1. DNS at Namecheap (primemoverindustries.com): CNAME `games` -> `drtardis1963.github.io`.
2. Create the GitHub repo, push, then Settings -> Pages -> Source: GitHub Actions.
   Custom domain: `games.primemoverindustries.com`, tick Enforce HTTPS.
3. Google Search Console: add the domain, submit `/sitemap.xml`.

## AdSense

Same publisher as AusCalc (pub-3886111503622765); one approval of the root domain covers the subdomains.
See AusCalc's README for the root `ads.txt` and consent-message steps, then set `"enabled": true` in
`site.json` and push.

Minecraft has a young audience. The pages are written for a general audience, not for children, and the
privacy page says so. If AdSense or Google asks, don't tag the site as child-directed unless that changes;
do turn on AdSense's EEA/UK consent message.
