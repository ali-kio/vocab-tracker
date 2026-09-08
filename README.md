# My Vocabulary — 1,200 English Words

A self-contained, bilingual (Arabic / English) web app for learning the 1,200 words from the *4000 Essential English Words* series (Books 1 & 2). No build step, no backend — open `index.html` and it works.

## Features

- **60 units, 1,200 words** — definitions, examples, usage notes, synonyms, antonyms, and a short story per unit.
- **Self-paced learning** — every unit is open from day one. Progress within a unit is saved automatically, including mid-unit, with a back button to correct a decision.
- **Two-category review system** — words you mark "already known" get a quick confidence check; words "new to you" need three consecutive correct answers to graduate out of active review. A missed "known" word automatically moves into the review queue.
- **Three exercise types** — flashcards, multiple choice, and typing.
- **My Lists** — browse your known/new words and your own notebook sentences, filterable by book and unit.
- **Full bilingual UI** — every interface label switches between Modern Standard Arabic and English; the English vocabulary content itself never changes language.
- **Light/dark mode**, installable as a home-screen app (PWA-ready).

## Project structure

```
index.html
manifest.json
assets/
  css/style.css     — all styling, theming, and layout
  js/data.js        — the word data (Books 1 & 2, translations, synonyms/antonyms)
  js/i18n.js        — the Arabic/English translation dictionary and language switching
  js/app.js         — application logic
```

## Running locally

Just open `index.html` in a browser. For the best experience (and for the "Add to Home Screen" PWA behavior to work), serve it over a local server, e.g.:

```bash
python3 -m http.server
```

then visit `http://localhost:8000`.

## Deploying

Works as-is on GitHub Pages, Netlify, or any static host — no build step required.

## Screenshots

_Add screenshots of the Home, Map, and Practice screens here._

## Data storage

Progress is stored locally in the browser (`localStorage`); nothing is sent to a server.

## Credits

Built by Ali.

## License

MIT — see [LICENSE](LICENSE).
