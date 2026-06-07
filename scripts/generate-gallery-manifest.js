const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const galleryRoot = path.join(root, 'assets', 'gallery');
const imageDir = path.join(galleryRoot, 'images');
const manifestPath = path.join(galleryRoot, 'gallery-manifest.json');

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

const categoryPrefixes = [
  ['then-vs-now', 'Then vs Now'],
  ['before-after', 'Before and After'],
  ['president', 'President Candidate'],
  ['vice-president', 'Vice President Candidate'],
  ['board-secretary', 'Board Secretary Candidate'],
  ['board-treasurer', 'Board Treasurer Candidate'],
  ['faqs', 'FAQs'],
  ['policies', 'Policy Work'],
  ['facility-work', 'Facility Work']
];

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
}

function numberFrom(file){
  const match = path.basename(file, path.extname(file)).match(/(\d+)(?!.*\d)/);
  return match ? match[1].padStart(2, '0') : '';
}

function categoryFor(file){
  const slug = path.basename(file, path.extname(file)).toLowerCase();
  const match = categoryPrefixes.find(([prefix]) => slug.startsWith(prefix));
  return match ? match[1] : 'Campaign Images';
}

function niceTitle(file){
  const category = categoryFor(file);
  const n = numberFrom(file);
  if(category === 'President Candidate') return n === '01' ? 'President Candidate Profile' : `President Candidate Campaign Visual ${n}`;
  if(category === 'Vice President Candidate') return n === '02' ? 'Vice President Candidate Profile' : `Vice President Candidate Campaign Visual ${n}`;
  if(category === 'Board Secretary Candidate') return n === '03' ? 'Board Secretary Candidate Profile' : `Board Secretary Candidate Campaign Visual ${n}`;
  if(category === 'Board Treasurer Candidate') return n === '04' ? 'Board Treasurer Candidate Profile' : `Board Treasurer Candidate Campaign Visual ${n}`;
  if(category === 'Then vs Now') return `Then vs Now ${n}`;
  if(category === 'Before and After') return `Before and After ${n}`;
  if(category === 'FAQs') return `Frequently Asked Questions ${n}`;
  if(category === 'Policy Work') return `Policy Release ${n}`;
  if(category === 'Facility Work') return `Facility Work ${n}`;
  return path.basename(file, path.extname(file))
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function listFiles(dir, allowed){
  ensureDir(dir);
  return fs.readdirSync(dir)
    .filter(file => !file.startsWith('.') && allowed.has(path.extname(file).toLowerCase()))
    .sort((a,b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'}));
}

ensureDir(galleryRoot);
ensureDir(imageDir);

const order = new Map(categoryPrefixes.map((entry, index) => [entry[1], index]));
const images = listFiles(imageDir, imageExt).map(file => ({
  title: niceTitle(file),
  category: categoryFor(file),
  src: `assets/gallery/images/${file}`
})).sort((a,b) => {
  const byCategory = (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99);
  return byCategory || a.src.localeCompare(b.src, undefined, {numeric:true, sensitivity:'base'});
});

fs.writeFileSync(manifestPath, JSON.stringify({
  updated: new Date().toISOString(),
  images
}, null, 2) + '\n');

console.log(`Gallery manifest updated: ${images.length} images`);
