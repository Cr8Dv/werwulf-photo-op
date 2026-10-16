const express = require('express'), multer = require('multer'), rateLimit = require('express-rate-limit');
const fs = require('fs'), path = require('path'), sharp = require('sharp');
const app = express(); app.set('trust proxy', 1);
const PROMPT = "Edit this photo, do not create a new scene. Keep EXACTLY the same number of people as in the photo, no added or removed people. Keep every person's face, identity, expression, head angle, body pose, position, framing and camera angle exactly as in the original. Only change: their clothing into coarse 13th-century peasant wool garments (hoods, head wraps, shawls) fitted to their existing pose, and replace the background with a bleak, hazy, treeless moorland hill under a blank pale sky with bare brambles. Render the whole image as a washed-out, low-contrast silver-grey black-and-white photograph like an early 1900s print, soft film grain, somber Robert Eggers period-film mood. No text, no modern clothing or objects.";
const REF = fs.readFileSync(path.join(__dirname, 'reference.png'));
const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.REPLICATE_API_TOKEN ? 'replicate' : process.env.FAL_KEY ? 'fal' : 'demo')).toLowerCase();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif)$/.test(f.mimetype)) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dataUri = (b, m='image/jpeg') => `data:${m};base64,${b.toString('base64')}`;

const providers = {
  async demo() { await sleep(6000); const n = 1 + Math.floor(Math.random() * 2); return fs.readFileSync(path.join(__dirname, 'demo', `sample${n}.jpg`)); },
  async openai(img) {
    const fd = new FormData();
    fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
    fd.append('image[]', new Blob([img], { type: 'image/jpeg' }), 'family.jpg');
    if (process.env.USE_REF === '1') fd.append('image[]', new Blob([REF], { type: 'image/png' }), 'reference.png');
    fd.append('prompt', PROMPT); fd.append('size', process.env.OPENAI_IMAGE_SIZE || 'auto'); fd.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
    fd.append('input_fidelity', 'high'); fd.append('moderation', 'low');
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: fd });
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'OpenAI error');
    return Buffer.from(j.data[0].b64_json, 'base64');
  },
  async replicate(img) { // FLUX Kontext (single input image; reference described via prompt)
    const r = await fetch(`https://api.replicate.com/v1/models/${process.env.REPLICATE_MODEL || 'black-forest-labs/flux-kontext-pro'}/predictions`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { prompt: PROMPT, input_image: dataUri(img), aspect_ratio: '3:2', output_format: 'jpg' } }) });
    let j = await r.json(); if (!r.ok) throw new Error(j.detail || 'Replicate error');
    while (!['succeeded', 'failed', 'canceled'].includes(j.status)) { await sleep(1500); j = await (await fetch(j.urls.get, { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` } })).json(); }
    if (j.status !== 'succeeded') throw new Error('Replicate ' + j.status);
    const url = Array.isArray(j.output) ? j.output[0] : j.output; return Buffer.from(await (await fetch(url)).arrayBuffer());
  },
  async fal(img) {
    const r = await fetch(`https://fal.run/${process.env.FAL_MODEL || 'fal-ai/flux-pro/kontext/max/multi'}`, { method: 'POST',
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: PROMPT, image_urls: [dataUri(img), dataUri(REF, 'image/png')], aspect_ratio: '3:2', output_format: 'jpeg' }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.detail?.toString() || 'fal error');
    return Buffer.from(await (await fetch(j.images[0].url)).arrayBuffer());
  }
};

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/api/health', (q, s) => s.json({ ok: true, mode: provider === 'demo' ? 'demo' : 'live', provider }));
app.post('/api/generate', rateLimit({ windowMs: 15 * 60e3, limit: +(process.env.RATE_LIMIT || 8), standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many portraits summoned. Rest a while and try again.' } }), upload.single('photo'), async (q, s) => {
  if (!q.file) return s.status(400).json({ error: 'Please upload a JPG, PNG or WebP image under 10 MB.' });
  try {
    const img = await sharp(q.file.buffer).rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    let out = await providers[provider](img);
    out = await sharp(out).grayscale().jpeg({ quality: 92 }).toBuffer(); // enforce no color
    s.json({ image: dataUri(out), mode: provider === 'demo' ? 'demo' : 'live' });
  } catch (e) { console.error(e); s.status(502).json({ error: 'The summoning failed. Please try again.', detail: String(e.message || e).slice(0, 300) }); }
});
app.use((e, q, s, n) => s.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: e.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large (10 MB max).' : 'Upload failed.' }));
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log(`WERWULF on :${process.env.PORT || 3000} (${provider})`));
module.exports = app;
