// App shell: navigation, the redesigned full player, mini player, sheets, toasts, and task setup.
import { TRACKS, PLAYLISTS, ARTISTS, ART, getTrack, getPlaylist, getArtist, fmtCount, fmtTime, waveform, commentsFor } from './data.js';
import { icon } from './icons.js';
import { S, player, playFrom, playTrack, next, prev, addToHistory, likeCount } from './store.js';
import { ROUTES, LISTS, renderTrending, feedCards, searchResults, paywallBody, trackRow } from './views.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const TABS = ['home', 'feed', 'search', 'library', 'upgrade'];
const stacks = Object.fromEntries(TABS.map((t) => [t, []]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Shell ----------
app.innerHTML = `
  <div class="statusbar" data-action-hold="proto-menu"><span class="sb-time"></span><span class="island"></span>
    <span class="sb-icons"><svg width="18" height="12" viewBox="0 0 18 12"><rect y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" width="3" height="12" rx="1" fill="#fff"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9.1a3.4 3.4 0 0 1 4.8 0zM2.9 6.4a7.2 7.2 0 0 1 10.2 0l-1.4 1.4a5.2 5.2 0 0 0-7.4 0zM.2 3.7a11 11 0 0 1 15.6 0l-1.4 1.4a9 9 0 0 0-12.8 0z" fill="#fff"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="#fff" stroke-opacity=".4" fill="none"/><rect x="2" y="2" width="16" height="9" rx="2" fill="#fff"/><path d="M24.5 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="#fff" fill-opacity=".4"/></svg></span></div>
  <div class="views">${TABS.map((t) => `<div class="tabview" data-tabview="${t}"></div>`).join('')}</div>
  <div class="mini" data-action="open-player" role="button" aria-label="Open player">
    <button class="mini-pp" data-action="toggle" aria-label="Play or pause">
      <svg class="ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21.5" class="ring-track"/><circle cx="24" cy="24" r="21.5" class="ring-fill" stroke-dasharray="135.1" stroke-dashoffset="135.1"/></svg>
      <span class="pp-dot">${icon('play', 18)}${icon('pause', 18)}</span></button>
    <div class="mini-ad-art"><img src="${ART.ad}" alt=""></div>
    <div class="mini-text"><div class="mini-title"></div><div class="mini-sub"></div></div>
    <button class="icon-btn mini-dev" data-action="sheet-devices" aria-label="Connect to a device">${icon('devices', 22)}</button>
    <button class="icon-btn like-btn mini-like" data-action="like-current" data-like-cur aria-label="Like">${icon('heart', 22)}${icon('heart-fill', 22)}</button>
    <button class="visit-pill" data-action="visit-site">Visit site</button>
    <span class="countdown"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="ring-track"/><circle cx="18" cy="18" r="15.5" class="cd-fill" stroke-dasharray="97.4" stroke-dashoffset="97.4"/></svg><b class="cd-num">30</b></span>
  </div>
  <nav class="tabbar">${[['home', 'Home'], ['feed', 'Feed'], ['search', 'Search'], ['library', 'Library'], ['upgrade', 'Upgrade']].map(([t, l]) =>
    `<button class="tab t-${t}" data-action="tab" data-tab="${t}" aria-label="${l}">${t === 'upgrade' ? icon('cloud', 26) : icon(t, 25) + icon(t + '-fill', 25)}<span>${l}</span>${t === 'feed' ? '<i class="tab-dot"></i>' : ''}</button>`).join('')}</nav>
  <section class="player" aria-hidden="true" aria-label="Now playing">
    <div class="pls">
      <div class="pls-bg"><img alt=""></div><div class="pls-scrim"></div><div class="pls-grab"></div>
      <div class="pls-top">
        <div class="pls-meta">
          <div class="pls-title"></div>
          <button class="pls-artist" data-action="artist-current"></button>
          <button class="pls-behind" data-action="toast" data-msg="Behind this track isn't part of this prototype">${icon('audio-lines', 14)} Behind this track</button>
          <button class="save-btn" data-action="save-current" data-save-cur aria-label="Save">${icon('plus', 18, 's-off')}${icon('check', 18, 's-on')}<span class="s-off">Save</span><span class="s-on">Saved</span></button>
        </div>
        <div class="pls-side">
          <button class="circle-btn dark" data-action="close-player" aria-label="Close player">${icon('chevron-down', 22)}</button>
          <button class="icon-btn follow-cur" data-action="follow-current" aria-label="Follow artist">${icon('user-plus', 22, 'f-off')}${icon('user-check', 22, 'f-on')}</button>
          <button class="icon-btn" data-action="sheet-devices" aria-label="Connect to a device">${icon('devices', 22)}</button>
        </div>
      </div>
      <div class="pls-bottom">
        <div class="wave" aria-label="Seek"><svg viewBox="0 0 342 64" preserveAspectRatio="none"><defs><clipPath id="wclip"><rect class="wclip" width="0" height="64"/></clipPath></defs><g class="w-base"></g><g class="w-played" clip-path="url(#wclip)"></g></svg><span class="wave-tip"></span></div>
        <div class="pls-times"><span class="t-pos">0:00</span><span class="t-dur">0:00</span></div>
        <div class="pls-controls">
          <button class="ctl" data-action="prev" aria-label="Back">${icon('prev', 34)}</button>
          <button class="ctl pp" data-action="toggle" aria-label="Play or pause">${icon('play', 30)}${icon('pause', 30)}</button>
          <button class="ctl" data-action="next" aria-label="Skip">${icon('next', 34)}</button>
        </div>
        <button class="comment-bar" data-action="sheet-comments"><span>Comment...</span><span class="emoji">🔥 &nbsp;👏 &nbsp;🥹</span></button>
      </div>
    </div>
    <div class="pls-social">
      <button class="soc like-btn" data-action="like-current" data-like-cur aria-label="Like">${icon('heart', 24)}${icon('heart-fill', 24)}<span class="soc-likes"></span></button>
      <button class="soc" data-action="sheet-comments" aria-label="Comments">${icon('comment', 24)}<span class="soc-comments"></span></button>
      <button class="soc" data-action="sheet-share" aria-label="Share">${icon('share', 24)}</button>
      <button class="soc" data-action="sheet-queue" aria-label="Next up">${icon('queue', 24)}</button>
      <button class="soc" data-action="sheet-track" data-current="1" aria-label="More">${icon('more', 24)}</button>
    </div>
  </section>
  <div class="sheet-layer"></div>
  <div class="toasts" aria-live="polite"></div>`;

const tabviews = Object.fromEntries(TABS.map((t) => [t, $(`[data-tabview="${t}"]`)]));
const mini = $('.mini'), playerEl = $('.player'), sheetLayer = $('.sheet-layer'), toasts = $('.toasts');

// ---------- Device frame scaling and clock ----------
// ?capture renders one plain 390x844 screen for capturing into Figma.
const CAPTURE = new URLSearchParams(location.search).has('capture');
document.body.classList.toggle('capture', CAPTURE);
function fit() {
  if (CAPTURE) { document.body.classList.remove('is-phone'); document.documentElement.style.setProperty('--scale', '1'); return; }
  const phone = window.innerWidth <= 520 && matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('is-phone', phone);
  const s = phone ? 1 : Math.min(1, (window.innerHeight - 32) / 844, (window.innerWidth - 24) / 390);
  document.documentElement.style.setProperty('--scale', s.toFixed(3));
}
fit(); addEventListener('resize', fit);
const clock = () => { const d = new Date(); $('.sb-time').textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
clock(); setInterval(clock, 10000);

// ---------- Navigation ----------
function makePage(route, params = {}) {
  const r = ROUTES[route](params);
  const el = document.createElement('div');
  el.className = 'page' + (r.noScroll ? ' no-scroll' : '');
  el.dataset.route = route;
  el._route = { route, params };
  el.innerHTML = r.html;
  wirePage(el);
  return el;
}
function rootFor(tab) { if (!stacks[tab].length) { const el = makePage(tab); tabviews[tab].appendChild(el); stacks[tab].push(el); } }
function push(route, params) {
  closeSheet();
  if (S.playerOpen) closePlayer();
  const stack = stacks[S.tab], cur = stack[stack.length - 1];
  const el = makePage(route, params);
  el.classList.add('enter');
  tabviews[S.tab].appendChild(el); stack.push(el);
  void el.offsetWidth;
  el.classList.remove('enter'); cur.classList.add('covered');
  sync();
}
function pop() {
  const stack = stacks[S.tab];
  if (stack.length <= 1) return;
  const el = stack.pop(), prevEl = stack[stack.length - 1];
  prevEl.classList.remove('covered');
  el.classList.add('leave');
  setTimeout(() => el.remove(), 360);
}
function switchTab(tab) {
  closeSheet();
  if (S.playerOpen) closePlayer();
  if (tab === S.tab) {
    const stack = stacks[tab];
    if (stack.length > 1) { while (stack.length > 2) stack.splice(1, 1)[0].remove(); pop(); }
    else stack[0].scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (S.tab === 'feed' && player.previewEnd) player.pause();
  tabviews[S.tab].classList.remove('active');
  S.tab = tab; rootFor(tab);
  tabviews[tab].classList.add('active');
  if (tab === 'library') refreshRoutes(['library']);
  $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  app.classList.toggle('on-feed', tab === 'feed');
  if (tab === 'feed') $('.tab-dot')?.remove();
}
// Re-render pages whose content depends on state (keeps scroll position).
function refreshRoutes(routes) {
  TABS.forEach((t) => stacks[t].forEach((el, i) => {
    if (!routes.includes(el.dataset.route)) return;
    const fresh = makePage(el._route.route, el._route.params);
    fresh.className = el.className;
    const top = el.scrollTop;
    el.replaceWith(fresh); stacks[t][i] = fresh; fresh.scrollTop = top;
  }));
  sync();
}
function wirePage(el) {
  el.addEventListener('scroll', () => el.classList.toggle('scrolled', el.scrollTop > 36), { passive: true });
  if (el.dataset.route === 'search') wireSearch(el);
  if (el.dataset.route === 'feed') wireFeed(el);
  el.querySelectorAll('[data-input="filter"]').forEach((inp) => inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase();
    el.querySelectorAll(`[data-list="${inp.dataset.list}"] .track-row`).forEach((row) => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  }));
  // Swipe from the left edge to go back. Dragging starts only after a real
  // horizontal move, so taps on the Back button still work.
  let sx = null, dx = 0, dragging = false;
  el.addEventListener('pointerdown', (e) => {
    const r = el.getBoundingClientRect();
    if (stacks[S.tab].length > 1 && el === stacks[S.tab].at(-1) && (e.clientX - r.left) / r.width < 0.08) { sx = e.clientX; dx = 0; dragging = false; }
  });
  el.addEventListener('pointermove', (e) => {
    if (sx === null) return;
    dx = Math.max(0, e.clientX - sx);
    if (!dragging && dx > 12) { dragging = true; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; }
    if (dragging) el.style.transform = `translateX(${dx / scale()}px)`;
  });
  const end = () => {
    if (sx === null) return;
    sx = null;
    if (!dragging) return;
    dragging = false; el.style.transition = ''; el.style.transform = '';
    if (dx > 90) pop();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
const scale = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;

// ---------- Search ----------
function wireSearch(el) {
  const inp = el.querySelector('[data-input="search"]'), res = el.querySelector('.search-results');
  const render = () => { res.innerHTML = searchResults(inp.value); sync(); };
  inp.addEventListener('focus', () => { el.classList.add('searching'); render(); });
  inp.addEventListener('input', () => { el.classList.toggle('has-q', !!inp.value); render(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inp.value.trim()) { S.recentSearches = [inp.value.trim(), ...S.recentSearches.filter((r) => r !== inp.value.trim())].slice(0, 6); inp.blur(); }
  });
}
function setSearch(q) {
  const el = stacks.search[0], inp = el.querySelector('[data-input="search"]');
  inp.value = q; el.classList.add('searching'); el.classList.toggle('has-q', !!q);
  el.querySelector('.search-results').innerHTML = searchResults(q); sync();
}

// ---------- Feed ----------
let feedObserver;
function wireFeed(el) {
  feedObserver?.disconnect();
  feedObserver = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting && en.target.dataset.feed === player.trackId && player.previewEnd) player.pause();
  }), { root: el.querySelector('.feed-scroller'), threshold: 0.5 });
  el.querySelectorAll('.feed-card').forEach((c) => feedObserver.observe(c));
  // Double-tap a card to like it, like the real app
  el.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.feed-card[data-feed]');
    if (!card) return;
    const id = card.dataset.feed;
    if (!S.liked.has(id)) toggleLike(id);
    const h = document.createElement('div'); h.className = 'burst'; h.innerHTML = icon('heart-fill', 96);
    h.style.left = `${(e.clientX - card.getBoundingClientRect().left) / scale() - 48}px`;
    h.style.top = `${(e.clientY - card.getBoundingClientRect().top) / scale() - 48}px`;
    card.appendChild(h); setTimeout(() => h.remove(), 800);
  });
}

