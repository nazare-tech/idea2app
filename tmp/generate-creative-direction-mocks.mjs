import fs from 'node:fs/promises'
import OpenAI from 'openai'

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

const model = process.env.OPENROUTER_MOCKUP_IMAGE_MODEL || 'openai/gpt-5.4-image-2'
const openrouter = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })

const promptBase = `Create a high-fidelity product UI mockup for an existing web app called MakerCompass. This is NOT a full page. Show only a focused cropped section inside a long project detail workspace.

Visual system to match:
- warm off-white page background (#FAFAFA)
- white cards on warm background
- subtle warm borders (#EAE0D8 / #E8DDD5)
- strong sans typography like Hanken Grotesk
- restrained, confident red accent (#DC2626)
- builder-tool aesthetic, practical and credible
- no gradients
- no glassmorphism
- no neon
- no dark mode
- no fake browser chrome
- no marketing landing page style

Product context:
MakerCompass is a workspace that turns a startup idea into structured outputs like overview, market research, PRD, MVP plan, mockups, and marketing docs. This new section sits inside that long project workspace as one inserted card in the content column.

The section is called: Creative Direction
Purpose: Let the user define a brand feel, choose a verbal direction, review four generated visual references, and then commit one selected direction before the full image-to-brand-system pipeline runs.

Must show this structure:
1. Card header area
- small mono uppercase kicker: NEW WORKFLOW
- heading: Creative Direction
- subtext: Pick a direction before we generate the full visual system.
- subtle pill on the right: Guided intake

2. Input area
- wide input or textarea
- realistic example text inside: AI finance app for Gen Z that feels premium but playful
- small helper note below: Start with the emotional feel, not the feature list.

3. Verbal direction chooser
Show 5 selectable chips/buttons:
- premium editorial
- playful internet-native
- minimal futuristic
- bold performance-driven
- soft lifestyle aspirational
One chip should be selected with a subtle red-tinted active state.

4. Visual reference chooser
Show exactly 4 image reference tiles in one row.
Each tile should have:
- a realistic thumbnail with a distinct creative direction
- a short label under it: Direction A, Direction B, Direction C, Direction D
- maybe a tiny muted descriptor line
One tile should be selected with a refined red outline.
These are taste references, not final mockups.

5. What happens next strip
A narrow strip below the references with 3 simple items:
- Style fingerprint
- Brand translation
- Prompt pack + assets

6. Action area
- primary red button: Build this direction
- secondary quiet button: Regenerate options
- optional subtle tertiary text action: Upload my own inspiration

Composition requirements:
- crop tightly around this one section card
- imply that it lives inside a larger project detail page, but do not show the entire page
- product UI screenshot realism
- clean spacing and believable hierarchy
- readable labels
- no lorem ipsum
- no giant illustrations
- no excessive shadows
- no trendy AI startup clichés`

const variants = [
  {
    name: 'mock-a',
    extra: 'Variant A should feel closest to the current MakerCompass workspace: restrained, neutral, document-product aesthetic, practical, understated, highly believable as an inserted section in a working app.'
  },
  {
    name: 'mock-b',
    extra: 'Variant B should push slightly more visual richness in the four reference thumbnails and selected states, while still staying within the same restrained product design system. Keep the outer section itself calm and structured.'
  }
]

function extractDataUrl(choice) {
  const message = choice?.message || {}
  const images = Array.isArray(message.images) ? message.images : []
  for (const img of images) {
    const url = img?.image_url?.url || img?.imageUrl?.url
    if (typeof url === 'string' && url.startsWith('data:image/')) return url
  }
  throw new Error('No image returned')
}

for (const variant of variants) {
  const prompt = `${promptBase}\n\n${variant.extra}`
  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You generate production-quality static UI mockup images for software products. Return an image and a concise design rationale.' },
      { role: 'user', content: prompt }
    ],
    modalities: ['image', 'text']
  }, { signal: AbortSignal.timeout(285000) })

  const choice = response.choices?.[0]
  const dataUrl = extractDataUrl(choice)
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/)
  if (!match) throw new Error('Unsupported data URL')
  const ext = match[1] === 'image/png' ? 'png' : match[1] === 'image/webp' ? 'webp' : 'jpg'
  const out = `/Users/bast/.openclaw/projects/makercompass/tmp/${variant.name}.${ext}`
  await fs.writeFile(out, Buffer.from(match[2], 'base64'))
  const rationale = typeof choice?.message?.content === 'string'
    ? choice.message.content
    : Array.isArray(choice?.message?.content)
      ? choice.message.content.map(p => p?.text || '').join(' ').trim()
      : ''
  await fs.writeFile(`/Users/bast/.openclaw/projects/makercompass/tmp/${variant.name}.txt`, rationale || '(no rationale)')
  console.log(JSON.stringify({ out, rationale }))
}
