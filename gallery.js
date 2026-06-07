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

  function categories(items){
    return [...new Set(items.map(item => item.category || 'Campaign Images'))];
  }

  function renderEmpty(mount, title, text){
    if(!mount) return;
    mount.innerHTML = `<article class="card gallery-empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`;
  }

  function renderFilters(cats){
    if(cats.length <= 1) return '';
    return `<div class="gallery-filters" aria-label="Gallery filters">
      <button class="gallery-filter active" type="button" data-filter="all">All</button>
      ${cats.map(cat => `<button class="gallery-filter" type="button" data-filter="${esc(cat)}">${esc(cat)}</button>`).join('')}
    </div>`;
  }

  function renderImages(images){
    if(!imageMount) return;
    if(!images || !images.length){
      renderEmpty(imageMount, 'No images uploaded yet', 'Add images to assets/gallery/images, then run the manifest script.');
      return;
    }
    const cats = categories(images);
    imageMount.innerHTML = renderFilters(cats) + `
      <div class="gallery-count"><strong>${images.length}</strong> campaign images available for voters to browse.</div>
      <div class="masonry-gallery">
        ${images.map((image, index) => `
          <button class="gallery-tile" type="button" data-index="${index}" data-category="${esc(image.category || 'Campaign Images')}" aria-label="Open ${esc(image.title)}">
            <img src="${esc(pageRelative(image.src))}" alt="${esc(image.title || 'Campaign image')}" loading="lazy">
            <span><strong>${esc(image.title || 'Campaign Image')}</strong><em>${esc(image.category || 'Campaign Images')}</em></span>
          </button>
        `).join('')}
      </div>
    `;

    imageMount.querySelectorAll('.gallery-filter').forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        imageMount.querySelectorAll('.gallery-filter').forEach(btn => btn.classList.toggle('active', btn === button));
        imageMount.querySelectorAll('.gallery-tile').forEach(tile => {
          tile.hidden = filter !== 'all' && tile.dataset.category !== filter;
        });
      });
    });

    imageMount.querySelectorAll('.gallery-tile').forEach(tile => {
      tile.addEventListener('click', () => openLightbox(images, Number(tile.dataset.index)));
    });
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