// ---------- Player (redesigned Now Playing) ----------
function openPlayer() {
  if (player.ad) return openAdSheet();
  if (!player.trackId) return;
  S.playerOpen = true; playerEl.classList.add('open'); playerEl.setAttribute('aria-hidden', 'false'); app.classList.add('player-open');
}
function closePlayer() {
  S.playerOpen = false; playerEl.classList.remove('open'); playerEl.setAttribute('aria-hidden', 'true'); app.classList.remove('player-open');
  playerEl.style.transform = '';
}
function renderPlayerTrack() {
  const t = getTrack(player.trackId);
  if (!t) return;
  const a = ARTISTS[t.artist];
  $('.pls-bg img').src = t.art;
  $('.pls-title').textContent = t.fullTitle && t.id === 'headlines' ? t.fullTitle : t.title;
  $('.pls-artist').textContent = t.by;
  $('.mini-title').textContent = t.title;
  $('.mini-sub').textContent = t.by;
  $('.soc-comments').textContent = fmtCount(t.comments + (S.userComments[t.id] || []).length);
  $('.follow-cur').dataset.follow = a.id;
  const bars = waveform(t.id), w = 342 / bars.length;
  const g = (cls) => bars.map((v, i) => `<rect x="${(i * w).toFixed(2)}" y="${(44 - v * 40).toFixed(1)}" width="${(w * 0.62).toFixed(2)}" height="${(v * 40).toFixed(1)}" rx=".6"/><rect class="refl" x="${(i * w).toFixed(2)}" y="45.5" width="${(w * 0.62).toFixed(2)}" height="${(v * 14).toFixed(1)}"/>`).join('');
  $('.w-base').innerHTML = g(); $('.w-played').innerHTML = g();
  $('.t-dur').textContent = fmtTime(player.dur);
  sync();
}
// Seek by tapping or dragging the waveform
(() => {
  const wave = $('.wave'); let drag = false;
  const ratio = (e) => { const r = wave.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  wave.addEventListener('pointerdown', (e) => { if (player.ad) return; drag = true; wave.setPointerCapture(e.pointerId); wave.classList.add('drag'); showSeek(ratio(e)); });
  wave.addEventListener('pointermove', (e) => drag && showSeek(ratio(e)));
  wave.addEventListener('pointerup', (e) => { if (!drag) return; drag = false; wave.classList.remove('drag'); player.seek(ratio(e) * player.dur); });
  function showSeek(r) { $('.wclip').setAttribute('width', 342 * r); $('.t-pos').textContent = fmtTime(r * player.dur); $('.wave-tip').style.left = `${r * 100}%`; $('.wave-tip').textContent = fmtTime(r * player.dur); }
  wave._drag = () => drag;
})();
// Drag the player down to close it
(() => {
  let sy = null, dy = 0;
  const grab = $('.pls-top');
  grab.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sy = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); playerEl.style.transition = 'none'; });
  grab.addEventListener('pointermove', (e) => { if (sy === null) return; dy = Math.max(0, (e.clientY - sy) / scale()); playerEl.style.transform = `translateY(${dy}px)`; });
  grab.addEventListener('pointerup', () => { if (sy === null) return; sy = null; playerEl.style.transition = ''; playerEl.style.transform = ''; if (dy > 120) closePlayer(); });
})();

