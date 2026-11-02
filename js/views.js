// Screen renderers. Each returns { html, mount? } and uses data-action attributes
// that main.js handles with one delegated click listener.
import { TRACKS, ARTISTS, PLAYLISTS, HOME, TREND_CHIPS, GENRES, NOTIFICATIONS, ME, ART, getTrack, getPlaylist, getArtist, fmtCount, fmtTime } from './data.js';
import { icon } from './icons.js';
import { S, likeCount } from './store.js';

// Lists rendered on screen, so a tapped row can play the right queue.
export const LISTS = {};
const reg = (key, ids) => { LISTS[key] = ids.slice(); return key; };

const img = (src, cls = '') => `<img src="${src}" alt="" class="${cls}" loading="lazy" draggable="false">`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const verified = (a) => (a && a.verified ? `<span class="vbadge">${icon('verified', 15)}</span>` : '');
const artistOf = (t) => ARTISTS[t.artist];
const minutes = (ids) => Math.round(ids.reduce((a, id) => a + getTrack(id).dur, 0) / 60000);

// ---------- Shared pieces ----------
export function trackRow(id, ctx, index, opts = {}) {
  const t = getTrack(id);
  const sub2 = opts.plays ? `<div class="row-sub sm">${icon('play', 10)} ${fmtCount(t.plays)} · ${fmtTime(t.dur)}</div>` : opts.dur ? `<div class="row-sub sm">${fmtTime(t.dur)}</div>` : '';
  return `<div class="row track-row tap" data-action="play-list" data-ctx="${ctx}" data-index="${index}" data-now="${id}">
    <div class="row-art ${opts.round ? 'round' : ''}">${img(t.art)}<span class="eq"><i></i><i></i><i></i></span></div>
    <div class="row-main"><div class="row-title">${esc(opts.full && t.fullTitle ? t.fullTitle : t.title)}</div><div class="row-sub">${esc(opts.uploader ? t.uploader : t.by)}</div>${sub2}</div>
    <button class="icon-btn row-more" data-action="sheet-track" data-track="${id}" aria-label="More options for ${esc(t.title)}">${icon('more', 20)}</button>
  </div>`;
}
const sectionHead = (title, seeAll) => `<div class="sec-head"><h2 class="sec-title">${title}</h2>${seeAll ? `<button class="see-all" ${seeAll}>See all</button>` : ''}</div>`;
const carousel = (items, cls = '') => `<div class="carousel ${cls}">${items.join('')}</div>`;

function cardFor(pid, captionMode = 'caption') {
  const p = getPlaylist(pid);
  const cap = captionMode === 'title' ? `<div class="card-title">${esc(p.title)}</div><div class="card-sub">${esc(p.by)}</div>`
    : captionMode === 'new' ? `<div class="card-title">${esc(p.title.replace(' & Rap', '…'))}</div><div class="card-sub">New!</div>`
    : `<div class="card-sub two">${esc(p.caption || p.by)}</div>`;
  return `<button class="card tap" data-action="open-playlist" data-id="${pid}"><div class="card-art">${img(p.art)}</div>${cap}</button>`;
}
function mixCard(pid) {
  const p = getPlaylist(pid);
  const colors = { 1: ['#b9a2ff', '#1d1036'], 2: ['#5b8cff', '#071537'], 3: ['#ffffff', '#111'] }[p.mix];
  return `<button class="card tap" data-action="open-playlist" data-id="${pid}"><div class="card-art mix">${img(p.art)}<span class="mix-label" style="background:${colors[0]};color:${colors[1]}">MIX ${p.mix}</span></div><div class="card-sub two">${esc(p.caption)}</div></button>`;
}
function stationCard(pid) {
  const p = getPlaylist(pid);
  return `<button class="card tap" data-action="open-playlist" data-id="${pid}"><div class="card-art station"><div class="station-disc">${img(p.art)}</div><span class="station-tag">STATION</span><span class="station-name">${esc(p.title)}</span></div><div class="card-sub two">Based on ${esc(p.title)}</div></button>`;
}
function tile(item) {
  if (item.type === 'track') {
    const t = getTrack(item.id);
    return `<button class="tile tap" data-action="play-track" data-track="${t.id}" data-now="${t.id}">${img(t.art)}<div><div class="tile-title">${esc(t.title)}</div><div class="tile-sub">${esc(t.by)}</div></div></button>`;
  }
  const p = getPlaylist(item.id);
  return `<button class="tile tap" data-action="open-playlist" data-id="${p.id}">${img(p.art)}<div><div class="tile-title">${esc(p.title)}</div><div class="tile-sub">${esc(p.by)}</div></div></button>`;
}
export function backHeader(title, { right = '', fade = true, center = true } = {}) {
  return `<header class="nav-head ${fade ? 'fade-title' : ''}"><button class="circle-btn" data-action="back" aria-label="Back">${icon('chevron-left', 22)}</button><div class="nav-title ${center ? 'center' : ''}">${esc(title)}</div><div class="nav-right">${right}</div></header>`;
}
const emptyState = (title, body, btn, action) => `<div class="empty"><h3>${title}</h3><p>${body}</p>${btn ? `<button class="pill-btn white" ${action}>${btn}</button>` : ''}</div>`;
const libHeader = (title) => `<header class="topbar"><button class="avatar tap" data-action="push" data-route="profile" aria-label="Your profile">${img(ME.avatar)}</button><button class="plus-pill tap" data-action="paywall">Listen Ad-Free</button><span class="topbar-title show">${title}</span><div class="topbar-icons"><button class="icon-btn" data-action="push" data-route="settings" aria-label="Settings">${icon('gear', 22)}</button></div></header>`;

