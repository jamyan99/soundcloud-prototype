// Audio engine: real tracks stream through SoundCloud's official Widget API,
// fictional tracks (Night Drive) and the ad jingle are synthesized with Web Audio.
// If streaming fails, playback keeps going on a silent clock so the UI never breaks.
import { getTrack, TRACKS } from './data.js';

const now = () => performance.now();
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- SoundCloud widget ----------
// iPhones only let a song start inside a tap, and that shapes everything here:
// - SoundCloud's player is an iframe, and its load() reloads the whole iframe, which throws away whatever a tap
//   unlocked. So each song gets its own iframe, and changing songs just switches between them.
// - The first time a player plays, it builds its audio first, which takes about a second. By then the tap has
//   expired, the phone refuses, and the app looks like it's playing in silence. So the audio is built ahead of
//   time (a seek does that and needs no tap), and a tap can then start it right away.
// - A song that starts without a tap (the next in the queue, the one after an ad) needs a player an earlier tap
//   has already opened, so every tap opens whichever players are built by then.
class SoundCloudStream {
  constructor(url, source) {
    Object.assign(this, { url, source, ready: false, built: false, opened: false, failed: false, wanted: false, muted: false, queued: null });
    const frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media';
    frame.title = 'SoundCloud audio stream';
    frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
      '&auto_play=false&visual=false&show_artwork=false&buying=false&sharing=false&download=false&show_comments=false&show_playcount=false&single_active=false';
    document.getElementById('sc-host').appendChild(frame);
    this.w = window.SC.Widget(frame);
    const E = window.SC.Widget.Events, current = () => source.cur === this;
    this.w.bind(E.READY, () => {
      this.ready = true;
      this.failed = false;    // a slow player can still arrive after the timeout gave up on it
      clearTimeout(this.readyTimer);
      // This song may have been picked while its player was still loading.
      if (this.queued && current()) { const q = this.queued; this.queued = null; source.load(url, q.play, q.startMs); }
      else { this.w.seekTo(1); this.whenBuilt(); }
    });
    this.w.bind(E.PLAY_PROGRESS, (e) => current() && source.emit('progress', { ms: e.currentPosition }));
    this.w.bind(E.PLAY, () => {
      if (!this.wanted) return this.w.pause();
      if (current()) { source.playSeen = true; source.emit('playing'); }
    });
    this.w.bind(E.PAUSE, () => current() && source.emit('paused'));
    this.w.bind(E.FINISH, () => current() && source.emit('ended'));
    this.w.bind(E.ERROR, () => this.fail());
    this.readyTimer = setTimeout(() => { if (!this.ready) this.fail(); }, 15000);
  }
  fail() {
    this.failed = true;
    if (this.source.cur === this) this.source.emit('error');
    this.source.preloadNext();
  }
  // The build takes a moment, and it's done when the seek shows up in SoundCloud's position.
  whenBuilt(tries = 0) {
    if (this.built) return;
    this.w.getPosition((ms) => {
      if (this.built) return;
      if (ms > 0) { this.built = true; this.source.onBuilt(); }
      else if (tries < 80) setTimeout(() => this.whenBuilt(tries + 1), 150);
    });
  }
  play() {
    this.wanted = true;
    this.source.playSeen = false;
    this.source.settledMs = undefined;
    if (this.ready) this.w.play(); else if (this.queued) this.queued.play = true;
  }
  pause() {
    this.wanted = false;
    if (this.ready) this.w.pause(); else if (this.queued) this.queued.play = false;
  }
}

