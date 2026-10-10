# Release notes

## 1.1.1 — 2026-10-10

- No changes to the app itself. The README no longer includes GitHub Pages setup steps.

## 1.0.11 — 2026-10-10

- A GitHub link at the bottom of the page, next to the version number, goes to the project's source code.

## 1.0.10 — 2026-10-10

- Tap a group in the list under the answer to highlight its loop on the map, the same as hovering with a mouse on a computer. Tap it again to clear, or tap another group to switch. Clicking works the same way on a computer.

## 1.0.9 — 2026-10-10

- 5- and 6-variable maps. With 5 variables the map is shown as two 4×4 maps side by side, one for A = 0 and one for A = 1. With 6 variables it's a 2×2 grid of maps, one for each value of AB. A group that spans maps is drawn in each of them in the same colour. On a phone the maps stack in a single column, in an order that keeps neighbouring maps next to each other.
- The simplifier was rebuilt to handle the larger maps quickly. In the rare case that a 6-variable map is too tangled to search fully, the answer is still correct, and a note says it may not be the shortest possible.
- Names now accept up to six letters, and typing two letters splits the variables between them for 5 and 6 variables too (e.g. a₀ a₁ b₀ b₁ b₂).

## 1.0.8 — 2026-10-10

- Click the top-left corner of the map (where the variable names are) to flip it, swapping which variables run down the side and which run across the top. Click again to flip back. Shared links remember a flipped map.

## 1.0.7 — 2026-10-10

- Numbered variable names now start at 0: `a` gives a₀, a₁, a₂, a₃ and `ab` gives a₀, a₁, b₀, b₁.

## 1.0.6 — 2026-10-10

- Numbered variable names. Type a single letter in Names (e.g. `a`) to get a₁, a₂, a₃, a₄. Type two letters (e.g. `ab`) to get a₁, a₂, b₁, b₂, or a₁, b₁, b₂ with three variables (the first letter for the map's rows, the second for its columns). The numbers are shown as subscripts; the copyable plain-text answer writes them as `a1`, `a2`.

## 1.0.5 — 2026-10-10

- The page no longer zooms on phones: pinching, double-tapping and tapping into a text box all leave it at normal size.

## 1.0.4 — 2026-10-10

- On phones and other narrow screens, the truth table now comes before the map. On wider screens it stays beside the map.

## 1.0.3 — 2026-10-10

- Taller truth table rows, so they're easier to read and tap.

## 1.0.2 — 2026-10-10

- The truth table now stretches to the full width of its panel on phones instead of sitting squashed on the left.

## 1.0.1 — 2026-10-10

First version.

- Karnaugh maps for 2, 3 or 4 variables, laid out in Gray code order.
- Click a cell (or the F column of the truth table) to cycle 0 → 1 → X (don't care).
- Type minterms and don't cares directly (`0, 2, 5-7`) instead of clicking.
- Shows the minimal sum of products (SOP) or product of sums (POS), with complemented variables drawn with an overbar and a plain-text copy (`A'B + C`).
- Each group is drawn as a coloured loop on the map, including groups that wrap around the edges and corners. Hover a group in the list to pick it out.
- Rename the variables (default A, B, C, D).
- The address bar keeps the current map, so you can bookmark or share it.
- Follows your system's light or dark theme.