// ---------- Home ----------
export function renderTrending() {
  const chip = TREND_CHIPS.find((c) => c.id === S.chip) || TREND_CHIPS[0];
  const key = reg('trend-' + chip.id, chip.tracks);
  return chip.tracks.map((id, i) => trackRow(id, key, i)).join('');
}
function home() {
  return {
    html: `
    <header class="topbar home-top">
      <button class="avatar tap" data-action="push" data-route="profile" aria-label="Your profile">${img(ME.avatar)}</button>
      <button class="plus-pill tap" data-action="paywall">Listen Ad-Free</button>
      <span class="topbar-title">Home</span>
      <div class="topbar-icons">
        <button class="icon-btn" data-action="push" data-route="upload" aria-label="Upload">${icon('upload', 22)}</button>
        <button class="icon-btn dot" data-action="push" data-route="notifications" aria-label="Notifications">${icon('bell', 22)}</button>
        <button class="icon-btn" data-action="push" data-route="messages" aria-label="Messages">${icon('message', 22)}</button>
      </div>
    </header>
    <section class="sec">${sectionHead('Get back to it')}<div class="tiles">${HOME.getBack.map(tile).join('')}</div></section>
    <section class="sec">${sectionHead('More of what you like')}${carousel(HOME.moreLike.map((p) => cardFor(p)))}</section>
    <section class="sec">${sectionHead('Trending by genre')}
      <div class="chips" role="tablist">${TREND_CHIPS.map((c) => `<button class="chip ${c.id === S.chip ? 'on' : ''}" data-action="chip" data-chip="${c.id}" role="tab">${c.label}</button>`).join('')}</div>
      <div class="trend-list">${renderTrending()}</div></section>
    <section class="sec">${sectionHead('Mixed for User 1')}${carousel(HOME.mixes.map(mixCard))}</section>
    <section class="sec">${sectionHead('Curated by SoundCloud')}${carousel(HOME.curated.map((p) => cardFor(p, 'title')))}</section>
    <section class="sec">${sectionHead('Artists to watch out for')}${carousel(HOME.buzzing.map((p) => cardFor(p, 'new')))}</section>
    <section class="sec">${sectionHead('Made for you')}${carousel(HOME.madeFor.map((pid) => { const p = getPlaylist(pid); return `<button class="card wide tap" data-action="open-playlist" data-id="${pid}"><div class="card-art">${img(p.art)}</div><div class="card-sub two">${esc(p.blurb)}</div></button>`; }))}</section>
    <section class="sec">${sectionHead('Discover with Stations')}${carousel(HOME.stations.map(stationCard))}</section>
    <section class="sec">
      <button class="feature tap" data-action="open-playlist" data-id="upload">
        <div class="feature-top"><span class="feature-logo">${icon('cloud', 30)}</span><div><div class="feature-title">THE UPLOAD</div><div class="feature-sub">${esc(getPlaylist('upload').blurb)}</div></div></div>
        <div class="feature-arts">${getPlaylist('upload').tracks.map((id) => img(getTrack(id).art)).join('')}</div>
      </button>
    </section>
    <div class="end-space"></div>`,
  };
}

