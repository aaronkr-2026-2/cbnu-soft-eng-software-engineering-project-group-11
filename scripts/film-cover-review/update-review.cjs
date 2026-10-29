// Index already-generated PNGs only. This script never generates or edits an image.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../assets/films/generated-review');
const project = path.resolve(__dirname, '../..');
const overrideFile = path.join(root, 'active-overrides.json');
const overrides = fs.existsSync(overrideFile) ? JSON.parse(fs.readFileSync(overrideFile, 'utf8')) : {};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const batches = fs.readdirSync(root).filter(name => /^batch-\d+$/.test(name)).sort();
let total = 0;
const links = [];
for (const batch of batches) {
  const dir = path.join(root, batch), file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) continue;
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const item of items) {
    const imageFile = item.id + '.png', image = path.join(dir, imageFile);
    if (!fs.existsSync(image)) continue;
    const data = fs.readFileSync(image);
    if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Invalid PNG: ' + image);
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    Object.assign(item, { imageFile, width, height, bytes: data.length, aspectRatio: width / height,
      exactTargetSize: width === 1230 && height === 1000, status: 'generated-needs-review', tool: 'built-in imagegen', approvedForApp: item.approvedForApp ?? false });
  }
  fs.writeFileSync(file, JSON.stringify(items, null, 2) + '\n');
  const saved = items.filter(item => item.imageFile);
  total += saved.length;
  links.push(`<li><a href="${batch}/index.html">${batch}</a> — ${saved.length}/${items.length}</li>`);
  const cards = saved.map(item => {
    const active = overrides[item.id];
    const image = active ? path.relative(dir, path.resolve(project, active.source)) : item.imageFile;
    const prompt = active ? path.relative(dir, path.resolve(project, active.prompt)) : item.promptFile;
    return `<article><img loading="lazy" src="${escape(image)}"><h2>${escape(item.brand)} ${escape(item.name)}</h2><p>${active ? 'Màu đã tạo lại theo ảnh tham chiếu' : item.width + ' × ' + item.height + ' · Cần duyệt bao bì'}</p><a href="${escape(prompt)}">Prompt</a></article>`;
  }).join('');
  fs.writeFileSync(path.join(dir, 'index.html'), page(batch, `<p><a href="../index.html">Tất cả đợt</a></p><main>${cards}</main>`));
}
const appliedManifest = path.join(__dirname, 'applied-assets.json');
const appliedCount = fs.existsSync(appliedManifest) ? JSON.parse(fs.readFileSync(appliedManifest, 'utf8')).length : 0;
const usage = appliedCount ? `Đã áp dụng ${appliedCount} ảnh vào app (492 × 400).` : 'Chưa thay ảnh trong app.';
const reviewLink = fs.existsSync(path.join(root, 'review-flags.html')) ? '<p><a href="review-flags.html">Đối chiếu chữ cách điệu cần duyệt</a></p>' : '';
fs.writeFileSync(path.join(root, 'index.html'), page('Film cover review', `<p>Đã lưu ${total} ảnh. ${usage}</p>${reviewLink}<ul>${links.join('')}</ul>`));
console.log(JSON.stringify({ saved: total, batches: batches.length }));
function page(title, body) {
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><title>FiLog — ${escape(title)}</title><style>body{font-family:system-ui;background:#171717;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{background:#292929;padding:12px;border-radius:12px}img{width:100%;height:auto;display:block}h2{font-size:18px}a{color:#ffce65}</style><h1>FiLog — ${escape(title)}</h1><p>Ảnh AI tạo từ prompt của app. Cần duyệt tên, ISO, màu, kiểu bao bì và tỉ lệ. File gốc không bị kéo giãn hoặc cắt.</p>${body}</html>`;
}
