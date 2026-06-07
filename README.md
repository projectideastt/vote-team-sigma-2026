# Vote Team Sigma 2026

Static GitHub Pages campaign site for Team Sigma SPPS.

## Gallery

The gallery is at `gallery/index.html` and reads from:

```text
assets/gallery/gallery-manifest.json
```

Add images to `assets/gallery/images/`, then run:

```bash
node scripts/generate-gallery-manifest.js
```

Commit the regenerated `gallery-manifest.json` with the new media files. GitHub Pages cannot automatically list folder contents, so the JSON file is used as the gallery index.