// ---------- Feed ----------
const FEED = [
  { track: 'wgft', reason: 'Because you followed Gunna' },
  { track: 'highest', reason: 'Because you followed Travis Scott' },
  { track: 'proveit', reason: 'New release by 21 Savage' },
  { track: 'greece', reason: 'Popular with listeners like you' },
  { track: 'nokia', reason: 'Because you played Headlines' },
  { track: 'headlines', reason: 'Trending in Hip Hop & Rap' },
];
export function feedCards(tab) {
  const items = tab === 'following' ? FEED.filter((f) => S.following.has(getTrack(f.track).artist)) : FEED;
  const cards = items.map((f) => {
    const t = getTrack(f.track), a = artistOf(t);
    return `<article class="feed-card" data-feed="${t.id}">
      <div class="feed-bg">${img(t.art)}</div><div class="feed-shade"></div>
      <button class="feed-preview" data-action="feed-preview" data-track="${t.id}" aria-label="Preview ${esc(t.title)}">
        <span class="fp-label">Tap to preview</span><span class="fp-icon">${icon('volume-x', 26)}</span>
        <span class="fp-playing">${icon('volume', 22)} Playing preview</span>
      </button>
      <div class="feed-rail">
        <button class="rail-btn like-btn" data-action="like" data-track="${t.id}" data-like="${t.id}" aria-label="Like">${icon('heart', 28)}${icon('heart-fill', 28)}<span data-likecount="${t.id}">${fmtCount(likeCount(t))}</span></button>
        <button class="rail-btn" data-action="sheet-comments" data-track="${t.id}" aria-label="Comments">${icon('comment', 28)}<span>${fmtCount(t.comments)}</span></button>
        <button class="rail-btn" data-action="sheet-add" data-track="${t.id}" aria-label="Add to playlist">${icon('plus-square', 28)}</button>
      </div>
      <div class="feed-info">
        <div class="feed-reason">${icon('star', 13)} ${esc(f.reason)} · ${fmtTime(t.dur)}</div>
        <div class="feed-panel">
          <div class="feed-title">${esc(t.title)}</div>
          <div class="feed-artist-row">
            <button class="feed-artist tap" data-action="open-artist" data-id="${a.id}">${img(a.art, 'av')}<span>${esc(a.name)}</span>${verified(a)}</button>
            <button class="follow-pill" data-action="follow" data-artist="${a.id}" data-follow="${a.id}"><span class="f-off">Follow</span><span class="f-on">Following</span></button>
          </div>
          <button class="feed-play" data-action="play-track" data-track="${t.id}" data-playbtn="${t.id}" aria-label="Play ${esc(t.title)}">${icon('play', 22)}${icon('pause', 22)}</button>
        </div>
      </div>
      <div class="feed-progress"><i></i></div>
    </article>`;
  });
  if (tab === 'following') cards.push(`<article class="feed-card end-card"><div class="empty center"><h3>You're all caught up</h3><p>New tracks from artists you follow show up here.</p><button class="pill-btn white" data-action="feed-tab" data-tab="discover">Discover more</button></div></article>`);
  return cards.join('');
}
function feed() {
  return {
    html: `<div class="feed">
      <div class="feed-top"><div class="seg"><button class="${S.feedTab === 'discover' ? 'on' : ''}" data-action="feed-tab" data-tab="discover">Discover</button><button class="${S.feedTab === 'following' ? 'on' : ''}" data-action="feed-tab" data-tab="following">Following</button></div>
      <button class="icon-btn feed-more" data-action="toast" data-msg="Feed settings aren't part of this prototype">${icon('more', 22)}</button></div>
      <div class="feed-scroller">${feedCards(S.feedTab)}</div></div>`,
    noScroll: true,
  };
}