class SoundCloudSource {
  constructor(emit) {
    this.emit = emit;
    this.streams = new Map();
    this.cur = null;
    this.available = !!(window.SC && window.SC.Widget);
    if (!this.available) return;
    this.urls = Object.values(TRACKS).filter((t) => t.sc).map((t) => t.sc);
    // Tasks that open on Night Drive or an ad never ask for a song up front, but still need a player ready.
    setTimeout(() => { if (!this.streams.size) this.preloadNext(); });
  }
  stream(url) {
    if (!this.streams.has(url)) {
      this.streams.set(url, new SoundCloudStream(url, this));
      setTimeout(() => this.preloadNext(), 12000);    // don't let one slow song hold up the rest
    }
    return this.streams.get(url);
  }
  // Players load one at a time, so a phone isn't parsing six copies of SoundCloud's code at once.
  preloadNext() {
    const url = this.urls.find((u) => !this.streams.has(u));
    if (url) this.stream(url);
  }
  onBuilt() {
    this.preloadNext();
    if (this.built) this.emit('built');
  }
  // True once the player the first tap will use is built.
  get built() {
    const s = this.cur || this.streams.values().next().value;
    return !!s && s.built;
  }
  load(url, play, startMs = 0) {
    const s = this.stream(url);
    if (this.cur && this.cur !== s) this.cur.pause();
    this.cur = s;
    this.pendingSeek = startMs > 1000 ? startMs : 0;
    this.seekDeadline = 0;
    this.settledMs = undefined;
    this.playSeen = false;
    if (s.failed) return this.emit('error');
    if (!s.ready) { s.queued = { play, startMs }; return; }
    // Stay quiet until the jump to the start position lands, so the song doesn't blip from 0:00 first.
    this.mute(!!this.pendingSeek);
    s.w.getDuration((d) => d > 0 && this.emit('duration', { ms: d }));
    // 1 rather than 0, so the build shows up in SoundCloud's position.
    s.w.seekTo(this.pendingSeek || 1);
    s.whenBuilt();
    if (play) s.play();
  }
  // Only call this inside a tap. Opens every built player, starting and stopping the ones that shouldn't play,
  // which is too quick to make a sound. True once there's nothing left to open.
  open(startingNow) {
    if (!this.available) return true;
    let done = true;
    for (const url of this.urls) {
      const s = this.streams.get(url);
      if (s && (s.failed || s.opened)) continue;
      if (!s || !s.built) { done = false; continue; }
      s.opened = true;
      if (!(startingNow && s === this.cur)) { s.w.play(); s.w.pause(); }
    }
    return done;
  }
  play() { if (this.cur) this.cur.play(); }
  pause() { if (this.cur) this.cur.pause(); }
  seek(ms) { if (this.cur && this.cur.ready) this.cur.w.seekTo(ms); }
  mute(on) { const s = this.cur; if (s && s.ready && s.muted !== on) { s.muted = on; s.w.setVolume(on ? 0 : 100); } }
}

// iPhones mute Web Audio (Night Drive, the ad jingle) while the ring/silent switch is on.
// Asking for a "playback" audio session keeps it audible, the way a music app is.
function playThroughSilentSwitch() {
  if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* not allowed here */ } return; }
  // Older iPhones: a playing <audio> element switches the session to playback, so loop a silent clip.
  // Only on iOS: elsewhere it would show a "media playing" notification for nothing.
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS) return;
  const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const str = (o, s) => [...s].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
  a.loop = true; a.playsInline = true; a.play().catch(() => {});
}

// ---------- Web Audio synth ----------
let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
const env = (g, t, a, peak, d, sustain = 0) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
};
const I = {
  kick(ctx, out, t, vol = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    env(g, t, 0.004, 0.9 * vol, 0.34); o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
  },
  snare(ctx, out, t, vol = 1) {
    const n = ctx.createBufferSource(); n.buffer = noise(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = ctx.createGain(); env(g, t, 0.002, 0.45 * vol, 0.18);
    n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + 0.22);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190;
    env(og, t, 0.002, 0.25 * vol, 0.09); o.connect(og).connect(out); o.start(t); o.stop(t + 0.12);
  },
  hat(ctx, out, t, vol = 1) {
    const n = ctx.createBufferSource(); n.buffer = noise(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
    const g = ctx.createGain(); env(g, t, 0.001, 0.12 * vol, 0.045);
    n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + 0.06);
  },
  bass(ctx, out, t, m, dur) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(m);
    f.type = 'lowpass'; f.Q.value = 7; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    env(g, t, 0.006, 0.32, dur * 0.9); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  },
  pad(ctx, out, t, notes, dur, vol = 1) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * vol, t + 0.5); g.gain.setValueAtTime(0.05 * vol, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    f.connect(g).connect(out);
    notes.forEach((m) => [-7, 7].forEach((det) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.5);
    }));
  },
  pluck(ctx, out, t, m, vol = 0.09, type = 'square') {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = midi(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    env(g, t, 0.003, vol, 0.22); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.3);
  },
  lead(ctx, out, t, m, dur, vol = 0.11) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = midi(m); lfo.frequency.value = 5.5; lg.gain.value = 4;
    lfo.connect(lg).connect(o.detune);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  },
  bell(ctx, out, t, m, vol = 0.18) {
    [1, 2.01, 3.98].forEach((h, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = midi(m) * h;
      env(g, t, 0.002, vol / (i + 1), 0.9); o.connect(g).connect(out); o.start(t); o.stop(t + 1);
    });
  },
};

