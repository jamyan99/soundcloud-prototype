// Catalog for the prototype. Real tracks stream through SoundCloud's official
// embeddable player; "Night Drive" by Kairo is fictional and synthesized in code.

const svg = (body, w = 500, h = 500) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

const FONT = `font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900"`;

// ---------- Generated covers (SoundCloud-style editorial art) ----------
const nightDriveArt = svg(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140834"/><stop offset=".55" stop-color="#5d1d8c"/><stop offset="1" stop-color="#ff4d7a"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe17a"/><stop offset="1" stop-color="#ff3d81"/></linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#sky)"/>
  <circle cx="250" cy="262" r="118" fill="url(#sun)"/>
  <g fill="#3a1268">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="120" y="${268 + i * 18}" width="260" height="${4 + i * 1.6}"/>`).join('')}</g>
  <rect y="318" width="500" height="182" fill="#10052a"/>
  <g stroke="#ff4dd2" stroke-width="2" opacity=".75">${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="0" x2="500" y1="${322 + i * i * 4 + i * 8}" y2="${322 + i * i * 4 + i * 8}"/>`).join('')}${[-6, -4, -2, 0, 2, 4, 6].map(i => `<line x1="${250 + i * 18}" y1="318" x2="${250 + i * 120}" y2="500"/>`).join('')}</g>
  <g fill="#fff" opacity=".8">${[[60, 60], [140, 110], [390, 70], [440, 150], [90, 190], [330, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`);

// Cover text goes inside SVG markup, so "&" (as in R&B) has to be escaped or the image won't load.
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const editorial = ({ bg1, bg2, lines, color = '#fff', tag, tagBg = '#ffd400', tagColor = '#111', size = 92, y = 300, pattern = '' }) => svg(`
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
  <rect width="500" height="500" fill="url(#g)"/>${pattern}
  ${tag ? `<rect x="24" y="24" width="${tag.length * 17 + 28}" height="44" fill="${tagBg}"/><text x="38" y="56" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="${tagColor}">${xml(tag)}</text>` : ''}
  ${lines.map((l, i) => `<text x="250" y="${y + i * (size * 0.92)}" text-anchor="middle" ${FONT} font-size="${size}" fill="${color}" letter-spacing="-2">${xml(l)}</text>`).join('')}`);

const grid = (c) => Array.from({ length: 11 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="500" stroke="${c}" stroke-width="2"/><line x1="0" y1="${i * 50}" x2="500" y2="${i * 50}" stroke="${c}" stroke-width="2"/>`).join('');
const rings = (c) => Array.from({ length: 9 }, (_, i) => `<circle cx="420" cy="420" r="${60 + i * 46}" fill="none" stroke="${c}" stroke-width="10" opacity="${0.9 - i * 0.09}"/>`).join('');
const dots = (c) => Array.from({ length: 140 }, (_, i) => `<circle cx="${(i % 14) * 37 + 12}" cy="${Math.floor(i / 14) * 52 + 14}" r="${3 + (i % 5)}" fill="${c}" opacity=".35"/>`).join('');

export const ART = {
  headlines: 'https://i1.sndcdn.com/artworks-kgWYqX0LV9s1-0-t500x500.jpg',
  nokia: 'https://i1.sndcdn.com/artworks-27Jr1SiqhikX-0-t500x500.jpg',
  highest: 'https://i1.sndcdn.com/artworks-O4pWtQg2DgYx-0-t500x500.jpg',
  wgft: 'https://i1.sndcdn.com/artworks-PFw6AojbExnD-0-t500x500.jpg',
  proveit: 'https://i1.sndcdn.com/artworks-w2ey1RNrYL1f-0-t500x500.jpg',
  greece: 'https://i1.sndcdn.com/artworks-xm0imAGgkR7i-0-t500x500.jpg',
  nightdrive: nightDriveArt,
  bars: editorial({ bg1: '#1b1b1b', bg2: '#3a0d0d', lines: ['BARS'], size: 150, y: 300, pattern: grid('#c0262640') + '<rect x="0" y="380" width="500" height="120" fill="#c02626"/>' }),
  lookout: editorial({ bg1: '#0b1226', bg2: '#2b5cff', lines: ['THE', 'LOOKOUT'], size: 84, y: 250, pattern: rings('#ffffff22') }),
  latenight: editorial({ bg1: '#2a0b3a', bg2: '#ff3d81', lines: ['LATE', 'NIGHT', 'R&B'], size: 84, y: 190, pattern: dots('#ffffff') }),
  buzzHip: editorial({ bg1: '#d61f1f', bg2: '#3b0606', tag: 'Buzzing', lines: ['HIP HOP', '& RAP'], size: 96, y: 270, pattern: grid('#00000033') }),
  buzzRnb: editorial({ bg1: '#2a1a12', bg2: '#b5532b', tag: 'Buzzing', lines: ['R&B'], size: 170, y: 330, pattern: dots('#ffd9b0') }),
  buzzElec: editorial({ bg1: '#0c0c0c', bg2: '#ffcc00', tag: 'Buzzing', lines: ['ELEC', 'TRONIC'], size: 104, y: 270, color: '#fff', pattern: rings('#ffcc0044') }),
  daily: editorial({ bg1: '#0d2a6b', bg2: '#4aa3ff', lines: ['DAILY', 'DROPS'], size: 96, y: 260, pattern: dots('#ffffff') }),
  weekly: editorial({ bg1: '#ff6a00', bg2: '#b3001b', lines: ['WEEKLY', 'WAVE'], size: 92, y: 260, pattern: rings('#ffffff33') }),
  upload: editorial({ bg1: '#f2f2f2', bg2: '#bdbdbd', lines: ['THE', 'UPLOAD'], color: '#111', size: 96, y: 250, pattern: dots('#111') }),
  avatar: svg(`<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset="1" stop-color="#7b2ff7"/></linearGradient></defs><rect width="200" height="200" fill="url(#a)"/><text x="100" y="130" text-anchor="middle" ${FONT} font-size="96" fill="#fff">U</text>`, 200, 200),
  ad: svg(`<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2a65a"/><stop offset="1" stop-color="#6b3a12"/></linearGradient></defs><rect width="200" height="200" fill="url(#c)"/><g fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M50 82h88v46a30 30 0 0 1-30 30H80a30 30 0 0 1-30-30z"/><path d="M138 94h10a18 18 0 0 1 0 36h-10"/><path d="M72 40v18M94 34v24M116 40v18"/></g>`, 200, 200),
};

// Stand-in covers, used only when the real SoundCloud artwork can't load (for example on hosts that block it).
export const FALLBACK_ART = {
  [ART.headlines]: editorial({ bg1: '#2b2316', bg2: '#8a6a2c', lines: ['HEAD', 'LINES'], color: '#e9cf8f', size: 110, y: 250 }),
  [ART.nokia]: editorial({ bg1: '#03122e', bg2: '#1f6fd6', lines: ['NOKIA'], size: 120, y: 290, pattern: grid('#ffffff22') }),
  [ART.highest]: editorial({ bg1: '#7fb2e5', bg2: '#f3e6d0', lines: ['HIGHEST', 'IN THE', 'ROOM'], color: '#5a2c12', size: 76, y: 200 }),
  [ART.wgft]: editorial({ bg1: '#111', bg2: '#4b4b4b', lines: ['WGFT'], size: 140, y: 300, pattern: rings('#ffffff22') }),
  [ART.proveit]: editorial({ bg1: '#3a1424', bg2: '#d04a6b', lines: ['PROVE', 'IT'], size: 120, y: 240, pattern: dots('#ffffff') }),
  [ART.greece]: editorial({ bg1: '#3b2a0c', bg2: '#c8a24a', lines: ['GREECE'], color: '#fff6dc', size: 104, y: 290, pattern: grid('#00000022') }),
};

// ---------- Tracks ----------
export const TRACKS = {
  headlines: { id: 'headlines', title: 'Headlines', fullTitle: 'Headlines (Explicit Version)', artist: 'drake', by: 'Drake', uploader: 'octobersveryown', art: ART.headlines, sc: 'https://soundcloud.com/octobersveryown/drake-headlines', dur: 236000, plays: 27.9e6, comments: 2240, genre: 'hiphop' },
  nokia: { id: 'nokia', title: 'NOKIA', artist: 'drake', by: 'Drake', uploader: 'octobersveryown', art: ART.nokia, sc: 'https://soundcloud.com/octobersveryown/nokia', dur: 241000, plays: 19.6e6, comments: 5590, genre: 'hiphop' },
  highest: { id: 'highest', title: 'HIGHEST IN THE ROOM', artist: 'travis', by: 'Travis Scott', uploader: 'Travis Scott', art: ART.highest, sc: 'https://soundcloud.com/travisscott-2/highest-in-the-room', dur: 175000, plays: 67.7e6, comments: 17000, genre: 'trap' },
  wgft: { id: 'wgft', title: 'wgft (feat. Burna Boy)', artist: 'gunna', by: 'Gunna', uploader: 'Gunna', art: ART.wgft, sc: 'https://soundcloud.com/gunna/wgft-feat-burna-boy', dur: 184000, plays: 11.3e6, comments: 1320, genre: 'trap' },
  proveit: { id: 'proveit', title: 'prove it', artist: 'savage', by: '21 Savage, Summer Walker', uploader: '21 Savage', art: ART.proveit, sc: 'https://soundcloud.com/21savage/21-savage-summer-walker-prove', dur: 197000, plays: 14.2e6, comments: 1874, genre: 'rnb' },
  greece: { id: 'greece', title: 'GREECE (feat. Drake)', artist: 'khaled', by: 'DJ Khaled', uploader: 'DJ Khaled', art: ART.greece, sc: 'https://soundcloud.com/djkhaled/greece-feat-drake', dur: 218000, plays: 21.1e6, comments: 2675, genre: 'hiphop' },
  nightdrive: { id: 'nightdrive', title: 'Night Drive', artist: 'kairo', by: 'Kairo', uploader: 'Kairo', art: ART.nightdrive, synth: 'nightdrive', dur: 192000, plays: 18200, comments: 96, genre: 'electronic', fresh: true },
};

export const ARTISTS = {
  drake: { id: 'drake', name: 'octobersveryown', display: 'Drake', verified: true, followers: 6.1e6, art: ART.headlines, tracks: ['headlines', 'nokia', 'greece'] },
  travis: { id: 'travis', name: 'Travis Scott', verified: true, followers: 4.8e6, art: ART.highest, tracks: ['highest'] },
  gunna: { id: 'gunna', name: 'Gunna', verified: true, followers: 2.3e6, art: ART.wgft, tracks: ['wgft'] },
  savage: { id: 'savage', name: '21 Savage', verified: true, followers: 3.4e6, art: ART.proveit, tracks: ['proveit'] },
  khaled: { id: 'khaled', name: 'DJ Khaled', verified: true, followers: 2.9e6, art: ART.greece, tracks: ['greece'] },
  kairo: { id: 'kairo', name: 'Kairo', verified: false, followers: 4210, art: ART.nightdrive, tracks: ['nightdrive'] },
};

// Bio redesign: where the artist is from, a bio you can read without tapping anything,
// and labeled social links on the profile itself instead of hidden behind "Show more".
const ABOUT = {
  drake: { from: 'Toronto, Canada', bio: 'Rapper, singer, and songwriter from Toronto. Official SoundCloud of OVO Sound.', links: [['instagram', 'Instagram', '@champagnepapi'], ['youtube', 'YouTube', 'Drake'], ['globe', 'Website', 'drakerelated.com']] },
  travis: { from: 'Houston, Texas', bio: 'Rapper, producer, and founder of Cactus Jack Records.', links: [['instagram', 'Instagram', '@travisscott'], ['youtube', 'YouTube', 'Travis Scott'], ['globe', 'Website', 'travisscott.com']] },
  gunna: { from: 'Atlanta, Georgia', bio: 'Rapper from College Park, Atlanta.', links: [['instagram', 'Instagram', '@gunna'], ['tiktok', 'TikTok', '@gunna'], ['youtube', 'YouTube', 'Gunna']] },
  savage: { from: 'Atlanta, Georgia', bio: 'Rapper from Atlanta.', links: [['instagram', 'Instagram', '@21savage'], ['youtube', 'YouTube', '21 Savage']] },
  khaled: { from: 'Miami, Florida', bio: 'DJ, producer, and host from Miami. We the Best.', links: [['instagram', 'Instagram', '@djkhaled'], ['youtube', 'YouTube', 'DJ Khaled'], ['globe', 'Website', 'wethebestmusic.com']] },
  kairo: { from: 'Atlanta, Georgia', bio: "Atlanta-based producer making late-night synthwave for long drives with the windows down. Night Drive is my first track on SoundCloud, and I'm putting out a new one every month this year. Everything is made on an old laptop and a borrowed keyboard in my bedroom. For bookings, remixes, and collabs, reach out on Instagram or through my website.", links: [['instagram', 'Instagram', '@kairo.wav'], ['tiktok', 'TikTok', '@kairo.wav'], ['youtube', 'YouTube', 'Kairo'], ['globe', 'Website', 'kairomusic.com']] },
};
for (const [id, a] of Object.entries(ABOUT)) Object.assign(ARTISTS[id], { from: a.from, bio: a.bio, links: a.links.map(([type, label, handle]) => ({ type, label, handle })) });

// ---------- Playlists ----------
const P = (id, title, by, art, tracks, extra = {}) => ({ id, title, by, art, tracks, ...extra });
export const PLAYLISTS = {
  'related-headlines': P('related-headlines', 'Related tracks: Headlines', 'SoundCloud', ART.headlines, ['headlines', 'nokia', 'greece', 'highest', 'wgft', 'proveit'], { caption: 'octobersveryown, Lil Wayne, brysontiller, partynextdoor' }),
  'related-highest': P('related-highest', 'Related tracks: HIGHEST IN THE ROOM', 'SoundCloud', ART.highest, ['highest', 'wgft', 'proveit', 'headlines', 'greece', 'nokia'], { caption: 'Travis Scott, JACKBOYS, THE SCOTTS, A$AP Rocky' }),
  'related-wgft': P('related-wgft', 'Related tracks: wgft (feat. Burna Boy)', 'SoundCloud', ART.wgft, ['wgft', 'highest', 'proveit', 'greece', 'nokia', 'headlines'], { caption: 'Gunna, Offset, Lil Baby, octobersveryown' }),
  'rap-playlist-1': P('rap-playlist-1', 'Rap Playlist 1', 'User 1', ART.highest, ['highest', 'wgft', 'headlines', 'greece', 'proveit'], { mine: true }),
  'gym-mix': P('gym-mix', 'Gym Mix', 'User 1', ART.wgft, ['wgft', 'highest', 'greece', 'headlines'], { mine: true }),
  'your-mix-2': P('your-mix-2', 'Your Mix 2', 'SoundCloud', ART.highest, ['highest', 'proveit', 'wgft', 'greece', 'headlines', 'nokia'], { mix: 2 }),
  'mix-1': P('mix-1', 'Mix 1', 'SoundCloud', ART.headlines, ['headlines', 'greece', 'nokia', 'proveit', 'highest'], { mix: 1, caption: 'octobersveryown, Childish Gambino, Gunna and more' }),
  'mix-2': P('mix-2', 'Mix 2', 'SoundCloud', ART.highest, ['highest', 'wgft', 'proveit', 'greece', 'headlines'], { mix: 2, caption: 'Travis Scott, THE SCOTTS, Roddy Ricch and more' }),
  'mix-3': P('mix-3', 'Mix 3', 'SoundCloud', ART.wgft, ['wgft', 'proveit', 'highest', 'nokia', 'greece'], { mix: 3, caption: 'Gunna, Offset, Lil Baby and more' }),
  bars: P('bars', 'Best UK Rap: Bars', 'SoundCloud UK', ART.bars, ['greece', 'proveit', 'highest', 'wgft', 'headlines']),
  lookout: P('lookout', "Tomorrow's Rap Hits: The Lookout", 'Hustle: Rap & Hip-Hop', ART.lookout, ['wgft', 'highest', 'proveit', 'nokia', 'greece']),
  latenight: P('latenight', 'Late Night R&B', 'SoundCloud', ART.latenight, ['proveit', 'nokia', 'headlines', 'greece']),
  'buzz-hip': P('buzz-hip', 'Buzzing Hip Hop & Rap', 'SoundCloud', ART.buzzHip, ['highest', 'wgft', 'greece', 'proveit', 'headlines'], { blurb: 'Audio omakase based on what real Hip Hop fans are playing.' }),
  'buzz-rnb': P('buzz-rnb', 'Buzzing R&B', 'SoundCloud', ART.buzzRnb, ['proveit', 'nokia', 'headlines', 'greece']),
  'buzz-elec': P('buzz-elec', 'Buzzing Electronic', 'SoundCloud', ART.buzzElec, ['nokia', 'highest', 'wgft', 'proveit']),
  daily: P('daily', 'Daily Drops', 'SoundCloud', ART.daily, ['wgft', 'nokia', 'proveit', 'greece', 'highest'], { blurb: 'New releases based on your taste. Updated every day.' }),
  weekly: P('weekly', 'Weekly Wave', 'SoundCloud', ART.weekly, ['greece', 'highest', 'headlines', 'wgft', 'proveit'], { blurb: 'The best of SoundCloud just for you. Updated every Monday.' }),
  'station-drake': P('station-drake', 'octobersveryown', 'SoundCloud', ART.headlines, ['headlines', 'nokia', 'greece', 'proveit', 'highest'], { station: 'drake' }),
  'station-gunna': P('station-gunna', 'Gunna', 'SoundCloud', ART.wgft, ['wgft', 'highest', 'proveit', 'greece'], { station: 'gunna' }),
  'station-travis': P('station-travis', 'Travis Scott', 'SoundCloud', ART.highest, ['highest', 'wgft', 'headlines', 'greece'], { station: 'travis' }),
  upload: P('upload', 'The Upload', 'SoundCloud', ART.upload, ['nokia', 'wgft', 'proveit', 'highest'], { blurb: 'Hit play on your weekly new music show, featuring Scott Steer, osk and more.' }),
};

export const HOME = {
  getBack: [{ type: 'playlist', id: 'rap-playlist-1' }, { type: 'playlist', id: 'related-headlines' }, { type: 'playlist', id: 'your-mix-2' }, { type: 'track', id: 'highest' }],
  moreLike: ['related-headlines', 'related-highest', 'related-wgft'],
  mixes: ['mix-1', 'mix-2', 'mix-3'],
  curated: ['bars', 'lookout', 'latenight'],
  buzzing: ['buzz-hip', 'buzz-rnb', 'buzz-elec'],
  madeFor: ['daily', 'weekly'],
  stations: ['station-drake', 'station-gunna', 'station-travis'],
};

export const TREND_CHIPS = [
  { id: 'all', label: 'All Genres', tracks: ['highest', 'headlines', 'proveit'] },
  { id: 'hiphop', label: 'Hip Hop', tracks: ['headlines', 'greece', 'nokia'] },
  { id: 'trap', label: 'Trap', tracks: ['highest', 'wgft', 'greece'] },
  { id: 'rnb', label: 'R&B', tracks: ['proveit', 'nokia', 'headlines'] },
  { id: 'melodic', label: 'Melodic Rap', tracks: ['wgft', 'proveit', 'highest'] },
  { id: 'drill', label: 'Drill', tracks: ['greece', 'highest', 'wgft'] },
];

export const GENRES = [
  { id: 'hiphop', name: 'Hip Hop & Rap', color: '#8d4bff', art: 'highest' },
  { id: 'electronic', name: 'Electronic', color: '#ff5fa2', art: 'nokia' },
  { id: 'pop', name: 'Pop', color: '#ffcc33', art: 'proveit' },
  { id: 'rnb', name: 'R&B', color: '#2bb5a8', art: 'headlines' },
  { id: 'party', name: 'Party', color: '#ff7a45', art: 'greece' },
  { id: 'chill', name: 'Chill', color: '#5e8cff', art: 'wgft' },
  { id: 'workout', name: 'Workout', color: '#2ed47a', art: 'wgft' },
  { id: 'techno', name: 'Techno', color: '#ff4d6d', art: 'nokia' },
  { id: 'indie', name: 'Indie', color: '#4d7cff', art: 'highest' },
  { id: 'soul', name: 'Soul', color: '#1fb8a8', art: 'proveit' },
  { id: 'country', name: 'Country', color: '#ff8a3d', art: 'greece' },
  { id: 'latin', name: 'Latin', color: '#d64dff', art: 'headlines' },
  { id: 'rock', name: 'Rock', color: '#ff5050', art: 'highest' },
];

export const ME = { name: 'User 1', avatar: ART.avatar };

// Seeded comments per track (timestamps are seconds into the track)
const COMMENT_POOL = [
  ['lilfrankie', 'this beat is crazy 🔥'], ['nova.wav', 'replaying this all day'], ['jaydenx', 'the drop goes so hard'],
  ['808mafia_fan', 'who else is here in 2026'], ['soph', 'production on this is unreal'], ['k.marie', 'my car speakers are not ready'],
  ['tyreek', 'underrated fr'], ['beatsbyrell', 'that switch up at the end'], ['mona', 'adding to every playlist I have'],
  ['dj_lex', 'the bass 😮‍💨'], ['zee', 'this one hits different at night'], ['marco.b', 'came here from the feed, not leaving'],
];
export function commentsFor(track) {
  const seed = [...track.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 9 }, (_, i) => {
    const [user, text] = COMMENT_POOL[(seed + i * 5) % COMMENT_POOL.length];
    const at = Math.floor(((seed * (i + 3)) % Math.max(30, track.dur / 1000 - 10)));
    return { user, text, at, ago: `${(i % 6) + 1}${i % 2 ? 'd' : 'w'}` };
  });
}

export const NOTIFICATIONS = [
  { art: ART.wgft, text: '<b>Gunna</b> posted a new track: wgft (feat. Burna Boy)', ago: '2h' },
  { art: ART.weekly, text: 'Your <b>Weekly Wave</b> is ready. Fresh picks based on what you play.', ago: '1d' },
  { art: ART.proveit, text: '<b>21 Savage</b> and <b>Summer Walker</b> released prove it', ago: '3d' },
  { art: ART.daily, text: 'New <b>Daily Drops</b> for you', ago: '4d' },
  { art: ART.highest, text: '<b>Travis Scott</b>: HIGHEST IN THE ROOM passed 67M plays', ago: '1w' },
];

// ---------- Helpers ----------
export const getTrack = (id) => TRACKS[id];
export const getPlaylist = (id) => PLAYLISTS[id];
export const getArtist = (id) => ARTISTS[id];

export function fmtCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'K';
  if (n >= 1e3) return n.toLocaleString('en-US');
  return String(n);
}
export function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Deterministic waveform per track
export function waveform(id, n = 120) {
  let x = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: n }, (_, i) => {
    const env = 0.55 + 0.35 * Math.sin(i / n * Math.PI * 1.6 + 0.4);
    return Math.max(0.12, Math.min(1, env * (0.55 + rnd() * 0.6)));
  });
}
