// Shared app state, the audio player, and queue helpers.
import { Player } from './audio.js';
import { getTrack } from './data.js';

export const player = new Player();

export const S = {
  tab: 'home',
  liked: new Set(),
  saved: new Set(),                 // Fix 2: "Saved songs", separate from likes
  savedOrder: [],
  following: new Set(['gunna', 'travis']),
  likedPlaylists: new Set(),
  myPlaylists: ['gym-mix', 'rap-playlist-1'],
  history: ['highest', 'wgft', 'headlines', 'greece'],
  recent: ['related-highest', 'rap-playlist-1', 'related-headlines'],
  userComments: {},
  queue: [], qi: 0, ctx: null,
  chip: 'all', feedTab: 'discover',
  recentSearches: ['travis scott', 'gunna'],
  autoplayRelated: true,
  playerOpen: false,
};

export const likeCount = (t) => t.likes + (S.liked.has(t.id) ? 1 : 0);
export const isNow = (id) => player.trackId === id;

export function playFrom(ids, index = 0, ctx = null, opts = {}) {
  S.queue = ids.slice(); S.qi = index; S.ctx = ctx;
  player.load(ids[index], { autoplay: true, ...opts });
}
export function playTrack(id, ctx = null) {
  const t = getTrack(id);
  if (!t) return;
  if (player.trackId === id && !player.ad) return player.toggle();
  playFrom([id, ...relatedTo(id)], 0, ctx);
}
export function relatedTo(id) {
  const t = getTrack(id);
  const order = ['highest', 'wgft', 'headlines', 'greece', 'proveit', 'nokia'];
  return order.filter((x) => x !== id && (t.synth ? true : x !== 'nightdrive'));
}
export function next() {
  if (player.ad) return;
  if (S.qi < S.queue.length - 1) { S.qi++; player.load(S.queue[S.qi], { autoplay: true }); }
  else if (S.autoplayRelated) { const more = relatedTo(player.trackId); S.queue.push(...more); S.qi++; player.load(S.queue[S.qi], { autoplay: true }); }
}
// Like Spotify and SoundCloud: Back restarts the song unless you're in the first 3 seconds.
export function prev() {
  if (player.ad) return;
  if (player.position() > 3000 || S.qi === 0) return player.seek(0);
  S.qi--; player.load(S.queue[S.qi], { autoplay: true });
}
export function addToHistory(id) {
  S.history = [id, ...S.history.filter((x) => x !== id)].slice(0, 30);
}