// "Night Drive" by Kairo: 100 BPM synthwave in A minor, 80 bars = 3:12.
const ND = {
  stepDur: 0.15, steps: 80 * 16,
  chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]],
  roots: [45, 41, 48, 43],
  melody: [76, 0, 81, 0, 79, 76, 74, 0, 72, 0, 77, 0, 76, 72, 69, 0, 76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 71, 0, 74, 76, 79, 0],
  step(ctx, out, fx, s, t) {
    const bar = Math.floor(s / 16), i = s % 16, ci = bar % 4;
    const sec = bar < 8 ? 'intro' : bar < 24 ? 'verse' : bar < 40 ? 'chorus' : bar < 48 ? 'break' : bar < 64 ? 'verse' : 'chorus';
    const fade = bar >= 78 ? (80 - bar - i / 16) / 2 : 1;
    if (i === 0) I.pad(ctx, out, t, this.chords[ci], 16 * this.stepDur, (sec === 'break' ? 1.3 : 1) * fade);
    if (sec !== 'intro' || bar >= 2) {
      const tones = this.chords[ci].map((m) => m + 12), order = [0, 1, 2, 1];
      if (i % 2 === 0 || sec === 'chorus') I.pluck(ctx, fx, t, tones[order[(s / (sec === 'chorus' ? 1 : 2)) % 4 | 0]], 0.05 * fade);
    }
    const drums = sec === 'verse' || sec === 'chorus' || (sec === 'intro' && bar >= 4);
    if (drums) {
      if (i % 4 === 0) I.kick(ctx, out, t, sec === 'intro' ? 0.6 : fade);
      if (sec !== 'intro' && (i === 4 || i === 12)) I.snare(ctx, out, t, fade);
      if (sec !== 'intro' && (sec === 'chorus' ? true : i % 2 === 0)) I.hat(ctx, out, t, (i % 4 === 2 ? 1 : 0.6) * fade);
    }
    if (sec === 'verse' || sec === 'chorus') {
      if (i % 2 === 0) I.bass(ctx, out, t, this.roots[ci] + (sec === 'chorus' && i % 4 === 2 ? 12 : 0), this.stepDur * 1.8);
    }
    if ((sec === 'chorus' || sec === 'break') && i % 2 === 0) {
      const m = this.melody[(bar % 4) * 8 + i / 2];
      if (m) I.lead(ctx, fx, t, m, this.stepDur * 2.2, (sec === 'break' ? 0.07 : 0.11) * fade);
    }
  },
};

// Ad jingle for "Brightside Coffee": 120 BPM, 30 seconds.
const JINGLE = {
  stepDur: 0.125, steps: 240,
  tune: [72, 76, 79, 84, 0, 79, 81, 79, 76, 0, 74, 76, 72, 0, 0, 0],
  step(ctx, out, fx, s, t) {
    const i = s % 16;
    if (i % 4 === 0) I.kick(ctx, out, t, 0.55);
    if (i === 4 || i === 12) I.snare(ctx, out, t, 0.4);
    if (i % 2 === 1) I.hat(ctx, out, t, 0.5);
    const m = this.tune[i];
    if (m && Math.floor(s / 16) % 2 === 0) I.pluck(ctx, fx, t, m, 0.08, 'triangle');
    if (s === this.steps - 16) I.bell(ctx, out, t, 84);
  },
};

class SynthPlayer {
  constructor(ctx, dest, song, onEnded) {
    Object.assign(this, { ctx, dest, song, onEnded, playing: false, offset: 0 });
  }
  pos() { return this.playing ? this.offset + (this.ctx.currentTime - this.t0) : this.offset; }
  play(fromSec = this.offset) {
    this.stop(true);
    const ctx = this.ctx;
    this.bus = ctx.createGain(); this.bus.gain.value = 1; this.bus.connect(this.dest);
    const delay = ctx.createDelay(1); delay.delayTime.value = this.song.stepDur * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    this.fx = ctx.createGain(); this.fx.connect(this.bus); this.fx.connect(delay); delay.connect(fb).connect(delay); delay.connect(this.bus);
    this.offset = fromSec; this.t0 = ctx.currentTime + 0.04; this.playing = true;
    this.nextStep = Math.ceil(fromSec / this.song.stepDur);
    this.nextTime = this.t0 + (this.nextStep * this.song.stepDur - fromSec);
    const sched = () => {
      while (this.playing && this.nextTime < ctx.currentTime + 0.15) {
        if (this.nextStep >= this.song.steps) { this.playing = false; this.offset = this.song.steps * this.song.stepDur; this.onEnded && this.onEnded(); return; }
        this.song.step(ctx, this.bus, this.fx, this.nextStep, this.nextTime);
        this.nextStep++; this.nextTime += this.song.stepDur;
      }
    };
    sched(); this.timer = setInterval(sched, 25);
  }
  stop(keepOffset) {
    if (this.playing && !keepOffset) this.offset = this.pos();
    if (this.playing && keepOffset) this.offset = this.pos();
    this.playing = false; clearInterval(this.timer);
    if (this.bus) {
      const b = this.bus; b.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.015);
      setTimeout(() => b.disconnect(), 300); this.bus = null;
    }
  }
}

