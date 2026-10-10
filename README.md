# K Mapper

A small Karnaugh map simplifier for 2–6 variables. It's a static page (HTML, CSS and plain JavaScript, no build step), so it runs on GitHub Pages or straight from disk: just open `index.html`.

**Live site:** https://mmmlinux.github.io/K-Mapper/

## Files

- `index.html`, `style.css`: the page
- `kmap.js`: Gray code layout and minimisation (Quine–McCluskey plus an exact minimum cover)
- `app.js`: the UI
- `version.js`: the version number (shown bottom right)
- `RELEASE_NOTES.md`: what changed in each version

## Publishing on GitHub Pages

The code lives at https://github.com/mmmlinux/K-Mapper. To turn on the site:

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, then branch `main`, folder `/ (root)`, and save.
3. After a minute the site is live at https://mmmlinux.github.io/K-Mapper/ and updates on every push to `main`.

## License

Free to use, modify and share, but not to sell, or to sell a product or service whose value comes mainly from it, without permission. See [LICENSE](LICENSE) for the full terms: the MIT License with the Commons Clause.
