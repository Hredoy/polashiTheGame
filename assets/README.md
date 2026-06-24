# Polashi game art assets

Demo placeholders live in [`demo/`](demo/). Each filename includes its **recommended size**,
e.g. `character_MIR_MODON__600x800.png` → make your image **600 × 800 px**.

## How to use
1. Open `assets/demo/` — there's one image per slot, filled with a flat colour at the right size.
2. Create your real artwork at the **same dimensions** (PNG with transparency where it helps).
3. Upload each at **`/admin?key=YOUR_ADMIN_TOKEN`** — pick the matching **slot** name (the part
   before the `__size`), choose your file, Upload. It appears in-game immediately.
4. Any slot you don't upload simply shows the built-in **text / emoji fallback** — so you can
   add art gradually.

Accepted formats: **PNG, JPEG, WebP**. The size in the filename is a recommendation, not a
hard limit — but matching it keeps everything crisp and correctly proportioned.

## Slots

| Slot (upload name) | Demo file | Size (px) | Shape | Where it appears in-game |
|---|---|---|---|---|
| `game_logo` | game_logo__512x512.png | 512×512 | square | Splash screen |
| `captain_card` | captain_card__128x128.png | 128×128 | square | Crown above the Shobapoti (captain) |
| `stamp_nawab` | stamp_nawab__256x256.png | 256×256 | circle | Nawab faction stamp on known players |
| `stamp_eic` | stamp_eic__256x256.png | 256×256 | circle | EIC faction stamp on known players |
| `voting_yes` | voting_yes__256x256.png | 256×256 | circle | The হ্যাঁ (Yes) wax-seal vote button |
| `voting_no` | voting_no__256x256.png | 256×256 | circle | The না (No) wax-seal vote button |
| `mission_success` | mission_success__512x512.png | 512×512 | square | The সফল (Success) mission card |
| `mission_betrayer` | mission_betrayer__512x512.png | 512×512 | square | The ব্যর্থ (Betrayer) mission card |
| `character_SIRAJ` | character_SIRAJ__600x800.png | 600×800 | portrait 3:4 | Character reveal — Nawab Siraj-ud-Daulah |
| `character_MIR_MODON` | character_MIR_MODON__600x800.png | 600×800 | portrait 3:4 | Character reveal — Mir Modon |
| `character_NAWAB` | character_NAWAB__600x800.png | 600×800 | portrait 3:4 | Character reveal — plain Nawab soldier |
| `character_MOHAN_LAL` | character_MOHAN_LAL__600x800.png | 600×800 | portrait 3:4 | Character reveal — Mohan Lal |
| `character_SAINT_FRAIS` | character_SAINT_FRAIS__600x800.png | 600×800 | portrait 3:4 | Character reveal — Saint Frais |
| `character_DEBUSI` | character_DEBUSI__600x800.png | 600×800 | portrait 3:4 | Character reveal — Debusi |
| `character_LUTFUNNESSA` | character_LUTFUNNESSA__600x800.png | 600×800 | portrait 3:4 | Character reveal — Lutfunnessa Begum |
| `character_MIR_ZAFAR` | character_MIR_ZAFAR__600x800.png | 600×800 | portrait 3:4 | Character reveal — Mir Zafar |
| `character_GHASETI_BEGUM` | character_GHASETI_BEGUM__600x800.png | 600×800 | portrait 3:4 | Character reveal — Ghaseti Begum |
| `character_EIC` | character_EIC__600x800.png | 600×800 | portrait 3:4 | Character reveal — plain EIC agent |
| `character_RAI_DURLABH` | character_RAI_DURLABH__600x800.png | 600×800 | portrait 3:4 | Character reveal — Rai Durlabh |
| `character_UMICHAND` | character_UMICHAND__600x800.png | 600×800 | portrait 3:4 | Character reveal — Umichand |

> Green demo = Nawab side, red demo = EIC side, gold = neutral/UI. Colours are just
> placeholders — your art can look however you like.

## App launcher icon (separate)
The **phone home-screen icon** is **not** uploaded here — it's built into the app. Set it in
Android Studio: right-click `app` → New → Image Asset → Launcher Icons → pick your logo.

## Regenerating the demos
`node scripts/gen-demo-assets.mjs` rewrites `assets/demo/` from the slot list.