// ---------- Player ----------
export class Player {
  constructor() {
    this.handlers = {};
    this.trackId = null; this.kind = null; this.playing = false;
    this.basePos = 0; this.baseAt = now(); this.dur = 0;
    this.unlocked = false; this.scFailed = false; this.previewEnd = null; this.ad = null;
    this.waiting = false;    // SoundCloud has been asked to play, but the song isn't moving yet
    this.sc = new SoundCloudSource((type, d) => this.onSC(type, d));
  }
  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, d) { (this.handlers[evt] || []).forEach((fn) => fn(d)); }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.85;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  // True when the first tap can start SoundCloud right away.
  get audioReady() { return !this.sc.available || this.scFailed || this.sc.built; }
  // Browsers only allow sound after the first tap or click. Call on every tap until it returns true.
  unlock() {
    if (!this.unlocked) {
      this.unlocked = true;
      playThroughSilentSwitch();
      this.ensureCtx();
      // Like the song position, the ad countdown waits for sound: the 30 seconds start now.
      if (this.ad) { this.ad.t0 = now(); this.startJingle(); }
      else if (this.trackId) this.startSource(this.basePos, this.playing);
    }
    return this.scFailed || this.sc.open(this.kind === 'sc' && this.playing && !this.ad);
  }

  position() {
    if (!this.unlocked) return this.basePos;
    if (this.kind === 'synth' && this.synth) return this.synth.pos() * 1000;
    // The clock waits for real sound, so a song that hasn't started doesn't look like it's playing.
    if (!this.playing || this.waiting) return this.basePos;
    return Math.min(this.dur, this.basePos + (now() - this.baseAt));
  }
  remaining() {
    if (!this.ad) return 0;
    return this.unlocked ? Math.max(0, this.ad.total - (now() - this.ad.t0)) : this.ad.total;
  }

  load(trackId, { autoplay = true, startMs = 0, preview = false } = {}) {
    this.stopSource();
    this.waiting = false; clearTimeout(this.refusal);
    const t = getTrack(trackId);
    this.trackId = trackId; this.dur = t.dur;
    this.basePos = startMs; this.baseAt = now();
    this.previewEnd = preview ? Math.min(t.dur - 500, startMs + 30000) : null;
    this.kind = t.synth ? 'synth' : (this.sc.available && !this.scFailed ? 'sc' : 'silent');
    this.playing = !!autoplay && !this.ad;
    // Picking a song during an ad makes it the one that plays when the ad ends.
    if (this.ad) this.ad.upNext = trackId;
    this.emit('track', trackId); this.emit('state', this.playing);
    if (this.ad) this.emit('adUpNext', trackId);
    if (this.unlocked && !this.ad) this.startSource(startMs, this.playing);
    else if (!this.unlocked && this.kind === 'sc') this.sc.load(t.sc, false, startMs);
  }
  startSource(startMs, play) {
    const t = getTrack(this.trackId);
    if (this.kind === 'sc') { this.waiting = play; this.sc.load(t.sc, play, startMs); }
    else if (this.kind === 'synth') {
      this.ensureCtx();
      this.synth = new SynthPlayer(this.ctx, this.master, ND, () => this.emit('ended'));
      this.synth.offset = startMs / 1000;
      if (play) this.synth.play(startMs / 1000);
    }
    this.basePos = startMs; this.baseAt = now();
  }
  stopSource() {
    if (this.kind === 'sc' && this.unlocked) this.sc.pause();
    if (this.synth) { this.synth.stop(); this.synth = null; }
  }

  play() {
    if (this.ad || !this.trackId) return;
    this.basePos = this.position(); this.baseAt = now(); this.playing = true;
    clearTimeout(this.refusal);
    if (this.unlocked) {
      if (this.kind === 'sc') { this.waiting = true; this.sc.play(); }
      else if (this.kind === 'synth') this.synth ? this.synth.play() : this.startSource(this.basePos, true);
    }
    this.emit('state', true);
  }
  pause() {
    if (!this.trackId) return;
    this.basePos = this.position(); this.baseAt = now(); this.playing = false;
    this.waiting = false; clearTimeout(this.refusal);
    if (this.unlocked) {
      if (this.kind === 'sc') this.sc.pause();
      else if (this.kind === 'synth' && this.synth) this.synth.stop();
    }
    this.emit('state', false);
  }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(ms) {
    ms = Math.max(0, Math.min(this.dur - 300, ms));
    this.basePos = ms; this.baseAt = now();
    if (this.previewEnd) this.previewEnd = null;
    if (this.unlocked) {
      if (this.kind === 'sc') { this.sc.pendingSeek = ms; this.sc.seekDeadline = 0; this.sc.seek(ms); }
      else if (this.kind === 'synth' && this.synth) this.playing ? this.synth.play(ms / 1000) : (this.synth.offset = ms / 1000);
    }
    this.emit('seek', ms);
  }

  onSC(type, d) {
    if (type === 'built') return this.emit('audioReady');
    if (this.kind !== 'sc' && type !== 'error') return;
    if (type === 'progress') {
      const sc = this.sc, ps = sc.pendingSeek;
      // SoundCloud also reports its position while nothing is playing, and a seek nudges it, so sound means the
      // position has really moved on from where it settled. A big jump or a step back is a seek, so start over.
      if (!(d.ms >= sc.settledMs && d.ms - sc.settledMs < 5000)) sc.settledMs = d.ms;
      const moving = d.ms - sc.settledMs > 120;
      if (ps) {
        // The widget can take the seek before audio has buffered, then start from 0:00 anyway.
        // Wait until it's really playing just past the target, re-seeking if it wandered off.
        sc.seekDeadline ||= now() + 10000;
        const off = d.ms - ps;
        if ((off < 300 || off > 1500) && now() < sc.seekDeadline) {
          if (Math.abs(off) > 1500 && now() - (sc.lastSeek || 0) > 300) { sc.seek(ps); sc.lastSeek = now(); }
          return;
        }
        sc.pendingSeek = 0;
        sc.mute(false);
      }
      if (this.waiting && !moving) return;
      this.waiting = false;
      this.basePos = d.ms; this.baseAt = now();
    } else if (type === 'playing') {
      clearTimeout(this.refusal);
      if (!this.playing || this.ad) this.sc.pause();
    } else if (type === 'paused') {
      // The phone refused the song, or a call or the lock screen paused it. A quick pause and play also lands
      // here, so give it a moment and only believe it if nothing has started since.
      clearTimeout(this.refusal);
      this.refusal = setTimeout(() => this.pausedByPhone(), 400);
    } else if (type === 'duration') {
      this.dur = d.ms; this.emit('duration', d.ms);
    } else if (type === 'ended') {
      if (this.playing) this.emit('ended');
    } else if (type === 'error' && !this.scFailed) {
      this.scFailed = true;
      if (this.kind === 'sc') { this.basePos = this.position(); this.baseAt = now(); this.waiting = false; this.kind = 'silent'; }
      this.emit('notice', "Couldn't stream from SoundCloud, so this track plays silently. Everything else still works.");
      this.emit('audioReady');
    }
  }
  // Show what's really happening: paused, ready for a tap on Play to start it, instead of a clock running in silence.
  pausedByPhone() {
    if (!this.playing || this.ad || this.kind !== 'sc' || !this.sc.playSeen) return;
    const refused = this.waiting;
    this.basePos = this.position(); this.baseAt = now(); this.playing = false; this.waiting = false;
    this.emit('state', false);
    if (refused) this.emit('notice', 'Tap play to start the music');
  }

  // Called every animation frame by the app.
  tick() {
    if (this.ad && this.remaining() <= 0) return this.endAd();
    if (!this.playing || this.ad) return;
    const p = this.position();
    if (this.previewEnd && p >= this.previewEnd) { this.previewEnd = null; this.pause(); this.emit('previewEnd'); return; }
    if (this.kind === 'silent' && p >= this.dur - 50) { this.playing = false; this.emit('ended'); }
  }

  // Fix 3: the ad plays in the mini player and the app stays usable.
  startAd({ upNext, seconds = 30 }) {
    if (this.playing) this.pause();
    this.stopSource();
    this.ad = { upNext, total: seconds * 1000, t0: now() };
    this.emit('ad', this.ad);
    if (this.unlocked) this.startJingle();
  }
  startJingle() {
    this.ensureCtx();
    const elapsed = (now() - this.ad.t0) / 1000;
    this.jingle = new SynthPlayer(this.ctx, this.master, JINGLE, null);
    this.jingle.play(elapsed % (JINGLE.steps * JINGLE.stepDur));
  }
  endAd() {
    const next = this.ad.upNext;
    if (this.jingle) { this.jingle.stop(); this.jingle = null; }
    this.ad = null;
    this.emit('adEnd');
    this.load(next, { autoplay: true });
  }
}