// ---------- Mini player / ad state ----------
function renderMini() {
  const ad = player.ad;
  mini.classList.toggle('ad', !!ad);
  mini.classList.toggle('empty', !player.trackId && !ad);
  if (ad) {
    $('.mini-title').textContent = 'Ad · Brightside Coffee';
    $('.mini-sub').textContent = `Playing after ad: ${getTrack(ad.upNext).title}`;
    mini.setAttribute('aria-label', 'Ad playing. Open ad details');
  } else if (player.trackId) {
    const t = getTrack(player.trackId);
    $('.mini-title').textContent = t.title; $('.mini-sub').textContent = t.by;
    mini.setAttribute('aria-label', `Open player for ${t.title}`);
  }
}

// ---------- Sheets ----------
function openSheet(html, { cls = '', onMount } = {}) {
  sheetLayer.innerHTML = `<div class="backdrop" data-action="close-sheet"></div><div class="sheet ${cls}" role="dialog"><div class="grab"></div>${html}</div>`;
  sheetLayer.classList.add('open');
  const sheet = $('.sheet', sheetLayer);
  requestAnimationFrame(() => sheetLayer.classList.add('show'));
  let sy = null, dy = 0;
  const g = $('.grab', sheet);
  g.addEventListener('pointerdown', (e) => { sy = e.clientY; g.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
  g.addEventListener('pointermove', (e) => { if (sy === null) return; dy = Math.max(0, (e.clientY - sy) / scale()); sheet.style.transform = `translateY(${dy}px)`; });
  g.addEventListener('pointerup', () => { sy = null; sheet.style.transition = ''; sheet.style.transform = ''; if (dy > 80) closeSheet(); dy = 0; });
  onMount && onMount(sheet);
  sync();
}
function closeSheet() {
  if (!sheetLayer.classList.contains('open')) return;
  sheetLayer.classList.remove('show');
  setTimeout(() => { if (!sheetLayer.classList.contains('show')) { sheetLayer.classList.remove('open'); sheetLayer.innerHTML = ''; } }, 300);
}
const sheetHead = (t) => `<div class="sh-track"><img src="${t.art}" alt=""><div><div class="row-title">${esc(t.title)}</div><div class="row-sub">${esc(t.by)}</div></div></div>`;
const sItem = (ic, label, action, extra = '') => `<button class="sh-item tap" data-action="${action}" ${extra}>${icon(ic, 22)}<span>${label}</span></button>`;

function openCommentsSheet(id) {
  const t = getTrack(id);
  const list = [...(S.userComments[id] || []), ...commentsFor(t)];
  openSheet(`<div class="sh-title">${fmtCount(t.comments + (S.userComments[id] || []).length)} comments</div>
    <div class="comments">${list.map((c) => `<div class="cmt"><div class="cmt-av" style="background:hsl(${[...c.user].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360} 60% 45%)">${c.user[0].toUpperCase()}</div><div class="cmt-body"><div class="cmt-meta"><b>${esc(c.user)}</b> at ${fmtTime(c.at * 1000)} · ${c.ago}</div><div>${esc(c.text)}</div></div><button class="cmt-like" data-action="noop" aria-label="Like comment">${icon('heart', 16)}<span>${c.likes || ''}</span></button></div>`).join('')}</div>
    <form class="cmt-form"><input placeholder="Comment at ${fmtTime(player.trackId === id ? player.position() : 0)}" aria-label="Add a comment" maxlength="140"><button type="submit" aria-label="Post">${icon('send', 20)}</button></form>`,
  { cls: 'tall', onMount: (sh) => {
    $('.cmt-form', sh).addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('input', sh).value.trim(); if (!v) return;
      (S.userComments[id] ||= []).unshift({ user: 'you', text: v, at: Math.floor((player.trackId === id ? player.position() : 0) / 1000), ago: 'now', likes: 0 });
      openCommentsSheet(id); renderPlayerTrack(); toast('Comment posted');
    });
    sh.querySelectorAll('.cmt-like').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
  } });
}
function openShareSheet({ track, playlist, artist }) {
  const what = track ? getTrack(track) : playlist ? getPlaylist(playlist) : getArtist(artist);
  const link = (what && what.sc) || 'https://soundcloud.com';
  const targets = [['Copy link', '#555', 'link'], ['Messages', '#34c759', 'message'], ['Instagram', '#e1306c', 'plus-square'], ['Snapchat', '#fffc00', 'user'], ['WhatsApp', '#25d366', 'phone'], ['X', '#000', 'x'], ['Facebook', '#1877f2', 'user'], ['More', '#555', 'more']];
  openSheet(`<div class="sh-title">Share</div>${track ? sheetHead(what) : ''}
    <div class="share-grid">${targets.map(([n, c, ic], i) => `<button class="share-t" data-action="${i === 0 ? 'copy-link' : 'toast'}" data-link="${link}" data-msg="Sharing to ${n} isn't part of this prototype"><span style="background:${c};color:${c === '#fffc00' ? '#000' : '#fff'}">${icon(ic, 24)}</span>${n}</button>`).join('')}</div>`);
}
function openQueueSheet() {
  const up = S.queue.slice(S.qi + 1);
  openSheet(`<div class="sh-title">Next up</div>
    <div class="q-now">${player.trackId ? sheetHead(getTrack(player.trackId)) : ''}<span class="q-tag">Playing</span></div>
    <div class="sh-sub">Up next</div>
    ${up.length ? up.map((id, i) => `<button class="row tap" data-action="queue-jump" data-index="${S.qi + 1 + i}"><div class="row-art"><img src="${getTrack(id).art}" alt=""></div><div class="row-main"><div class="row-title">${esc(getTrack(id).title)}</div><div class="row-sub">${esc(getTrack(id).by)}</div></div>${icon('queue', 18, 'dim')}</button>`).join('') : '<p class="note">Nothing queued. Related tracks will play next.</p>'}
    <label class="toggle-row"><span>Autoplay related tracks</span><input type="checkbox" ${S.autoplayRelated ? 'checked' : ''} data-input="autoplay"><i></i></label>`,
  { cls: 'tall', onMount: (sh) => $('[data-input="autoplay"]', sh).addEventListener('change', (e) => { S.autoplayRelated = e.target.checked; }) });
}
function openTrackSheet(id) {
  const t = getTrack(id), a = ARTISTS[t.artist];
  openSheet(`${sheetHead(t)}<div class="sh-list">
    ${sItem(S.liked.has(id) ? 'heart-fill' : 'heart', S.liked.has(id) ? 'Unlike' : 'Like', 'like', `data-track="${id}" data-close="1"`)}
    ${sItem(S.saved.has(id) ? 'check' : 'plus', S.saved.has(id) ? 'Remove from Saved songs' : 'Save', 'save', `data-track="${id}" data-close="1"`)}
    ${sItem('list-plus', 'Add to playlist', 'sheet-add', `data-track="${id}"`)}
    ${sItem('queue', 'Play next', 'play-next', `data-track="${id}"`)}
    ${sItem('user', `Go to ${esc(a.name)}`, 'open-artist', `data-id="${a.id}"`)}
    ${sItem('radio', 'Go to station', 'open-playlist', `data-id="${{ drake: 'station-drake', gunna: 'station-gunna', travis: 'station-travis' }[a.id] || 'related-highest'}"`)}
    ${sItem('share', 'Share', 'sheet-share', `data-track="${id}"`)}
    ${sItem('flag', 'Report', 'toast', 'data-msg="Thanks. Reports aren\'t sent from this prototype."')}</div>`);
}
function openAddSheet(id) {
  const t = getTrack(id);
  openSheet(`<div class="sh-title">Add to playlist</div>${sheetHead(t)}
    <button class="row tap" data-action="create-playlist" data-track="${id}"><div class="row-art add">${icon('plus', 24)}</div><div class="row-main"><div class="row-title">Create playlist</div></div></button>
    ${S.myPlaylists.map((pid) => { const p = getPlaylist(pid); const has = p.tracks.includes(id); return `<button class="row tap" data-action="add-to" data-id="${pid}" data-track="${id}"><div class="row-art"><img src="${p.art}" alt=""></div><div class="row-main"><div class="row-title">${esc(p.title)}</div><div class="row-sub">${p.tracks.length} ${p.tracks.length === 1 ? 'track' : 'tracks'}</div></div>${has ? icon('check', 20) : ''}</button>`; }).join('')}`);
}
function openCreatePlaylist(trackId) {
  openSheet(`<div class="sh-title">New playlist</div><form class="new-pl"><input placeholder="Playlist name" maxlength="40" aria-label="Playlist name" required><button class="pill-btn orange" type="submit">Create</button></form>`, {
    onMount: (sh) => {
      const inp = $('input', sh); setTimeout(() => inp.focus(), 320);
      $('form', sh).addEventListener('submit', (e) => {
        e.preventDefault();
        const name = inp.value.trim(); if (!name) return;
        const id = 'my-' + Date.now();
        PLAYLISTS[id] = { id, title: name, by: 'User 1', art: trackId ? getTrack(trackId).art : ART.daily, tracks: trackId ? [trackId] : [], mine: true };
        S.myPlaylists.unshift(id); closeSheet(); refreshRoutes(['library', 'playlists']);
        toast(trackId ? `Added to ${name}` : `Created ${name}`, { label: 'View', fn: () => push('playlist', { id }) });
      });
    },
  });
}
function openDevicesSheet() {
  openSheet(`<div class="sh-title">Connect to a device</div><div class="sh-list">
    <button class="sh-item on">${icon('phone', 22)}<span>This iPhone</span>${icon('check', 20)}</button>
    ${sItem('airplay', 'AirPlay or Bluetooth', 'toast', 'data-msg="No nearby devices found"')}
    ${sItem('devices', 'Chromecast', 'toast', 'data-msg="No Chromecast devices found"')}</div>`);
}
function openAdSheet() {
  openSheet(`<div class="ad-sheet"><img src="${ART.ad}" alt=""><div class="ad-tag">Ad</div><h3>Brightside Coffee</h3><p>Wake up to something bright. Fresh roasts, delivered weekly.</p>
    <button class="pill-btn white" data-action="visit-site">Visit site</button><p class="note">Your music continues in <b class="ad-left">30</b>s. Keep browsing while you wait.</p></div>`);
}
function openPaywall(variant) {
  openSheet(`<button class="sheet-x circle-btn" data-action="close-sheet" aria-label="Close">${icon('x', 22)}</button>${paywallBody(variant)}`, { cls: 'full' });
}
function openProtoMenu() {
  openSheet(`<div class="sh-title">Prototype menu</div><p class="note">For the research team. Each task link restarts the prototype in that task's starting state.</p><div class="sh-list">
    ${[1, 2, 3, 4].map((n) => sItem('play', `Start Task ${n}`, 'task', `data-n="${n}"`)).join('')}
    ${sItem('sparkle', 'Play an ad now', 'play-ad')}
    ${sItem('home', 'Free exploration (reset)', 'task', 'data-n="0"')}</div>`);
}

