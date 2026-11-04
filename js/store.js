// Shared app state, the audio player, and queue helpers.
import { Player } from './audio.js';
import { getTrack } from './data.js';

export const player = new Player();

export const S = {
  tab: 'home',
  saved: new Set(),                 // Fix 2: "Saved songs"
  savedOrder: [],
  following: new Set(['gunna', 'travis']),
  myPlaylists: ['gym-mix', 'rap-playlist-1'],
  history: ['highest', 'wgft', 'headlines', 'greece'],
  recent: ['related-highest', 'rap-playlist-1', 'related-headlines'],
  userComments: {},
  // queued = how many songs the listener added with Play next / Add to queue. They sit right
  // after S.qi, in the order added, and stay in line when a new song or playlist starts.
  queue: [], qi: 0, ctx: null, queued: 0,
  chip: 'all', feedTab: 'discover',
  recentSearches: ['travis scott', 'gunna'],
  autoplayRelated: true,
  playerOpen: false,
};

export const isNow = (id) => player.trackId === id;

export function playFrom(ids, index = 0, ctx = null, opts = {}) {
  // Songs the listener queued stay in line right after the new song, like Spotify's queue.
  const kept = S.queue.slice(S.qi + 1, S.qi + 1 + S.queued);
  S.queue = [...ids.slice(0, index + 1), ...kept, ...ids.slice(index + 1)]; S.qi = index; S.ctx = ctx;
  // During an ad this doesn't start the song: it becomes the song that plays when the ad ends.
  player.load(ids[index], { autoplay: true, ...opts });
}
// Add to queue: plays after the next song and after anything queued before it, in order.
// Returns the song it will play after.
export function addToQueue(id) {
  const at = S.qi + 1 + S.queued;
  S.queue.splice(at, 0, id); S.queued++;
  return S.queue[at - 1];
}
// Play next: jumps to the front of the line. During an ad that means right after the ad,
// and the song that was going to play after the ad moves to the front of the queue.
export function playNext(id) {
  if (player.ad) { S.queue.splice(S.qi, 0, id); S.queued++; player.load(id, { autoplay: true }); return; }
  S.queue.splice(S.qi + 1, 0, id); S.queued++;
}
export const queuedSongs = () => S.queue.slice(S.qi + 1, S.qi + 1 + S.queued);
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
  if (S.qi < S.queue.length - 1) { S.qi++; if (S.queued) S.queued--; player.load(S.queue[S.qi], { autoplay: true }); }
  else if (S.autoplayRelated) { const more = relatedTo(player.trackId); S.queue.push(...more); S.qi++; player.load(S.queue[S.qi], { autoplay: true }); }
}
// Like Spotify and SoundCloud: Back restarts the song unless you're in the first 3 seconds.
export function prev() {
  if (player.ad) return;
  if (player.position() > 3000 || S.qi === 0) return player.seek(0);
  S.qi--; S.queued = 0; player.load(S.queue[S.qi], { autoplay: true });
}
export function addToHistory(id) {
  S.history = [id, ...S.history.filter((x) => x !== id)].slice(0, 30);
}
