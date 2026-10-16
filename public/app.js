const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const TICKETS = 'https://www.focusfeatures.com/werwulf'; // placeholder
const TRAILER = 'https://www.focusfeatures.com/werwulf';
const LINES = ['Thy Soule Is Cursid', 'Do Not Dread the Darkness', 'Embrace It', 'Devoureth All Mankynde'];
let photoBlob = null, finalBlob = null, stream = null, facing = 'user';
const show = id => { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); scrollTo(0, 0); if (id !== 'camera') stopCam(); };
$$('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.go); });
$$('[data-tickets]').forEach(a => { a.href = TICKETS; a.target = '_blank'; a.rel = 'noopener'; });
$$('[data-trailer]').forEach(a => { a.href = TRAILER; a.target = '_blank'; a.rel = 'noopener'; });
$('#agree').onchange = e => $('#begin').disabled = !e.target.checked;
$('#begin').onclick = () => show('choose');

// ---- choose / upload ----
$('#btnUpload').onclick = () => $('#fileUpload').click();
$('#btnCamera').onclick = async () => {
  if (!navigator.mediaDevices?.getUserMedia) return $('#fileCapture').click();
  try { await startCam(); show('camera'); } catch { $('#fileCapture').click(); }
};
['#fileUpload', '#fileCapture'].forEach(s => $(s).onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (!f.type.startsWith('image/')) return err('Please choose an image file.');
  if (f.size > 25e6) return err('That photo is too large. Please choose one under 25 MB.');
  try { setPreview(await resize(f)); } catch { err('That photo could not be read. Try a JPG or PNG.'); }
});
const err = m => $('#chooseErr').textContent = m;
async function resize(src, max = 1536) {
  const bmp = await createImageBitmap(src, { imageOrientation: 'from-image' }).catch(() => loadImg(URL.createObjectURL(src)));
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', .9));
}
const loadImg = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
function setPreview(b) { photoBlob = b; $('#previewImg').src = URL.createObjectURL(b); err(''); show('preview'); }

// ---- camera ----
async function startCam() { stopCam(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false }); $('#video').srcObject = stream; }
function stopCam() { stream?.getTracks().forEach(t => t.stop()); stream = null; }
$('#flip').onclick = () => { facing = facing === 'user' ? 'environment' : 'user'; startCam().catch(() => {}); };
$('#snap').onclick = async () => {
  const v = $('#video'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)); setPreview(await resize(b));
};
$('#retake').onclick = () => show('choose');

// ---- generate ----
$('#usePhoto').onclick = async () => {
  show('generating'); let p = 0, li = 0; const tz = $('#tease'); const lv = $('#loadVid'); lv.currentTime = 0; lv.classList.add('on'); lv.play().catch(() => {}); 
  const t0 = Date.now(); const tick = setInterval(() => { const t = (Date.now() - t0) / 1000; const T = 35; p = t < T ? 92 * (1 - Math.pow(1 - t / T, 2)) : Math.min(98, 92 + (t - T) * 0.15); setPct(p); const k = Math.min(1, p / 92); tz.style.opacity = (0.15 + 0.25 * k).toFixed(2); tz.style.filter = `grayscale(${k}) sepia(${0.15 * k}) contrast(${1 - 0.35 * k}) brightness(${1 - 0.25 * k}) blur(${(6 - 3 * k).toFixed(1)}px)`; }, 250);
  const rot = setInterval(() => { const g = $('#genLine'); g.style.opacity = 0; setTimeout(() => { g.textContent = LINES[++li % LINES.length]; g.style.opacity = 1; }, 600); }, 5000);
  $('#genLine').textContent = LINES[0];
  try {
    const fd = new FormData(); fd.append('photo', photoBlob, 'photo.jpg');
    const r = await fetch('/api/generate', { method: 'POST', body: fd }); const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Something went wrong.');
    setPct(100); await compose(j.image); FN = newFN();
    $('#demoNote').textContent = j.mode === 'demo' ? 'Demo mode: sample portrait shown in place of live AI.' : '';
    show('result');
  } catch (e) { err(e.message); show('choose'); }
  finally { clearInterval(tick); clearInterval(rot); tz.style.opacity = 0; lv.classList.remove('on'); lv.pause(); }
};
function setPct(p) { $('#pct').textContent = Math.round(p); $('#ringFg').style.strokeDashoffset = 339.3 * (1 - p / 100); }