// ---------- Toasts ----------
function toast(msg, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon('check', 18, 'toast-ic')}<span>${msg}</span>${action ? `<button>${action.label}</button>` : ''}`;
  if (action) el.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); el.remove(); action.fn(); });
  toasts.innerHTML = ''; toasts.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  if (CAPTURE) return;
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, action ? 4200 : 2600);
}

// ---------- Likes, saves, follows ----------
function toggleLike(id) {
  S.liked.has(id) ? S.liked.delete(id) : S.liked.add(id);
  $$(`[data-like="${id}"], ${player.trackId === id ? '[data-like-cur]' : 'x-none'}`).forEach((b) => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
  refreshRoutes(['likes', 'insights']);
}
// Fix 2: Save has its own button and a clear confirmation, separate from the social like.
function toggleSave(id) {
  if (S.saved.has(id)) { S.saved.delete(id); toast('Removed from your Library'); }
  else {
    S.saved.add(id); S.savedOrder = [id, ...S.savedOrder.filter((x) => x !== id)];
    toast('Saved to your Library', { label: 'View', fn: () => { closePlayer(); switchTab('library'); push('saved'); } });
  }
  $$('[data-save-cur]').forEach((b) => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
  refreshRoutes(['saved', 'insights']);
}
function toggleFollow(aid) {
  const a = getArtist(aid);
  if (S.following.has(aid)) { S.following.delete(aid); toast(`Unfollowed ${a.name}`); }
  else { S.following.add(aid); toast(`Following ${a.name}`); }
  refreshRoutes(['following', 'profile']);
}

// ---------- State → DOM ----------
function sync() {
  const cur = player.trackId, playing = player.playing && !player.ad;
  $$('[data-now]').forEach((el) => { const on = el.dataset.now === cur; el.classList.toggle('is-now', on); el.classList.toggle('is-playing', on && playing); });
  $$('[data-like]').forEach((el) => el.classList.toggle('on', S.liked.has(el.dataset.like)));
  $$('[data-like-cur]').forEach((el) => el.classList.toggle('on', !!cur && S.liked.has(cur)));
  $$('[data-save-cur]').forEach((el) => el.classList.toggle('on', !!cur && S.saved.has(cur)));
  $$('[data-likecount]').forEach((el) => { el.textContent = fmtCount(likeCount(getTrack(el.dataset.likecount))); });
  $$('[data-follow]').forEach((el) => el.classList.toggle('on', S.following.has(el.dataset.follow)));
  $$('[data-plike]').forEach((el) => el.classList.toggle('on', S.likedPlaylists.has(el.dataset.plike)));
  $$('[data-playctx]').forEach((el) => el.classList.toggle('on', S.ctx === el.dataset.playctx && playing));
  $$('[data-playbtn]').forEach((el) => el.classList.toggle('on', el.dataset.playbtn === cur && playing));
  if (cur) $('.soc-likes').textContent = fmtCount(likeCount(getTrack(cur)));
  app.classList.toggle('is-playing', playing);
  renderMini();
}

// ---------- Actions ----------
const actions = {
  tab: (d) => switchTab(d.tab),
  push: (d) => push(d.route),
  back: () => pop(),
  'open-playlist': (d) => { S.recent = [d.id, ...S.recent.filter((x) => x !== d.id)].slice(0, 8); push('playlist', { id: d.id }); },
  'open-artist': (d) => push('artist', { id: d.id }),
  'open-genre': (d) => push('genre', { id: d.id }),
  'artist-current': () => player.trackId && push('artist', { id: getTrack(player.trackId).artist }),
  'play-list': (d) => {
    const ids = LISTS[d.ctx]; if (!ids || !ids.length) return;
    const i = +d.index || 0;
    if (S.ctx === d.ctx && player.trackId === ids[i]) return player.toggle();
    if (d.playctx && S.ctx === d.ctx) return player.toggle();
    playFrom(ids, i, d.ctx);
  },
  'shuffle-list': (d) => { const ids = [...(LISTS[d.ctx] || [])].sort(() => Math.random() - 0.5); if (ids.length) { playFrom(ids, 0, d.ctx); toast('Shuffling'); } },
  'play-track': (d) => playTrack(d.track),
  'play-next': (d) => { closeSheet(); if (!player.trackId) return playTrack(d.track); S.queue.splice(S.qi + 1, 0, d.track); toast(`${getTrack(d.track).title} will play next`); },
  'queue-jump': (d) => { S.qi = +d.index; player.load(S.queue[S.qi], { autoplay: true }); closeSheet(); },
  toggle: () => player.toggle(),
  next: () => next(),
  prev: () => prev(),
  'open-player': () => openPlayer(),
  'close-player': () => closePlayer(),
  like: (d) => { toggleLike(d.track); if (d.close) closeSheet(); },
  'like-current': () => player.trackId && !player.ad && toggleLike(player.trackId),
  save: (d) => { toggleSave(d.track); if (d.close) closeSheet(); },
  'save-current': () => player.trackId && toggleSave(player.trackId),
  follow: (d) => toggleFollow(d.artist),
  'follow-current': () => player.trackId && toggleFollow(getTrack(player.trackId).artist),
  'like-playlist': (d) => { const on = S.likedPlaylists.has(d.id); on ? S.likedPlaylists.delete(d.id) : S.likedPlaylists.add(d.id); toast(on ? 'Removed from your liked playlists' : 'Added to your liked playlists'); refreshRoutes(['playlists']); },
  chip: (d, el) => {
    S.chip = d.chip;
    const page = el.closest('.page');
    $$('.chip', page).forEach((c) => c.classList.toggle('on', c === el));
    const list = $('.trend-list', page); list.classList.remove('swap'); void list.offsetWidth; list.innerHTML = renderTrending(); list.classList.add('swap');
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  },
  'feed-tab': (d) => {
    S.feedTab = d.tab;
    const page = stacks.feed[0]; if (!page) return;
    $$('.seg button', page).forEach((b) => b.classList.toggle('on', b.dataset.tab === d.tab));
    const sc = $('.feed-scroller', page); sc.innerHTML = feedCards(d.tab); sc.scrollTop = 0; wireFeed(page);
  },
  'feed-preview': (d) => {
    if (player.trackId === d.track && player.playing) return player.pause();
    S.queue = [d.track]; S.qi = 0; S.ctx = 'feed';
    player.load(d.track, { autoplay: true, startMs: Math.min(45000, getTrack(d.track).dur / 3), preview: true });
  },
  'genre-tab': (d, el) => {
    const page = el.closest('.page'), btn = $(`.tabs-u [data-tab="${d.tab}"]`, page);
    $$('.tabs-u button', page).forEach((b) => b.classList.toggle('on', b === btn));
    $$('.pane', page).forEach((p) => p.classList.toggle('on', p.dataset.pane === d.tab));
    $('.tabs-ink', page).style.transform = `translateX(${['all', 'trending', 'playlists', 'albums'].indexOf(d.tab) * 100}%)`;
    if (el !== btn) page.scrollTo({ top: 0, behavior: 'smooth' });
  },
  'sheet-comments': (d) => openCommentsSheet(d.track || player.trackId),
  'sheet-share': (d) => openShareSheet(d.track || d.playlist || d.artist ? d : { track: player.trackId }),
  'sheet-queue': () => openQueueSheet(),
  'sheet-track': (d) => openTrackSheet(d.current ? player.trackId : d.track),
  'sheet-devices': () => openDevicesSheet(),
  'sheet-add': (d) => openAddSheet(d.track),
  'create-playlist': (d) => openCreatePlaylist(d.track),
  'add-to': (d) => { const p = getPlaylist(d.id); if (!p.tracks.includes(d.track)) p.tracks.push(d.track); closeSheet(); toast(`Added to ${p.title}`); refreshRoutes(['library', 'playlists']); },
  paywall: (d) => openPaywall(d.variant),
  'visit-site': () => toast("Ads link out in the real app. This one doesn't."),
  'copy-link': (d) => { navigator.clipboard?.writeText(d.link).catch(() => {}); closeSheet(); toast('Link copied'); },
  toast: (d) => toast(d.msg),
  'close-sheet': () => closeSheet(),
  'proto-menu': () => openProtoMenu(),
  task: (d) => { location.search = d.n === '0' ? '' : `?task=${d.n}`; },
  'play-ad': () => { closeSheet(); player.startAd({ upNext: player.trackId || 'headlines' }); },
  'search-set': (d) => setSearch(d.q),
  'search-clear': () => setSearch(''),
  'search-cancel': () => { const el = stacks.search[0]; const inp = $('[data-input="search"]', el); inp.value = ''; inp.blur(); el.classList.remove('searching', 'has-q'); },
  noop: () => {},
};
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !app.contains(el)) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.dataset.action) e.preventDefault();
  const fn = actions[el.dataset.action];
  if (fn) { fn(el.dataset, el); sync(); }
});
// Drag carousels and chip rows with the mouse, the way a finger swipes them on a
// phone. Touch already scrolls natively, so this only handles mouse pointers.
(() => {
  const ROWS = '.carousel, .chips';
  let row = null, sx = 0, sl = 0, moved = false, swallow = false;
  app.addEventListener('dragstart', (e) => { if (e.target.closest(ROWS)) e.preventDefault(); });
  app.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    row = e.target.closest(ROWS);
    if (row) { sx = e.clientX; sl = row.scrollLeft; moved = false; }
  });
  const end = () => {
    if (!row) return;
    const r = row; row = null;
    if (!moved) return;
    // Glide to the nearest card, then hand snapping back to CSS.
    const base = r.getBoundingClientRect().left, s = scale(), pad = parseFloat(getComputedStyle(r).scrollPaddingLeft) || 0;
    const max = r.scrollWidth - r.clientWidth;
    const stops = [...r.children].map((c) => Math.min(max, Math.max(0, (c.getBoundingClientRect().left - base) / s + r.scrollLeft - pad)));
    const to = r.classList.contains('carousel') && stops.length ? stops.reduce((a, b) => (Math.abs(b - r.scrollLeft) < Math.abs(a - r.scrollLeft) ? b : a)) : r.scrollLeft;
    r.scrollTo({ left: to, behavior: 'smooth' });
    setTimeout(() => r.classList.remove('dragging'), 400);
    swallow = true; setTimeout(() => { swallow = false; });
  };
  addEventListener('pointermove', (e) => {
    if (!row) return;
    if (!(e.buttons & 1)) return end(); // released outside the window
    const dx = (e.clientX - sx) / scale();
    if (!moved && Math.abs(dx) > 6) { moved = true; row.classList.add('dragging'); }
    if (moved) row.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  // The click that ends a drag shouldn't open the card under the mouse.
  app.addEventListener('click', (e) => { if (swallow) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
})();
// Hold the clock in the status bar (or press the backtick key) to open the prototype menu.
(() => { let t; const sb = $('.statusbar'); sb.addEventListener('pointerdown', () => { t = setTimeout(openProtoMenu, 700); }); ['pointerup', 'pointerleave'].forEach((ev) => sb.addEventListener(ev, () => clearTimeout(t))); })();
addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  if (e.key === '`') openProtoMenu();
  if (e.key === ' ' && player.trackId) { e.preventDefault(); player.toggle(); sync(); }
  if (e.key === 'Escape') { closeSheet(); if (S.playerOpen) closePlayer(); }
});
// Browsers allow sound only inside a real tap or key press. On phones that's when the finger
// lifts, not when it lands, so skip events that don't count yet instead of failing silently.
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
function tryUnlock(e) {
  const ua = navigator.userActivation;
  if (ua ? !ua.isActive : e.type === 'pointerdown' && e.pointerType !== 'mouse') return;
  player.unlock();
  UNLOCK_EVENTS.forEach((ev) => removeEventListener(ev, tryUnlock, true));
}
UNLOCK_EVENTS.forEach((ev) => addEventListener(ev, tryUnlock, true));