// ---------- Search ----------
function genreTile(g, i) {
  const t = getTrack(g.art);
  return `<button class="gtile tap ${i % 3 === 1 ? 'tall' : ''}" style="--g:${g.color}" data-action="open-genre" data-id="${g.id}"><span class="gtile-name">${g.name}</span><span class="gtile-stack"><i></i><i></i><i></i>${img(t.art)}</span></button>`;
}
export function searchResults(q) {
  q = q.trim().toLowerCase();
  if (!q) {
    return `<div class="sec">${sectionHead('Recent searches')}${S.recentSearches.map((r) => `<button class="row recent tap" data-action="search-set" data-q="${esc(r)}">${icon('clock', 20)}<span>${esc(r)}</span></button>`).join('')}</div>`;
  }
  const tr = Object.values(TRACKS).filter((t) => (t.title + ' ' + t.by + ' ' + (t.fullTitle || '')).toLowerCase().includes(q));
  const ar = Object.values(ARTISTS).filter((a) => (a.name + ' ' + (a.display || '')).toLowerCase().includes(q));
  const pl = Object.values(PLAYLISTS).filter((p) => !p.station && (p.title + ' ' + p.by).toLowerCase().includes(q));
  const ge = GENRES.filter((g) => g.name.toLowerCase().includes(q));
  if (!tr.length && !ar.length && !pl.length && !ge.length) return emptyState(`No results for "${esc(q)}"`, 'Check the spelling, or try searching for an artist, a track, or a playlist.');
  const key = reg('search', tr.map((t) => t.id));
  let h = '';
  if (ar.length) h += `<div class="sec">${sectionHead('Artists')}${ar.map((a) => `<button class="row tap" data-action="open-artist" data-id="${a.id}"><div class="row-art round">${img(a.art)}</div><div class="row-main"><div class="row-title">${esc(a.name)} ${verified(a)}</div><div class="row-sub">${fmtCount(a.followers)} followers</div></div>${icon('chevron-right', 20, 'dim')}</button>`).join('')}</div>`;
  if (tr.length) h += `<div class="sec">${sectionHead('Tracks')}${tr.map((t, i) => trackRow(t.id, key, i, { plays: true })).join('')}</div>`;
  if (pl.length) h += `<div class="sec">${sectionHead('Playlists')}${pl.slice(0, 6).map((p) => `<button class="row tap" data-action="open-playlist" data-id="${p.id}"><div class="row-art">${img(p.art)}</div><div class="row-main"><div class="row-title">${esc(p.title)}</div><div class="row-sub">Playlist · ${esc(p.by)}</div></div>${icon('chevron-right', 20, 'dim')}</button>`).join('')}</div>`;
  if (ge.length) h += `<div class="sec">${sectionHead('Genres')}${ge.map((g) => `<button class="row tap" data-action="open-genre" data-id="${g.id}"><div class="row-art" style="background:${g.color}"></div><div class="row-main"><div class="row-title">${g.name}</div><div class="row-sub">Genre</div></div>${icon('chevron-right', 20, 'dim')}</button>`).join('')}</div>`;
  return h;
}
function search() {
  return {
    html: `<div class="search-head"><label class="searchbox">${icon('search', 20)}<input type="search" placeholder="Search" autocomplete="off" data-input="search" aria-label="Search"><button class="clear-q" data-action="search-clear" aria-label="Clear">${icon('x', 16)}</button></label><button class="cancel-btn" data-action="search-cancel">Cancel</button></div>
    <div class="search-default"><div class="sec">${sectionHead('Vibes')}<div class="gtiles">${GENRES.map(genreTile).join('')}</div></div><div class="end-space"></div></div>
    <div class="search-results"></div>`,
  };
}

