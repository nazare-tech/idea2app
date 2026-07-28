import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"

import { HeroReelArc, HERO_REEL_SCREENS } from "./hero-reel-arc"

const expectedScreens = [
  { src: "/landing/hero-reel/cropscout-c1-cutout.png", sha256: "fc919242d0b4511910dc831ebaaf3658e7351f54128210fd1e44fc509ec5a6f2" },
  { src: "/landing/hero-reel/evidencedeck-b1-cutout.png", sha256: "ca9e67477f366e1fcf0274e27d02275797aa432ca40e26c90d86203df5a5bd44" },
  { src: "/landing/hero-reel/fieldscribe-b1-cutout.png", sha256: "5ac42197aab83afc009405dd440a05f2751ec5accc4e2ae1c18263e282655df7" },
  { src: "/landing/hero-reel/kinship-cards-c1-cutout.png", sha256: "620071d13faa7d0e70991ae244d1bcabf0eba264ed219615bcefd01af464c236" },
  { src: "/landing/hero-reel/mentorloop-c1-cutout.png", sha256: "f77dcb689e31f552bba99b81dc1b31e2bd846e14369cb18702f2073db2c67923" },
  { src: "/landing/hero-reel/releaserelay-b2-cutout.png", sha256: "42b47a697693d3e26bf4cb36acc74bcf0bd54c60d9e7cf7da010b621bdb42630" },
  { src: "/landing/hero-reel/returnreason-c1-cutout.png", sha256: "d2ca4f90616952cfc07962e73fe17ae5b612f045d6b22e6ff827914e40c35c0c" },
  { src: "/landing/hero-reel/scopesignal-a1-cutout.png", sha256: "ea64db8b2ef5137833870ef3f4ce0adbe960e8497e4294675bc51fd3fd2f4a68" },
  { src: "/landing/hero-reel/signalledger-a2-cutout.png", sha256: "6836b6e2533d61d38703c29b10260ee774019f2bf7bbcc85476d78b86b34635a" },
  { src: "/landing/hero-reel/venueturn-c2-cutout.png", sha256: "0635f0e82e6cbfbca8e0e4ed182beb8af027193cefb4d1d19e81f1dccbe7dcd6" },
] as const

test("HeroReelArc repeats ten shortlisted mobile screens across fifty decorative cards", () => {
  const html = renderToStaticMarkup(<HeroReelArc />)

  assert.deepEqual(
    HERO_REEL_SCREENS.map((screen) => screen.src),
    expectedScreens.map((screen) => screen.src),
  )
  assert.equal((html.match(/<img/g) ?? []).length, 50)

  for (const screen of HERO_REEL_SCREENS) {
    assert.equal(html.split(`title="${screen.name}"`).length - 1, 5)
  }

  assert.match(html, /aria-hidden="true"/)
  assert.equal((html.match(/alt=""/g) ?? []).length, 50)
  assert.equal((html.match(/loading="eager"/g) ?? []).length, 20)
  assert.equal((html.match(/loading="lazy"/g) ?? []).length, 30)
})

test("HeroReelArc public assets match the normalized transparent cutouts", () => {
  for (const screen of expectedScreens) {
    const bytes = readFileSync(join(process.cwd(), "public", screen.src))

    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a")
    assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR")
    assert.equal(bytes.readUInt32BE(16), 576)
    assert.equal(bytes.readUInt32BE(20), 1008)
    assert.equal(bytes[24], 8, `${screen.src} must use 8-bit channels`)
    assert.equal(bytes[25], 6, `${screen.src} must use RGBA PNG color type`)
    assert.equal(createHash("sha256").update(bytes).digest("hex"), screen.sha256)
  }
})
