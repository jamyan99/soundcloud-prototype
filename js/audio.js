// Audio engine: real tracks stream through SoundCloud's official Widget API,
// fictional tracks (Night Drive) and the ad jingle are synthesized with Web Audio.
// If streaming fails, playback keeps going on a silent clock so the UI never breaks.
import { getTrack, TRACKS } from './data.js';

const now = () => performance.now();
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- SoundCloud widget ----------
class SoundCloudSource {
  constructor(emit) {
    this.emit = emit;
    this.ready = false;
    this.queued = null;
    this.available = !!(window.SC && window.SC.Widget);
    if (!this.available) return;
    const first = Object.values(TRACKS).find((t) => t.sc);
    const frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media';
    frame.title = 'SoundCloud audio stream';
    frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(first.sc) +
      '&auto_play=false&visual=false&show_artwork=false&buying=false&sharing=false&download=false&show_comments=false&show_playcount=false&single_active=false';
    document.getElementById('sc-host').appendChild(frame);
    this.loadedUrl = first.sc;
    this.w = window.SC.Widget(frame);
    const E = window.SC.Widget.Events;
    this.w.bind(E.READY, () => {
      this.ready = true;
      clearTimeout(this.readyTimer);
      if (this.queued) { const q = this.queued; this.queued = null; this.load(q.url, q.play, q.startMs); }
    });
    this.w.bind(E.PLAY_PROGRESS, (e) => this.emit('progress', { ms: e.currentPosition }));
    this.w.bind(E.PLAY, () => this.emit('playing'));
    this.w.bind(E.FINISH, () => this.emit('ended'));
    this.w.bind(E.ERROR, () => this.emit('error'));
    this.readyTimer = setTimeout(() => { if (!this.ready) this.emit('error'); }, 15000);
  }
  load(url, play, startMs = 0) {
    if (!this.ready) { this.queued = { url, play, startMs }; return; }
    this.pendingSeek = startMs > 1000 ? startMs : 0;
    this.seekDeadline = 0;
    // Stay quiet until the jump to the start position lands, so the song doesn't blip from 0:00 first.
    this.mute(!!this.pendingSeek);
    const started = () => {
      this.w.getDuration((d) => d > 0 && this.emit('duration', { ms: d }));
      this.w.seekTo(this.pendingSeek);
      if (play) this.w.play();
    };
    // Reloading a track SoundCloud already has costs seconds, so only load when it changes.
    if (url === this.loadedUrl) return started();
    this.loadedUrl = url;
    this.w.load(url, {
      auto_play: false, visual: false, show_artwork: false, buying: false, sharing: false, download: false,
      show_comments: false, show_playcount: false, single_active: false,
      callback: started,
    });
  }
  play() { this.ready ? this.w.play() : this.queued && (this.queued.play = true); }
  pause() { this.ready ? this.w.pause() : this.queued && (this.queued.play = false); }
  seek(ms) { if (this.ready) this.w.seekTo(ms); }
  mute(on) { if (this.ready && this.muted !== on) { this.muted = on; this.w.setVolume(on ? 0 : 100); } }
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
  // Browsers only allow sound after the first tap or click.
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    playThroughSilentSwitch();
    this.ensureCtx();
    if (this.ad) this.startJingle();
    else if (this.trackId) this.startSource(this.basePos, this.playing);
  }

  position() {
    if (!this.unlocked) return this.basePos;
    if (this.kind === 'synth' && this.synth) return this.synth.pos() * 1000;
    if (!this.playing) return this.basePos;
    return Math.min(this.dur, this.basePos + (now() - this.baseAt));
  }
  remaining() { return this.ad ? Math.max(0, this.ad.total - (now() - this.ad.t0)) : 0; }

  load(trackId, { autoplay = true, startMs = 0, preview = false } = {}) {
    this.stopSource();
    const t = getTrack(trackId);
    this.trackId = trackId; this.dur = t.dur;
    this.basePos = startMs; this.baseAt = now();
    this.previewEnd = preview ? Math.min(t.dur - 500, startMs + 30000) : null;
    this.kind = t.synth ? 'synth' : (this.sc.available && !this.scFailed ? 'sc' : 'silent');
    this.playing = !!autoplay && !this.ad;
    this.emit('track', trackId); this.emit('state', this.playing);
    if (this.unlocked && !this.ad) this.startSource(startMs, this.playing);
  }
  startSource(startMs, play) {
    const t = getTrack(this.trackId);
    if (this.kind === 'sc') this.sc.load(t.sc, play, startMs);
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
    if (this.unlocked) {
      if (this.kind === 'sc') this.sc.play();
      else if (this.kind === 'synth') this.synth ? this.synth.play() : this.startSource(this.basePos, true);
    }
    this.emit('state', true);
  }
  pause() {
    if (!this.trackId) return;
    this.basePos = this.position(); this.baseAt = now(); this.playing = false;
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
    if (this.kind !== 'sc' && type !== 'error') return;
    if (type === 'progress') {
      const sc = this.sc, ps = sc.pendingSeek;
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
      this.basePos = d.ms; this.baseAt = now();
    } else if (type === 'playing') {
      if (!this.playing || this.ad) this.sc.pause();
    } else if (type === 'duration') {
      this.dur = d.ms; this.emit('duration', d.ms);
    } else if (type === 'ended') {
      if (this.playing) this.emit('ended');
    } else if (type === 'error' && !this.scFailed) {
      this.scFailed = true;
      if (this.kind === 'sc') { this.kind = 'silent'; this.basePos = this.position(); this.baseAt = now(); }
      this.emit('notice', "Couldn't stream from SoundCloud, so this track plays silently. Everything else still works.");
    }
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
