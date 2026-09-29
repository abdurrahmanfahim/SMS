# SolaimanLipi — bundled font files

Resolves the open licence question in `docs/spec/design-system.md` §1 (raised by
`M0-U2`, escalated into `M0-O2` per `README.md`'s risk log, row -1).

## What's here and why

These are the files the Owner supplied under `M0-O2`. Their own embedded font
metadata (read directly with `fontTools`, not taken from a third-party mirror)
shows **three different historical releases** of SolaimanLipi exist, under
**two different licences**:

| Release | Files (as supplied) | Version | Developer credited | Licence (from the font's own `name` table) |
|---|---|---|---|---|
| 2003/2005 | `SolaimanLipi_29-05-06.ttf/.woff` | 1.0 | Solaiman Karim | **GNU GPL v2**, with a font-embedding exception (embedding it in a document does not make the document GPL) |
| 2012 | `SolaimanLipi_22-02-2012.ttf/.woff`, `SolaimanLipi_Bold_10-03-12.ttf/.woff` | 2.000 | Al Mamun Sumon (dev), Solaiman Karim (design) | SIL Open Font License, **1.0** |
| **2022 (bundled here)** | `SolaimanLipi-Normal.ttf`, `SolaimanLipi-Bold.ttf`, `SolaimanLipi-Thin.ttf` | 2.002 | Al Mamun Hossen (dev), Solaiman Karim (design), copyright Ekushey (`https://ekushey.org`) | SIL Open Font License, **1.1** |

This explains the "sources disagree" note `M0-U2` left in `design-system.md`:
different mirrors were serving different historical releases with different
licences. The Owner-supplied files let us read the licence straight from each
font's own metadata instead of trusting a third-party mirror's claim.

**Only the 2022 / v2.002 / OFL-1.1 release is bundled in this repo**
(`SolaimanLipi-{Regular,Bold,Thin}.{ttf,woff2}`), because it is: the newest
release, the one whose metadata names an official-looking source
(`ekushey.org`, the project Solaiman Karim's own font work is associated
with), under OFL 1.1 (the current, well-understood version of the licence —
Google Fonts uses the same licence for Noto Sans Bengali and Hind Siliguri,
already in this design system per §1's table), and it adds a Thin weight the
older releases don't have. The 2003 GPL and 2012 OFL-1.0 files are **not**
committed here, to avoid two differently-licensed versions of "SolaimanLipi"
sitting in the same repo under the same family name.

`.woff2` is for the web/print CSS stack (`--font-print` in `design-system.md`
§1, matching how `Hind Siliguri`/`Noto Sans Bengali` are self-hosted per that
same section). `.ttf` is kept too because `docs/research/pdf-spike.md`'s
Approach C (`pdfkit` + `fontkit`) takes a raw TTF, not a woff2, so whichever
PDF approach `M2-E4` ends up choosing has the format it needs without
re-deriving it from the woff2.

## Licence text (embedded in the font, `nameID` 13/14, platform 3)

> This Font Software is licensed under the SIL Open Font License, Version 1.1.
> http://scripts.sil.org/OFL

Copyright string (`nameID` 0): "Copyright © 2022 All Rights Reserved by Ekushey".

## What OFL 1.1 means for this project, in plain terms (not legal advice)

- Bundling/embedding the font in a software product — including a paid
  product, including embedding it in generated PDFs (`M2-E4`) — is allowed
  and free, with no royalty.
- The font itself may not be **sold on its own**, separate from the software
  it's bundled with.
- If the font is **modified** and redistributed, the modified version can't
  keep using the Reserved Font Name ("SolaimanLipi") without permission. This
  project does not modify the font, so this doesn't apply.
- No attribution is required in the product's UI itself, but keeping this
  file (provenance + licence text) in the repo is good practice and is what
  satisfies OFL's own "keep the licence with the font" expectation.

**This is this agent's reading of the licence text and the embedded
metadata, not a lawyer's opinion.** `design-system.md`'s "Do not ship until
confirmed" note can reasonably be lifted for the 2022 OFL-1.1 build — the
licence question `M0-U2` flagged is now answered from the font's own
metadata — but per `M0-O2`'s own step 2, a lawyer or consultant should still
be the one who signs off before this goes in front of a paying customer,
since nothing here should be read as legal certainty.