function genre({ id }) {
  const g = GENRES.find((x) => x.id === id) || GENRES[0];
  const pool = Object.values(TRACKS).filter((t) => !t.synth);
  const trending = [...pool].sort((a, b) => ((a.id.charCodeAt(1) + g.name.length) % 7) - ((b.id.charCodeAt(1) + g.name.length) % 7)).map((t) => t.id);
  const key = reg('genre-' + id, trending);
  const pls = ['buzz-hip', 'lookout', 'bars', 'latenight', 'daily', 'weekly'];
  const albums = ['mix-1', 'mix-2', 'related-highest', 'related-wgft'];
  const panes = {
    all: `<div class="sec">${sectionHead('Trending', `data-action="genre-tab" data-tab="trending"`)}${trending.slice(0, 3).map((t, i) => trackRow(t, key, i)).join('')}</div>
      <div class="sec">${sectionHead('Introducing')}<button class="intro-card tap" data-action="open-playlist" data-id="buzz-hip">${img(ART.buzzHip)}<div><div class="intro-title">Buzzing ${esc(g.name)}</div><div class="intro-sub">${esc(getPlaylist('buzz-hip').blurb.replace('Hip Hop', g.name))}</div></div></button></div>
      <div class="sec">${sectionHead('Playlists', `data-action="genre-tab" data-tab="playlists"`)}${carousel(pls.map((p) => cardFor(p, 'title')))}</div>
      <div class="sec">${sectionHead('Albums', `data-action="genre-tab" data-tab="albums"`)}${carousel(albums.map((p) => cardFor(p, 'title')))}</div>`,
    trending: `<div class="sec">${trending.map((t, i) => trackRow(t, key, i, { dur: true })).join('')}</div>`,
    playlists: `<div class="sec grid2">${pls.map((p) => cardFor(p, 'title')).join('')}</div>`,
    albums: `<div class="sec grid2">${albums.map((p) => cardFor(p, 'title')).join('')}</div>`,
  };
  return {
    html: `${backHeader(g.name)}<div class="big-title">${esc(g.name)}</div>
      <div class="tabs-u" role="tablist">${['all', 'trending', 'playlists', 'albums'].map((t, i) => `<button class="${i === 0 ? 'on' : ''}" data-action="genre-tab" data-tab="${t}" role="tab">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}<span class="tabs-ink"></span></div>
      ${Object.entries(panes).map(([k, v]) => `<div class="pane ${k === 'all' ? 'on' : ''}" data-pane="${k}">${v}</div>`).join('')}<div class="end-space"></div>`,
  };
}

// ---------- Library ----------
const LIB_ROWS = [
  ['saved', 'Saved songs'], ['likes', 'Your likes'], ['playlists', 'Playlists'], ['albums', 'Albums'],
  ['collection', 'Collection', true], ['following', 'Following'], ['stations', 'Stations'],
  ['downloads', 'Downloads'], ['insights', 'Your insights'], ['uploads', 'Your uploads'],
];
function playlistRow(pid) {
  const p = getPlaylist(pid);
  const n = p.tracks.length;
  return `<button class="row tap" data-action="open-playlist" data-id="${pid}"><div class="row-art">${img(p.art)}</div><div class="row-main"><div class="row-title">${esc(p.title)}</div><div class="row-sub">Playlist · ${n} ${n === 1 ? 'track' : 'tracks'}</div></div>${icon('more', 20, 'dim')}</button>`;
}
function library() {
  const hist = S.history.slice(0, 4);
  const key = reg('history', S.history);
  return {
    html: `${libHeader('Library')}
    <div class="lib-rows">${LIB_ROWS.map(([r, label, isNew]) => `<button class="lib-row tap" data-action="${r === 'downloads' ? 'paywall' : 'push'}" data-route="${r}" data-variant="offline"><span>${label}${isNew ? ' <em class="new-tag">NEW</em>' : ''}</span>${icon('chevron-right', 22)}</button>`).join('')}</div>
    <section class="sec">${sectionHead('Your playlists', `data-action="push" data-route="playlists"`)}${S.myPlaylists.map(playlistRow).join('')}</section>
    <section class="sec">${sectionHead('Recently played', `data-action="push" data-route="recent"`)}${carousel(S.recent.map((p) => cardFor(p, 'title')), 'small')}</section>
    <section class="sec">${sectionHead('Listening history', `data-action="push" data-route="history"`)}<div data-list="history">${hist.map((id, i) => trackRow(id, key, i, { plays: true, uploader: true, full: true })).join('')}</div></section>
    <div class="end-space"></div>`,
  };
}
function listPage(title, ids, key, empty, opts = {}) {
  reg(key, ids);
  const head = opts.searchHead
    ? `<header class="nav-head"><button class="circle-btn" data-action="back" aria-label="Back">${icon('chevron-left', 22)}</button><label class="searchbox sm">${icon('search', 18)}<input type="search" placeholder="Search ${ids.length} tracks" data-input="filter" data-list="${key}" aria-label="Search your tracks"></label><button class="icon-btn" data-action="toast" data-msg="Sorting isn't part of this prototype" aria-label="Sort">${icon('filter', 22)}</button></header>`
    : backHeader(title);
  if (!ids.length) return { html: `${head}${opts.searchHead ? '' : `<div class="big-title sm">${title}</div>`}${empty}` };
  return {
    html: `${head}<div class="big-title sm">${title}</div><div class="list-meta">${ids.length} ${ids.length === 1 ? 'track' : 'tracks'}</div>
    <div class="list-actions"><button class="icon-btn" data-action="shuffle-list" data-ctx="${key}" aria-label="Shuffle">${icon('shuffle', 24)}</button><button class="big-play" data-action="play-list" data-ctx="${key}" data-index="0" data-playctx="${key}" aria-label="Play">${icon('play', 26)}${icon('pause', 26)}</button></div>
    <div data-list="${key}">${ids.map((id, i) => trackRow(id, key, i, { dur: true })).join('')}</div><div class="end-space"></div>`,
  };
}
const saved = () => listPage('Saved songs', S.savedOrder.filter((id) => S.saved.has(id)), 'saved',
  emptyState('No saved songs yet', 'Tap <b>+ Save</b> on any track and it shows up here.', 'Find something to save', 'data-action="tab" data-tab="search"'));
const likes = () => listPage('Your likes', [...S.liked].reverse(), 'likes',
  emptyState('No liked tracks yet', "Tracks you've liked will show up here", 'Search for a track', 'data-action="tab" data-tab="search"'), { searchHead: true });
const history = () => listPage('Listening history', S.history, 'history-all', emptyState('Nothing played yet', 'Tracks you play show up here.'));
function playlistsPage() {
  return { html: `${backHeader('Playlists')}<div class="big-title sm">Playlists</div>
    <button class="row tap" data-action="create-playlist"><div class="row-art add">${icon('plus', 26)}</div><div class="row-main"><div class="row-title">Create playlist</div></div></button>
    ${S.myPlaylists.map(playlistRow).join('')}
    ${S.likedPlaylists.size ? `<div class="sec">${sectionHead('Liked playlists')}${[...S.likedPlaylists].map(playlistRow).join('')}</div>` : ''}<div class="end-space"></div>` };
}
function recentPage() {
  return { html: `${backHeader('Recently played')}<div class="big-title sm">Recently played</div><div class="sec grid2">${S.recent.map((p) => cardFor(p, 'title')).join('')}</div><div class="end-space"></div>` };
}
const simple = (title, body) => ({ html: `${backHeader(title)}${body}` });
const albums = () => simple('Albums', emptyState('No albums yet', 'Albums you like will show up here.', 'Browse albums', 'data-action="open-genre" data-id="hiphop"'));
const collection = () => simple('Collection', `<div class="big-title sm">Collection <em class="new-tag">NEW</em></div>${emptyState('Your collection is empty', 'Tracks and albums you buy from artists will live here.', 'Learn more', 'data-action="toast" data-msg="Collection isn\'t part of this prototype"')}`);
function following() {
  const list = [...S.following].map(getArtist);
  if (!list.length) return simple('Following', emptyState('Not following anyone yet', 'Follow artists to see their new tracks in your Feed.', 'Search for an artist', 'data-action="tab" data-tab="search"'));
  return simple('Following', `<div class="big-title sm">Following</div>${list.map((a) => `<div class="row"><button class="row-link tap" data-action="open-artist" data-id="${a.id}"><div class="row-art round">${img(a.art)}</div><div class="row-main"><div class="row-title">${esc(a.name)} ${verified(a)}</div><div class="row-sub">${fmtCount(a.followers)} followers</div></div></button><button class="follow-pill sm" data-action="follow" data-artist="${a.id}" data-follow="${a.id}"><span class="f-off">Follow</span><span class="f-on">Following</span></button></div>`).join('')}<div class="end-space"></div>`);
}
const stations = () => simple('Stations', emptyState('No stations yet', 'Stations you have liked will show up here.', 'Search for an artist', 'data-action="tab" data-tab="search"'));
function insights() {
  const mins = Math.max(1, Math.round(S.history.length * 3.2));
  return simple('Your insights', `<div class="big-title sm">Your insights</div><div class="stat-grid">
    <div class="stat"><b>${mins}</b><span>minutes listened this week</span></div><div class="stat"><b>${S.history.length}</b><span>tracks played</span></div>
    <div class="stat"><b>${S.liked.size}</b><span>likes</span></div><div class="stat"><b>${S.saved.size}</b><span>saved songs</span></div></div>
    <p class="note">Upload your own tracks to see plays, likes, and listeners here.</p>`);
}
const uploads = () => simple('Your uploads', emptyState('No uploads yet', 'Your uploads will show up here.', 'Upload a track', 'data-action="push" data-route="upload"'));

// ---------- Playlist and artist ----------
function playlist({ id }) {
  const p = getPlaylist(id);
  const key = reg('pl-' + id, p.tracks);
  const st = p.station ? getArtist(p.station) : null;
  return {
    html: `${backHeader(p.title)}
    <div class="pl-hero"><div class="pl-hero-bg">${img(p.art)}</div>
      <div class="pl-cover ${st ? 'round' : ''}">${img(p.art)}${p.mix ? `<span class="mix-label big">MIX ${p.mix}</span>` : ''}</div>
      <h1 class="pl-name">${esc(st ? st.name + ' Station' : p.title)}</h1>
      <div class="pl-by">${st ? 'Station' : 'Playlist'} · by ${esc(p.by)}</div>
      <div class="pl-meta">${p.tracks.length} tracks · ${minutes(p.tracks)} min</div>
      ${p.blurb ? `<p class="pl-blurb">${esc(p.blurb)}</p>` : ''}
    </div>
    <div class="list-actions">
      <div class="la-left">
        <button class="icon-btn like-btn" data-action="like-playlist" data-id="${id}" data-plike="${id}" aria-label="Like playlist">${icon('heart', 26)}${icon('heart-fill', 26)}</button>
        <button class="icon-btn" data-action="paywall" data-variant="offline" aria-label="Download">${icon('download', 24)}</button>
        <button class="icon-btn" data-action="sheet-share" data-playlist="${id}" aria-label="Share">${icon('share', 24)}</button>
      </div>
      <button class="icon-btn" data-action="shuffle-list" data-ctx="${key}" aria-label="Shuffle">${icon('shuffle', 24)}</button>
      <button class="big-play" data-action="play-list" data-ctx="${key}" data-index="0" data-playctx="${key}" aria-label="Play">${icon('play', 26)}${icon('pause', 26)}</button>
    </div>
    <div data-list="${key}">${p.tracks.map((t, i) => trackRow(t, key, i, { dur: true })).join('')}</div>
    <div class="sec">${sectionHead('You might also like')}${carousel(['related-highest', 'buzz-hip', 'weekly', 'lookout'].filter((x) => x !== id).map((x) => cardFor(x, 'title')))}</div>
    <div class="end-space"></div>`,
  };
}
// Bio redesign: the bio and links sit on the profile, labeled, so nobody has to guess what "Show more" hides.
export const linkMsg = (a, l) => `In the real app, this opens ${a.name} on ${l.label}`;
export const artistLinks = (a) => `<div class="ar-links">${a.links.map((l) => `<button class="ar-link tap" data-action="toast" data-msg="${esc(linkMsg(a, l))}">${icon(l.type, 18)}<span>${esc(l.label)}</span></button>`).join('')}</div>`;
function aboutSection(a) {
  if (!a.bio) return '';
  const long = a.bio.length > 140;
  return `<section class="sec ar-about">${sectionHead(`About ${esc(a.name)}`)}
    <div class="ar-from">${icon('map-pin', 16)}<span>${esc(a.from)}</span></div>
    <p class="ar-bio ${long ? 'clamp' : ''}">${esc(a.bio)}</p>
    ${long ? `<button class="ar-more tap" data-action="sheet-bio" data-artist="${a.id}">Read full bio ${icon('chevron-right', 16)}</button>` : ''}
    ${artistLinks(a)}</section>`;
}
function artist({ id }) {
  const a = getArtist(id);
  const key = reg('artist-' + id, a.tracks);
  const others = Object.values(ARTISTS).filter((x) => x.id !== id && x.id !== 'kairo').slice(0, 4);
  return {
    html: `${backHeader(a.name)}
    <div class="ar-hero">${img(a.art)}</div>
    <div class="ar-head"><div class="ar-avatar">${img(a.art)}</div>
      <h1 class="ar-name">${esc(a.name)} ${verified(a)}</h1><div class="ar-sub">${fmtCount(a.followers)} followers · ${a.tracks.length} ${a.tracks.length === 1 ? 'track' : 'tracks'}</div>
      <div class="ar-actions"><button class="follow-pill" data-action="follow" data-artist="${a.id}" data-follow="${a.id}"><span class="f-off">Follow</span><span class="f-on">Following</span></button>
      <button class="icon-btn" data-action="play-list" data-ctx="${key}" data-index="0" aria-label="Play artist">${icon('radio', 24)}</button>
      <button class="icon-btn" data-action="sheet-share" data-artist="${a.id}" aria-label="Share">${icon('share', 22)}</button></div></div>
    ${aboutSection(a)}
    <div class="sec">${sectionHead('Popular tracks')}${a.tracks.map((t, i) => trackRow(t, key, i, { plays: true })).join('')}</div>
    ${id !== 'kairo' ? `<div class="sec">${sectionHead('Fans also like')}${carousel(others.map((o) => `<button class="card circle tap" data-action="open-artist" data-id="${o.id}"><div class="card-art round">${img(o.art)}</div><div class="card-title center">${esc(o.name)}</div></button>`))}</div>` : `<p class="note">Kairo is a new artist on SoundCloud. Follow to hear new tracks first.</p>`}
    <div class="end-space"></div>`,
  };
}

// ---------- Upgrade ----------
export function paywallBody(variant) {
  const offline = variant === 'offline';
  return `<div class="pw ${offline ? 'offline' : ''}">
    ${offline ? `<div class="pw-icon">${icon('wifi-off', 92)}</div>` : `<div class="pw-art">${img(ART.highest)}</div>`}
    <h1>${offline ? 'Listen offline.<br>No ads.<br>$4.99/month.' : 'No ads.<br>Offline listening.<br>$4.99/month.'}</h1>
    <p class="pw-note">Cancel anytime. <a data-action="toast" data-msg="Restrictions: this is a class prototype, not a real offer">Restrictions apply.</a></p>
    <button class="pw-cta tap" data-action="toast" data-msg="This is a prototype, so nothing was purchased">Try 7 days for $0 <span class="best">BEST VALUE</span></button>
    <p class="pw-alt">Or, continue with in-app payment<br>($5.99/month)</p>
    <button class="pw-plans" data-action="push" data-route="plans">See all plans</button></div>`;
}
const upgrade = () => ({ html: `<div class="upgrade-page">${paywallBody()}</div><div class="end-space"></div>` });
function plans() {
  const card = (name, price, perks, hl) => `<div class="plan ${hl ? 'hl' : ''}"><div class="plan-name">${name}</div><div class="plan-price">${price}</div><ul>${perks.map((p) => `<li>${icon('check', 16)} ${p}</li>`).join('')}</ul><button class="pill-btn ${hl ? 'orange' : 'white'}" data-action="toast" data-msg="This is a prototype, so nothing was purchased">${hl ? 'Try it free' : 'Choose'}</button></div>`;
  return simple('All plans', `<div class="big-title sm">Choose your plan</div>
    ${card('SoundCloud Go+', '$10.99/month', ['Ad-free listening', 'Full catalog', 'Offline listening', 'High quality audio'], true)}
    ${card('SoundCloud Go', '$4.99/month', ['Ad-free listening', 'Offline listening'], false)}
    ${card('Free', '$0', ['Listen with ads', 'Upload up to 3 hours'], false)}<div class="end-space"></div>`);
}

// ---------- Other pages ----------
const notifications = () => simple('Notifications', NOTIFICATIONS.map((n) => `<div class="row notif">${img(n.art, 'notif-art')}<div class="row-main"><div class="notif-text">${n.text}</div><div class="row-sub sm">${n.ago}</div></div></div>`).join('') + '<div class="end-space"></div>');
const messages = () => simple('Messages', emptyState('No messages yet', 'Share tracks with friends and talk about them here.', 'Start a conversation', 'data-action="toast" data-msg="Messaging isn\'t part of this prototype"'));
const upload = () => simple('Upload', emptyState('Upload your first track', 'Share your sound with the world. Upload an audio file to get started.', 'Choose a file', 'data-action="toast" data-msg="Uploading isn\'t part of this prototype"'));
function profile() {
  return simple('Profile', `<div class="ar-head top"><div class="ar-avatar">${img(ME.avatar)}</div><h1 class="ar-name">${ME.name}</h1><div class="ar-sub">${S.following.size} following · 0 followers</div></div>
    <div class="lib-rows">${[['likes', 'Your likes'], ['saved', 'Saved songs'], ['following', 'Following'], ['settings', 'Settings']].map(([r, l]) => `<button class="lib-row tap" data-action="push" data-route="${r}"><span>${l}</span>${icon('chevron-right', 22)}</button>`).join('')}</div>`);
}
function settings() {
  const rows = ['Account', 'Notifications', 'Streaming quality', 'Privacy', 'Help'];
  return simple('Settings', `<div class="lib-rows">${rows.map((r) => `<button class="lib-row tap" data-action="toast" data-msg="${r} settings aren't part of this prototype"><span>${r}</span>${icon('chevron-right', 22)}</button>`).join('')}
    <button class="lib-row tap" data-action="proto-menu"><span>About this prototype</span>${icon('info', 20)}</button></div>`);
}

export const ROUTES = {
  home, feed, search, library, upgrade, genre, playlist, artist, saved, likes, history, playlists: playlistsPage,
  recent: recentPage, albums, collection, following, stations, insights, uploads, plans, notifications, messages, upload, profile, settings,
};
