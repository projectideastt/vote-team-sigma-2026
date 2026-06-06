const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const galleryRoot = path.join(root, 'assets', 'gallery');
const imageDir = path.join(galleryRoot, 'images');
const videoDir = path.join(galleryRoot, 'videos');
const posterDir = path.join(galleryRoot, 'posters');
const manifestPath = path.join(galleryRoot, 'gallery-manifest.json');

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const videoExt = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v']);
const posterExt = ['.jpg', '.jpeg', '.png', '.webp'];

function ensureDir(dir){
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
}
function niceTitle(file){
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
function posterFor(videoFile){
  const base = path.basename(videoFile, path.extname(videoFile));
  for(const ext of posterExt){
    const candidate = path.join(posterDir, base + ext);
    if(fs.existsSync(candidate)) return `assets/gallery/posters/${base}${ext}`;
  }
  return '';
}

ensureDir(galleryRoot);
ensureDir(imageDir);
ensureDir(videoDir);
ensureDir(posterDir);

const videos = listFiles(videoDir, videoExt).map(file => {
  const item = {title: niceTitle(file), src: `assets/gallery/videos/${file}`};
  const poster = posterFor(file);
  if(poster) item.poster = poster;
  return item;
});

const images = listFiles(imageDir, imageExt).map(file => ({
  title: niceTitle(file),
  src: `assets/gallery/images/${file}`
}));

fs.writeFileSync(manifestPath, JSON.stringify({
  updated: new Date().toISOString(),
  videos,
  images
}, null, 2) + '\n');

console.log(`Gallery manifest updated: ${videos.length} videos, ${images.length} images`);