// ---------- Player events ----------
player.on('track', (id) => { addToHistory(id); renderPlayerTrack(); refreshRoutes(['library', 'history', 'insights']); });
player.on('state', () => sync());
player.on('duration', () => { $('.t-dur').textContent = fmtTime(player.dur); });
player.on('ended', () => next());
player.on('previewEnd', () => sync());
player.on('notice', (m) => toast(m));
player.on('ad', () => { closePlayer(); sync(); });
player.on('adEnd', () => { closeSheet(); sync(); });

// ---------- Frame loop: progress ring, waveform, times, ad countdown, feed preview ----------
let lastSec = -1;
function frame() {
  player.tick();
  if (player.ad) {
    const rem = player.remaining(), frac = 1 - rem / player.ad.total;
    $('.cd-num').textContent = Math.ceil(rem / 1000);
    $('.cd-fill').setAttribute('stroke-dashoffset', (97.4 * (1 - frac)).toFixed(1));
    const left = $('.ad-left'); if (left) left.textContent = Math.ceil(rem / 1000);
  } else if (player.trackId) {
    const pos = player.position(), dur = player.dur || 1, r = Math.min(1, pos / dur);
    $('.ring-fill').setAttribute('stroke-dashoffset', (135.1 * (1 - r)).toFixed(1));
    if (!$('.wave')._drag()) {
      $('.wclip').setAttribute('width', (342 * r).toFixed(1));
      const sec = Math.floor(pos / 1000);
      if (sec !== lastSec) { lastSec = sec; $('.t-pos').textContent = fmtTime(pos); }
    }
    if (S.tab === 'feed') {
      $$('.feed-card[data-feed]').forEach((c) => {
        const on = c.dataset.feed === player.trackId && player.playing;
        c.classList.toggle('previewing', on);
        if (on) { const start = Math.min(45000, dur / 3); c.querySelector('.feed-progress i').style.width = `${Math.max(0, Math.min(1, (pos - start) / 30000)) * 100}%`; }
      });
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Start state (task links for usability testing) ----------
const params = new URLSearchParams(location.search);
const task = params.get('task');
const adSeconds = +params.get('adsec') || 30;
TABS.forEach(rootFor);
tabviews.home.classList.add('active');
$('.tab.t-home').classList.add('on');
if (task === '1') {
  playFrom(PLAYLISTS['related-headlines'].tracks, 0, 'pl-related-headlines', { autoplay: true, startMs: 62000 });
} else if (task === '2') {
  playFrom(['nightdrive', 'highest', 'wgft', 'proveit'], 0, null, { autoplay: true, startMs: 84000 });
} else if (task === '3') {
  S.saved.add('nightdrive'); S.savedOrder = ['nightdrive'];
  addToHistory('nightdrive');
  playFrom(PLAYLISTS['related-headlines'].tracks, 0, 'pl-related-headlines', { autoplay: false });
} else if (task === '4') {
  S.queue = PLAYLISTS['related-headlines'].tracks.slice(); S.qi = 0; S.ctx = 'pl-related-headlines';
  player.startAd({ upNext: 'headlines', seconds: adSeconds });
} else {
  playFrom(PLAYLISTS['related-highest'].tracks, 0, 'pl-related-highest', { autoplay: false });
}
refreshRoutes(['library']);
sync();
// A task that opens with music playing stays silent until the first tap, and that tap is often
// on Pause, which turns the sound on and straight off. So ask for one tap before the task starts.
if ((player.playing || player.ad) && !CAPTURE) {
  const gate = document.createElement('button');
  gate.className = 'tap-start';
  gate.innerHTML = `${icon('volume', 40)}<b>Tap to start</b><span>Turn your sound on</span>`;
  gate.addEventListener('click', () => { gate.classList.add('gone'); setTimeout(() => gate.remove(), 300); });
  app.appendChild(gate);
}
requestAnimationFrame(frame);
// Animation frames pause in background tabs; keep ads and track endings on time anyway.
setInterval(() => { if (document.hidden) player.tick(); }, 500);
window.__proto = { S, player };
