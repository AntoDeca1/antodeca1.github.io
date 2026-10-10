# Antonio De Candia

Personal portfolio: **https://antodeca1.github.io/**

A small, dependency-free website with selected projects, coauthored research, professional background, and public GitHub contributions. Native system typography, responsive layouts, keyboard navigation, and light/dark themes follow the [Apple design reference](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).

## Local preview

```sh
python3 -m http.server 8766 --directory site
```

Open `http://localhost:8766`.

## Edit and publish

- `site/index.html`: biography, projects, publications, and links.
- `site/styles.css`: design tokens and responsive layouts.
- `site/app.js`: appearance switch, navigation state, and contribution calendar.
- `scripts/update_contributions.py`: validated public contribution snapshot.

Push to `main` to publish with GitHub Pages. The workflow also runs daily at 06:23 UTC to refresh contributions before deployment. It uses GitHub's public calendar without authentication or third-party statistics services. It publishes aggregate day counts only. If GitHub changes its markup or the refresh fails, the last valid snapshot remains available and the workflow reports a warning. The site shows the snapshot date and indicates when it is stale. Scheduled workflows in public repositories may be disabled by GitHub after 60 days without repository activity; re-enable the workflow from the Actions tab if needed.

The portrait is Antonio's public GitHub profile image. Professional information is based on his GitHub repositories, coauthored papers, and LinkedIn profile.