// ---- composite 1080x1350 ----
async function compose(src) {
  await Promise.all([document.fonts.load('60px Werwulf'), document.fonts.load('30px "EB Garamond"')]).catch(() => {});
  const [img, tt] = await Promise.all([loadImg(src), loadImg('assets/title.png')]);
  const W = 1080, H = 1350, c = $('#cv'), x = c.getContext('2d'); c.width = W; c.height = H;
  x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 900); g.addColorStop(0, '#1a1a1a'); g.addColorStop(1, '#070707'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#4a4a4a'; x.lineWidth = 2; x.strokeRect(30, 30, W - 60, H - 60); x.strokeStyle = '#2c2c2c'; x.strokeRect(44, 44, W - 88, H - 88);
  const tw = 640, th = tw * tt.height / tt.width; x.drawImage(tt, (W - tw) / 2, 92, tw, th);
  const bx = 80, by = 92 + th + 46, bw = W - 160, bh = Math.round(bw * 2 / 3);
  const s = Math.max(bw / img.width, bh / img.height), sw = bw / s, sh = bh / s;
  x.save(); x.filter = 'grayscale(1)'; x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, bx, by, bw, bh); x.restore();
  x.strokeStyle = '#8a8a8a'; x.lineWidth = 2; x.strokeRect(bx - 10, by - 10, bw + 20, bh + 20);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; let y = by + bh + 104;
  // tagline: Werwulf letters, quote marks in serif (font has no punctuation)
  x.font = '62px Werwulf'; const t = 'Devoureth All Mankynde', w = x.measureText(t).width; x.fillStyle = '#ededed'; x.fillText(t, W / 2, y);
  x.font = '64px "EB Garamond"'; x.fillText('\u201C', W / 2 - w / 2 - 14, y); x.fillText('\u201D', W / 2 + w / 2 + 14, y);
  y += 44; x.strokeStyle = '#5a5a5a'; x.beginPath(); x.moveTo(W / 2 - 120, y); x.lineTo(W / 2 + 120, y); x.stroke();
  y += 62; x.font = '40px Werwulf'; x.fillStyle = '#d8d8d8'; x.fillText('Only in Theaters This Christmas', W / 2, y);
  y += 58; x.font = '500 22px "EB Garamond"'; x.fillStyle = '#9a9a9a'; spaced(x, 'FOCUS FEATURES', W / 2, y, 8);
  y += 34; x.font = '18px "EB Garamond"'; x.fillStyle = '#6a6a6a'; spaced(x, 'DevourethAllMankynde.com  ·  @werwulfmovie', W / 2, y, 2);
  // film grain
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0);
  finalBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
  $('#finalImg').src = URL.createObjectURL(finalBlob);
}
function spaced(x, t, cx, y, sp) { const ch = [...t], ws = ch.map(c => x.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1); let px = cx - tot / 2; x.textAlign = 'left'; ch.forEach((c, i) => { x.fillText(c, px, y); px += ws[i] + sp; }); x.textAlign = 'center'; }

// ---- result actions ----
let FN = 'WERWULF-family-portrait.jpg';
const newFN = () => `WERWULF-${Math.random().toString(36).slice(2, 7).toUpperCase()}.jpg`;
$('#download').onclick = () => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(finalBlob); a.download = FN; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => { show('cta'); $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 3500); }, 900);
};
$('#share').onclick = async () => {
  const file = new File([finalBlob], FN, { type: 'image/jpeg' });
  const data = { files: [file], title: 'WERWULF', text: 'Devoureth All Mankynde. Only in theaters this Christmas. @werwulfmovie' };
  if (navigator.canShare?.(data)) { try { await navigator.share(data); } catch {} }
  else $('#download').click();
};
const again = e => { e.preventDefault(); photoBlob = finalBlob = null; show('choose'); };
$('#tryAgain').onclick = again; $('#again2').onclick = again;
fetch('/api/health').then(r => r.json()).then(j => document.body.dataset.mode = j.mode).catch(() => {});
