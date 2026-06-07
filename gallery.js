(function(){
  const imageMount = document.getElementById('image-gallery');
  const manifestUrl = '../assets/gallery/gallery-manifest.json';

  function pageRelative(src){
    if(!src) return '';
    if(/^https?:\/\//i.test(src) || src.startsWith('../') || src.startsWith('./')) return src;
    return '../' + src.replace(/^\//, '');
  }

  function esc(value){
    return String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function slugify(value){
    return String(value || 'campaign-images')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'campaign-images';
  }

  function categories(items){
    const seen = new Map();
    items.forEach(item => {
      const label = item.category || 'Campaign Images';
      const slug = slugify(label);
      if(!seen.has(slug)) seen.set(slug, label);
    });
    return [...seen.entries()].map(([slug, label]) => ({slug, label}));
  }

  function renderEmpty(mount, title, text){
    if(!mount) return;
    mount.innerHTML = `<article class="card gallery-empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`;
  }

  function renderFilters(cats){
    if(cats.length <= 1) return '';
    return `<div class="gallery-filters" aria-label="Gallery filters">
      <button class="gallery-filter active" type="button" data-filter="all" aria-pressed="true">All</button>
      ${cats.map(cat => `<button class="gallery-filter" type="button" data-filter="${esc(cat.slug)}" aria-pressed="false">${esc(cat.label)}</button>`).join('')}
    </div>`;
  }

  function applyFilter(filter){
    const tiles = [...imageMount.querySelectorAll('.gallery-tile')];
    let visibleCount = 0;

    tiles.forEach(tile => {
      const shouldShow = filter === 'all' || tile.dataset.categorySlug === filter;
      tile.classList.toggle('is-hidden', !shouldShow);
      tile.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
      if(shouldShow) visibleCount += 1;
    });

    const count = imageMount.querySelector('[data-gallery-count]');
    if(count){
      const label = filter === 'all'
        ? 'campaign images available for voters to browse.'
        : 'matching campaign images available for voters to browse.';
      count.innerHTML = `<strong>${visibleCount}</strong> ${label}`;
    }
  }

  function bindGalleryInteractions(images){
    imageMount.addEventListener('click', event => {
      const filterButton = event.target.closest('.gallery-filter');
      if(filterButton && imageMount.contains(filterButton)){
        const filter = filterButton.dataset.filter || 'all';
        imageMount.querySelectorAll('.gallery-filter').forEach(btn => {
          const active = btn === filterButton;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyFilter(filter);
        return;
      }

      const tile = event.target.closest('.gallery-tile');
      if(tile && imageMount.contains(tile) && !tile.classList.contains('is-hidden')){
        openLightbox(images, Number(tile.dataset.index));
      }
    });
  }

  function renderImages(images){
    if(!imageMount) return;
    if(!images || !images.length){
      renderEmpty(imageMount, 'No images uploaded yet', 'Add images to assets/gallery/images, then run the manifest script.');
      return;
    }
    const cats = categories(images);
    imageMount.innerHTML = renderFilters(cats) + `
      <div class="gallery-count" data-gallery-count><strong>${images.length}</strong> campaign images available for voters to browse.</div>
      <div class="masonry-gallery">
        ${images.map((image, index) => {
          const category = image.category || 'Campaign Images';
          return `
          <button class="gallery-tile" type="button" data-index="${index}" data-category-slug="${esc(slugify(category))}" aria-label="Open ${esc(image.title)}">
            <img src="${esc(pageRelative(image.src))}" alt="${esc(image.title || 'Campaign image')}" loading="lazy">
            <span><strong>${esc(image.title || 'Campaign Image')}</strong><em>${esc(category)}</em></span>
          </button>
        `}).join('')}
      </div>
    `;

    bindGalleryInteractions(images);
  }

  function openLightbox(images, startIndex){
    let index = startIndex;
    const overlay = document.createElement('div');
    overlay.className = 'gallery-lightbox';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Close gallery">×</button>
      <button class="lightbox-prev" type="button" aria-label="Previous image">‹</button>
      <figure>
        <img alt="">
        <figcaption></figcaption>
      </figure>
      <button class="lightbox-next" type="button" aria-label="Next image">›</button>
    `;
    const img = overlay.querySelector('img');
    const caption = overlay.querySelector('figcaption');
    const show = () => {
      const item = images[index];
      img.src = pageRelative(item.src);
      img.alt = item.title || 'Campaign image';
      caption.innerHTML = `<strong>${esc(item.title || 'Campaign Image')}</strong><span>${esc(item.category || 'Campaign Images')}</span>`;
    };
    const close = () => {
      document.body.classList.remove('lightbox-open');
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };
    const prev = () => { index = (index - 1 + images.length) % images.length; show(); };
    const next = () => { index = (index + 1) % images.length; show(); };
    const onKey = (event) => {
      if(event.key === 'Escape') close();
      if(event.key === 'ArrowLeft') prev();
      if(event.key === 'ArrowRight') next();
    };
    overlay.querySelector('.lightbox-close').addEventListener('click', close);
    overlay.querySelector('.lightbox-prev').addEventListener('click', prev);
    overlay.querySelector('.lightbox-next').addEventListener('click', next);
    overlay.addEventListener('click', event => { if(event.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.classList.add('lightbox-open');
    show();
  }

  fetch(manifestUrl, {cache:'no-store'})
    .then(response => {
      if(!response.ok) throw new Error('Gallery manifest not found');
      return response.json();
    })
    .then(manifest => renderImages(manifest.images || []))
    .catch(() => renderEmpty(imageMount, 'Gallery manifest needed', 'Run node scripts/generate-gallery-manifest.js after adding images.'));
})();
