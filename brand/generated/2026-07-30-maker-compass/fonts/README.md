# Fonts

Both families are licensed under the SIL Open Font License 1.1, which permits redistribution,
embedding in documents and applications, and bundling in a kit like this one.

## Hanken Grotesk — display and body

- `HankenGrotesk[wght].ttf` — variable, covers every weight the system uses (400 body through
  800 display). One file replaces the whole static family.
- `HankenGrotesk-Italic[wght].ttf` — variable italic.
- Google Fonts: https://fonts.google.com/specimen/Hanken+Grotesk

## Fira Mono — labels and metadata

- `FiraMono-Regular.ttf`, `FiraMono-Medium.ttf`, `FiraMono-Bold.ttf`
- The system uses Medium (500) for kicker labels at `0.18em` tracking.
- Google Fonts: https://fonts.google.com/specimen/Fira+Mono

## Installing

**Desktop.** Double-click each TTF and confirm the install. On macOS the variable fonts expose
their weight axis in any app that supports variations; apps that do not will show a single
default weight.

**Web.** Either load from Google Fonts, or self-host these files:

```css
@font-face {
  font-family: "Hanken Grotesk";
  src: url("/fonts/HankenGrotesk[wght].ttf") format("truetype-variations");
  font-weight: 100 900;
  font-display: swap;
}
```

Always keep the Noto fallbacks in the font stack so non-Latin strings never render as tofu.
The stacks in `../tokens/tokens.css` already include them.
