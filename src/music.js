/* =========================================================================
 * Seven Falls — Retro Chiptune Music Engine
 * -------------------------------------------------------------------------
 * Web Audio API music system for the Bible roguelike "Seven Falls".
 * Everything is generated procedurally from oscillators — NO audio files.
 *
 * Signal chain per voice:
 *   OscillatorNode(s) -> noteGain (envelope) -> BiquadFilter (lowpass warmth)
 *                       -> laneGain -> masterGain -> Compressor -> destination
 *
 * Percussion (noise / kick) -> masterGain directly.
 *
 * Exports: const MusicEngine = { init, playTrack, stop, setVolume, isPlaying }
 * ========================================================================= */

const MusicEngine = (function () {
  'use strict';

  /* ----------------------------- Audio state ---------------------------- */
  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let noiseBuffer = null;
  let volume = 0.55;

  let currentTrack = null;     // { name, bpm, beatDur, lanes:[...] }
  let schedulerTimer = null;
  const LOOKAHEAD = 0.12;      // seconds scheduled ahead of currentTime
  const TICK = 25;             // ms between scheduler wake-ups

  /* ------------------------- Music theory helpers ----------------------- */
  const NOTE_INDEX = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
  };

  function ntof(name) {
    if (typeof name === 'number') return name;
    const m = String(name).match(/^([A-G][#b]?)(-?\d)$/);
    if (!m) return 0;
    const midi = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Chord quality -> semitone intervals from root.
  const QUAL = {
    min: [0, 3, 7], maj: [0, 4, 7], dim: [0, 3, 6], aug: [0, 4, 8],
    sus2: [0, 2, 7], sus4: [0, 5, 7],
    min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10],
    m7b5: [0, 3, 6, 10], minMaj7: [0, 3, 7, 11], add9: [0, 4, 7, 14],
    pow: [0, 7], min9: [0, 3, 7, 10, 14]
  };

  // chord('A3','min') -> [freq, freq, freq]
  function chord(rootName, qual) {
    const m = String(rootName).match(/^([A-G][#b]?)(-?\d)$/);
    const base = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return QUAL[qual].map(i => 440 * Math.pow(2, (base + i - 69) / 12));
  }

  function chordsOf(prog) {
    return prog.map(([r, q]) => chord(r, q));
  }

  /* --------------------------- Step builders --------------------------- */
  // A "step" is { n: noteName|freq|freq[]|null, d: beats, v: 0..1 }.

  // Arpeggiated lane from chord progressions.
  //   chords: [[f,f,f]...], beatsPerChord: total beats for that chord,
  //   idxPattern: which chord degrees to play (e.g. [0,1,2,1]).
  function arp(chords, beatsPerChord, idxPattern, vol) {
    const out = [];
    const stepBeats = beatsPerChord / idxPattern.length;
    chords.forEach(ch => {
      for (let k = 0; k < idxPattern.length; k++) {
        const idx = idxPattern[k] % ch.length;
        out.push({ n: ch[idx], d: stepBeats, v: vol });
      }
    });
    return out;
  }

  // Sustained pad chord lane (one chord per bar).
  function pad(chords, beatsPerChord, vol) {
    return chords.map(ch => ({ n: ch, d: beatsPerChord, v: vol }));
  }

  // Bass lane: one root note-name per bar, repeated by a rhythm pattern.
  //   roots: ['A2','D2'...], pattern: [{d, v}] summing to bar length.
  function bass(roots, pattern, vol) {
    const out = [];
    roots.forEach(r => {
      pattern.forEach(s => out.push({ n: r, d: s.d, v: s.v * vol }));
    });
    return out;
  }

  // Explicit melody lane. notes: [[name, beats, vel?], [null, beats] (rest)...]
  function mel(notes, vol) {
    return notes.map(x => {
      if (x[0] === null) return { n: null, d: x[1], v: 0 };
      return { n: x[0], d: x[1], v: (x[2] == null ? 1 : x[2]) * vol };
    });
  }

  // Percussion lane. pattern: [{n:'kick'|'snare'|'hat'|'clap', d, v}]
  function perc(pattern, vol) {
    return pattern.map(p => ({ n: p.n, d: p.d, v: p.v * vol }));
  }

  /* ------------------------------ Tracks -------------------------------- */
  // Each builder returns { bpm, lanes:[ {instr, vol, cutoff, q?, width?,
  //                                       env?, steps:[...]} ] }.
  const TRACKS = {

    /* a) TITLE — slow, mysterious, minor. Castlevania vibe. ~100 BPM. */
    title: () => {
      const ch = chordsOf([['A3', 'min'], ['D3', 'min'], ['E3', 'min'], ['A3', 'min']]);
      return {
        bpm: 100,
        lanes: [
          { instr: 'sawtooth', vol: 0.16, cutoff: 850, width: 16, env: { a: 0.4, r: 0.6 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.20, cutoff: 1100,
            steps: bass(['A1', 'D2', 'E1', 'A1'], [{ d: 4, v: 0.8 }], 0.6) },
          { instr: 'square', vol: 0.26, cutoff: 1900, env: { a: 0.02, r: 0.45 },
            steps: mel([
              ['A4', 2, 0.7], [null, 1], ['C5', 1, 0.5], ['E5', 1, 0.6],
              ['D5', 2, 0.6], ['A4', 1, 0.5], [null, 1]
            ], 1) },
          { instr: 'perc', vol: 0.5,
            steps: perc([{ n: 'kick', d: 4, v: 0.5 }, { n: 'kick', d: 4, v: 0.5 },
                         { n: 'kick', d: 4, v: 0.5 }, { n: 'kick', d: 4, v: 0.5 }], 1) }
        ]
      };
    },

    /* b) EXPLORE — atmospheric, cautious. Quiet pads + occasional melody. */
    explore: () => {
      const ch = chordsOf([['A3', 'min'], ['D3', 'min'], ['E3', 'min'], ['C3', 'maj']]);
      return {
        bpm: 84,
        lanes: [
          { instr: 'sawtooth', vol: 0.12, cutoff: 650, width: 18, env: { a: 0.6, r: 0.8 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.10, cutoff: 900,
            steps: bass(['A1', 'D2', 'E1', 'C2'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'square', vol: 0.16, cutoff: 1500, env: { a: 0.03, r: 0.5 },
            steps: mel([
              [null, 2], ['E4', 1, 0.6], [null, 1], ['A4', 1, 0.5], [null, 3],
              ['D4', 1, 0.5], [null, 1], ['G4', 1, 0.5], [null, 2]
            ], 1) }
        ]
      };
    },

    /* c) COMBAT — fast, intense. ~140 BPM driving bassline + urgent melody. */
    combat: () => {
      const ch = chordsOf([['A3', 'min'], ['F3', 'maj'], ['G3', 'maj'], ['E3', 'min']]);
      return {
        bpm: 140,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 1300, width: 10, env: { a: 0.05, r: 0.2 },
            steps: pad(ch, 4, 0.45) },
          { instr: 'triangle', vol: 0.26, cutoff: 1400,
            steps: bass(['A2', 'F2', 'G2', 'E2'],
              [{ d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }, { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 },
               { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }, { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }], 0.7) },
          { instr: 'square', vol: 0.24, cutoff: 3600, env: { a: 0.005, r: 0.08 },
            steps: arp(ch, 4, [0, 2, 1, 2, 0, 2, 1, 2], 0.7) },
          { instr: 'perc', vol: 0.6,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'snare', d: 0.5, v: 0.7 }, { n: 'hat', d: 0.5, v: 0.4 }
            ], 1) }
        ]
      };
    },

    /* d) BOSS — epic, dramatic. ~120 BPM heavy bass + choir-like pads. */
    boss: () => {
      const ch = chordsOf([['D3', 'min'], ['G3', 'min'], ['Bb3', 'maj'], ['A3', 'maj']]);
      return {
        bpm: 120,
        lanes: [
          { instr: 'sawtooth', vol: 0.14, cutoff: 1500, width: 22, env: { a: 0.25, r: 0.4 },
            steps: pad(ch, 4, 0.6) },
          { instr: 'triangle', vol: 0.30, cutoff: 950,
            steps: bass(['D2', 'G2', 'Bb2', 'A2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.6 }, { d: 1, v: 0.9 }, { d: 1, v: 0.6 }], 0.7) },
          { instr: 'square', vol: 0.22, cutoff: 2600, env: { a: 0.02, r: 0.3 },
            steps: mel([
              ['D4', 1, 0.6], ['F4', 1, 0.6], ['A4', 1, 0.7], ['F4', 1, 0.5],
              ['G4', 1, 0.6], ['Bb4', 1, 0.7], ['D5', 2, 0.6], [null, 2]
            ], 1) },
          { instr: 'perc', vol: 0.7,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* e) DEATH — slow, somber. Single notes fading out. ~62 BPM. */
    death: () => {
      return {
        bpm: 62,
        lanes: [
          { instr: 'square', vol: 0.22, cutoff: 1100, env: { a: 0.05, r: 1.4 },
            steps: mel([
              ['A4', 2, 0.8], [null, 2], ['G4', 2, 0.7], [null, 2],
              ['F4', 2, 0.7], [null, 2], ['E4', 3, 0.8], [null, 3]
            ], 1) },
          { instr: 'triangle', vol: 0.18, cutoff: 700, env: { a: 0.1, r: 1.0 },
            steps: mel([['A2', 4, 0.7], [null, 4], ['A2', 4, 0.6], [null, 4]], 1) }
        ]
      };
    },

    /* f) VICTORY — triumphant major fanfare. ~128 BPM. */
    victory: () => {
      const ch = chordsOf([['C4', 'maj'], ['F4', 'maj'], ['G4', 'maj'], ['C4', 'maj']]);
      return {
        bpm: 128,
        lanes: [
          { instr: 'sawtooth', vol: 0.12, cutoff: 2200, width: 12, env: { a: 0.05, r: 0.3 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.28, cutoff: 1300,
            steps: bass(['C2', 'F2', 'G2', 'C2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }, { d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.7) },
          { instr: 'square', vol: 0.30, cutoff: 4000, env: { a: 0.005, r: 0.12 },
            steps: mel([
              ['C5', 0.5, 0.9], ['E5', 0.5, 0.9], ['G5', 0.5, 0.9], ['C6', 1, 1.0],
              ['F5', 0.5, 0.8], ['A5', 0.5, 0.8], ['G5', 0.5, 0.8], ['C6', 1, 1.0],
              ['E5', 1, 0.9], ['G5', 1, 0.9], ['C6', 2, 1.0]
            ], 1) },
          { instr: 'perc', vol: 0.7,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.8 }
            ], 1) }
        ]
      };
    },

    /* g) SHOP — jazzy, mysterious. Demon merchant. ~110 BPM swing. */
    shop: () => {
      const ch = chordsOf([['A3', 'min7'], ['D3', 'min7'], ['E3', 'dom7'], ['A3', 'min7']]);
      return {
        bpm: 110,
        lanes: [
          { instr: 'sawtooth', vol: 0.09, cutoff: 1100, width: 14, env: { a: 0.08, r: 0.3 },
            steps: pad(ch, 4, 0.5) },
          // Walking-ish bass with a swung feel (long/short durations).
          { instr: 'triangle', vol: 0.24, cutoff: 1200,
            steps: bass(['A2', 'D2', 'E2', 'A2'],
              [{ d: 1.3, v: 0.9 }, { d: 0.7, v: 0.5 }, { d: 1.3, v: 0.9 }, { d: 0.7, v: 0.6 }], 0.7) },
          { instr: 'square', vol: 0.20, cutoff: 3000, env: { a: 0.01, r: 0.12 },
            steps: arp(ch, 4, [0, 3, 2, 1, 0, 2, 1, 3], 0.5) },
          { instr: 'perc', vol: 0.4,
            steps: perc([
              { n: 'hat', d: 1.3, v: 0.3 }, { n: 'hat', d: 0.7, v: 0.25 },
              { n: 'hat', d: 1.3, v: 0.3 }, { n: 'hat', d: 0.7, v: 0.25 },
              { n: 'hat', d: 1.3, v: 0.3 }, { n: 'hat', d: 0.7, v: 0.25 },
              { n: 'hat', d: 1.3, v: 0.3 }, { n: 'hat', d: 0.7, v: 0.25 }
            ], 1) }
        ]
      };
    },

    /* h) SHRINE — sacred, peaceful. Organ-like pads + choir feel. */
    shrine: () => {
      const ch = chordsOf([['D4', 'maj'], ['A3', 'maj'], ['B3', 'min'], ['A3', 'maj']]);
      return {
        bpm: 76,
        lanes: [
          { instr: 'sawtooth', vol: 0.15, cutoff: 1700, width: 26, env: { a: 0.4, r: 0.7 },
            steps: pad(ch, 4, 0.6) },
          { instr: 'sawtooth', vol: 0.07, cutoff: 900, width: 30, env: { a: 0.5, r: 0.8 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.14, cutoff: 2000, env: { a: 0.02, r: 0.4 },
            steps: arp(ch, 4, [0, 1, 2, 1], 0.4) },
          { instr: 'square', vol: 0.10, cutoff: 2600, env: { a: 0.03, r: 0.5 },
            steps: mel([
              ['D5', 2, 0.5], [null, 2], ['A4', 2, 0.5], [null, 2],
              ['F#5', 2, 0.5], [null, 2], ['E5', 2, 0.5]
            ], 1) }
        ]
      };
    },

    /* i) EVENT — tense, uncertain. Suspenseful dissonant chords. ~90 BPM. */
    event: () => {
      const ch = chordsOf([['C3', 'sus4'], ['C3', 'sus2'], ['D3', 'dim'], ['C3', 'sus4']]);
      return {
        bpm: 90,
        lanes: [
          { instr: 'sawtooth', vol: 0.13, cutoff: 700, width: 20, env: { a: 0.3, r: 0.5 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.22, cutoff: 600,
            steps: bass(['C2', 'C2', 'D2', 'C2'],
              [{ d: 2, v: 0.8 }, { d: 2, v: 0.6 }], 0.6) },
          // Pulsing high tension notes.
          { instr: 'square', vol: 0.14, cutoff: 2400, env: { a: 0.01, r: 0.1 },
            steps: mel([
              ['G4', 0.5, 0.5], [null, 0.5], ['G4', 0.5, 0.5], [null, 0.5],
              ['Ab4', 0.5, 0.5], [null, 0.5], ['G4', 0.5, 0.5], [null, 0.5],
              ['Bb4', 0.5, 0.5], [null, 0.5], ['A4', 0.5, 0.5], [null, 0.5],
              ['G4', 0.5, 0.5], [null, 0.5], [null, 0.5], [null, 0.5]
            ], 1) }
        ]
      };
    },

    /* j) NEMESIS — dark, stalking. Slow heartbeat bass. The Stalker. */
    nemesis: () => {
      return {
        bpm: 70,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 500, width: 24, env: { a: 0.6, r: 1.0 },
            steps: pad(chordsOf([['A2', 'min'], ['A2', 'min'], ['A2', 'min'], ['A2', 'min']]), 4, 0.5) },
          { instr: 'triangle', vol: 0.20, cutoff: 400,
            steps: bass(['A1', 'A1', 'A1', 'A1'], [{ d: 4, v: 0.9 }], 0.6) },
          // Heartbeat: two low kicks per bar.
          { instr: 'perc', vol: 0.8,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'kick', d: 0.5, v: 0.5 }, { n: 'kick', d: 2.5, v: 0.9 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'kick', d: 0.5, v: 0.5 }, { n: 'kick', d: 2.5, v: 0.9 }
            ], 1) },
          { instr: 'square', vol: 0.12, cutoff: 2000, env: { a: 0.02, r: 0.4 },
            steps: mel([
              [null, 3], ['E5', 1, 0.5], [null, 4], ['F5', 1, 0.5], [null, 3], ['E5', 1, 0.4]
            ], 1) }
        ]
      };
    },

    /* k) FLOOR_BOSS — more intense than boss. ~130 BPM (Dukes, gods). */
    floor_boss: () => {
      const ch = chordsOf([['E3', 'min'], ['C3', 'maj'], ['G3', 'maj'], ['D3', 'maj']]);
      return {
        bpm: 130,
        lanes: [
          { instr: 'sawtooth', vol: 0.12, cutoff: 1600, width: 20, env: { a: 0.06, r: 0.2 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.30, cutoff: 1000,
            steps: bass(['E2', 'C2', 'G2', 'D2'],
              [{ d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }, { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 },
               { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }, { d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }], 0.7) },
          { instr: 'square', vol: 0.24, cutoff: 3200, env: { a: 0.005, r: 0.07 },
            steps: arp(ch, 4, [0, 2, 1, 2, 0, 2, 1, 2], 0.7) },
          { instr: 'perc', vol: 0.75,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* l) LUCIFER — the ultimate. Grand, terrifying, full mix. Final boss. */
    lucifer: () => {
      const ch = chordsOf([
        ['D3', 'min'], ['Bb3', 'maj'], ['F3', 'maj'], ['C3', 'maj'],
        ['D3', 'min'], ['Bb3', 'maj'], ['A3', 'maj'], ['A3', 'maj']
      ]);
      return {
        bpm: 140,
        lanes: [
          // Grand choir pad stack.
          { instr: 'sawtooth', vol: 0.12, cutoff: 1800, width: 28, env: { a: 0.2, r: 0.3 },
            steps: pad(ch, 2, 0.6) },
          // Sub-bass drone + driving bass.
          { instr: 'triangle', vol: 0.16, cutoff: 700,
            steps: bass(['D2', 'Bb1', 'F2', 'C2', 'D2', 'Bb1', 'A1', 'A1'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.7) },
          // Driving eighth-note bass ostinato.
          { instr: 'triangle', vol: 0.22, cutoff: 1200,
            steps: bass(['D2', 'Bb2', 'F2', 'C2', 'D2', 'Bb2', 'A2', 'A2'],
              [{ d: 0.5, v: 0.8 }, { d: 0.5, v: 0.4 }], 0.7) },
          // Triumphant/terrifying lead arpeggio.
          { instr: 'square', vol: 0.22, cutoff: 3600, env: { a: 0.005, r: 0.08 },
            steps: arp(ch, 2, [0, 2, 1, 2, 0, 2, 1, 2], 0.75) },
          // High shimmering arpeggio.
          { instr: 'square', vol: 0.10, cutoff: 5000, env: { a: 0.005, r: 0.06 },
            steps: arp(ch, 2, [2, 1, 0, 1, 2, 1, 0, 1], 0.35) },
          // Full drum kit.
          { instr: 'perc', vol: 0.8,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.75 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.75 }
            ], 1) }
        ]
      };
    },

    /* m) MAP — planning. Calm with underlying tension. ~100 BPM. */
    map: () => {
      const ch = chordsOf([['A3', 'min'], ['D3', 'min'], ['E3', 'min'], ['E3', 'min']]);
      return {
        bpm: 100,
        lanes: [
          { instr: 'sawtooth', vol: 0.08, cutoff: 800, width: 16, env: { a: 0.4, r: 0.6 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.14, cutoff: 900,
            steps: bass(['A1', 'D2', 'E1', 'E1'], [{ d: 4, v: 0.7 }], 0.5) },
          // Gentle arpeggio — calm but moving.
          { instr: 'square', vol: 0.12, cutoff: 2400, env: { a: 0.01, r: 0.2 },
            steps: arp(ch, 4, [0, 1, 2, 1, 0, 2, 1, 2], 0.4) },
          // Underlying tension: pulsing high note.
          { instr: 'square', vol: 0.06, cutoff: 3000, env: { a: 0.005, r: 0.05 },
            steps: mel([
              [null, 1], ['E5', 0.5, 0.4], [null, 0.5], ['E5', 0.5, 0.4], [null, 2],
              [null, 1], ['E5', 0.5, 0.4], [null, 0.5], ['E5', 0.5, 0.4], [null, 2]
            ], 1) }
        ]
      };
    },

    /* n) TREASURE — exciting, rewarding. Sparkle arpeggios. ~150 BPM. */
    treasure: () => {
      const ch = chordsOf([['C4', 'maj'], ['G4', 'maj'], ['C4', 'maj'], ['G4', 'maj']]);
      return {
        bpm: 150,
        lanes: [
          { instr: 'sawtooth', vol: 0.08, cutoff: 2600, width: 10, env: { a: 0.03, r: 0.2 },
            steps: pad(ch, 2, 0.5) },
          { instr: 'triangle', vol: 0.20, cutoff: 1400,
            steps: bass(['C2', 'G2', 'C2', 'G2'], [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.6) },
          // Bright sparkle arpeggio (ascending then descending).
          { instr: 'square', vol: 0.22, cutoff: 5200, env: { a: 0.003, r: 0.06 },
            steps: arp(ch, 2, [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1], 0.6) },
          { instr: 'perc', vol: 0.4,
            steps: perc([
              { n: 'hat', d: 0.5, v: 0.35 }, { n: 'hat', d: 0.5, v: 0.3 },
              { n: 'hat', d: 0.5, v: 0.35 }, { n: 'hat', d: 0.5, v: 0.3 }
            ], 1) }
        ]
      };
    },

    /* o) REST — peaceful, healing. Gentle lullaby. ~80 BPM. */
    rest: () => {
      const ch = chordsOf([['D4', 'maj'], ['A3', 'maj'], ['B3', 'min'], ['G3', 'maj']]);
      return {
        bpm: 80,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 1400, width: 18, env: { a: 0.4, r: 0.7 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.18, cutoff: 1000,
            steps: bass(['D2', 'A1', 'B1', 'G1'], [{ d: 4, v: 0.7 }], 0.5) },
          // Rocking lullaby melody (6/8 feel via 1.5 + 1.5).
          { instr: 'square', vol: 0.16, cutoff: 2200, env: { a: 0.03, r: 0.4 },
            steps: mel([
              ['D5', 1.5, 0.6], ['F#5', 1.5, 0.6], ['A5', 1, 0.5], [null, 0.5],
              ['A5', 1.5, 0.6], ['F#5', 1.5, 0.5], ['D5', 1, 0.5], [null, 0.5],
              ['B4', 1.5, 0.5], ['D5', 1.5, 0.5], ['G5', 2, 0.5]
            ], 1) }
        ]
      };
    },

    /* p) SCHOLAR — mysterious, wise. Music box feel. ~100 BPM. */
    scholar: () => {
      const ch = chordsOf([['A3', 'min'], ['E3', 'min'], ['A3', 'min'], ['E3', 'min']]);
      return {
        bpm: 100,
        lanes: [
          { instr: 'sawtooth', vol: 0.06, cutoff: 900, width: 14, env: { a: 0.5, r: 0.6 },
            steps: pad(ch, 4, 0.4) },
          // Music box: very short decay, high, plucky.
          { instr: 'square', vol: 0.16, cutoff: 5000, env: { a: 0.002, r: 0.12 },
            steps: mel([
              ['A5', 0.5, 0.7], ['C6', 0.5, 0.5], ['E6', 0.5, 0.7], [null, 0.5],
              ['E5', 0.5, 0.6], ['G5', 0.5, 0.5], ['A5', 0.5, 0.7], [null, 0.5],
              ['F5', 0.5, 0.6], ['A5', 0.5, 0.5], ['C6', 0.5, 0.7], [null, 0.5]
            ], 1) },
          { instr: 'triangle', vol: 0.10, cutoff: 1200,
            steps: bass(['A2', 'E2', 'A2', 'E2'], [{ d: 2, v: 0.6 }, { d: 2, v: 0.5 }], 0.5) }
        ]
      };
    },

    /* q) COMBO — short burst of energy. Triumphant hit. (loops) */
    combo: () => {
      const ch = chordsOf([['A3', 'pow'], ['A3', 'pow']]); // power chord stack
      return {
        bpm: 132,
        lanes: [
          // Power-chord stab.
          { instr: 'sawtooth', vol: 0.18, cutoff: 2200, width: 16, env: { a: 0.005, r: 0.3 },
            steps: pad(ch, 2, 0.8) },
          { instr: 'triangle', vol: 0.26, cutoff: 1200,
            steps: bass(['A2', 'A2'], [{ d: 1, v: 0.95 }, { d: 1, v: 0.6 }], 0.7) },
          // Quick ascending victory arpeggio.
          { instr: 'square', vol: 0.24, cutoff: 4200, env: { a: 0.005, r: 0.1 },
            steps: mel([
              ['A4', 0.5, 0.8], ['C#5', 0.5, 0.8], ['E5', 0.5, 0.9], ['A5', 1, 1.0]
            ], 1) },
          { instr: 'perc', vol: 0.7,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 }
            ], 1) }
        ]
      };
    },

    /* r) ULTIMATE_VERSE — epic ~5s burst. Full power activation. */
    ultimate_verse: () => {
      const ch = chordsOf([['A3', 'min'], ['A3', 'min'], ['A3', 'min'], ['A3', 'min']]);
      return {
        bpm: 120,
        lanes: [
          { instr: 'sawtooth', vol: 0.14, cutoff: 2400, width: 24, env: { a: 0.05, r: 0.4 },
            steps: pad(ch, 1, 0.7) },
          { instr: 'triangle', vol: 0.28, cutoff: 1300,
            steps: bass(['A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2'],
              [{ d: 0.5, v: 0.95 }, { d: 0.5, v: 0.5 }], 0.7) },
          // Rising arpeggio climax.
          { instr: 'square', vol: 0.26, cutoff: 5200, env: { a: 0.004, r: 0.08 },
            steps: arp(ch, 1, [0, 1, 2, 0, 1, 2, 1, 2, 0, 1, 2, 3], 0.75) },
          { instr: 'perc', vol: 0.85,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.8 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.85 }
            ], 1) }
        ]
      };
    },

    /* s) INTRO — haunting, atmospheric. First-run intro. ~70 BPM. */
    intro: () => {
      const ch = chordsOf([['A3', 'min'], ['A3', 'min'], ['E3', 'min'], ['E3', 'min']]);
      return {
        bpm: 70,
        lanes: [
          { instr: 'sawtooth', vol: 0.11, cutoff: 600, width: 26, env: { a: 0.8, r: 1.2 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.14, cutoff: 500,
            steps: bass(['A1', 'A1', 'E1', 'E1'], [{ d: 4, v: 0.7 }], 0.5) },
          // Sparse piano-like (triangle) motif.
          { instr: 'triangle', vol: 0.16, cutoff: 1800, env: { a: 0.02, r: 0.6 },
            steps: mel([
              ['A4', 2, 0.6], [null, 2], ['E5', 2, 0.6], [null, 2],
              ['C5', 2, 0.5], [null, 2], ['B4', 2, 0.5]
            ], 1) }
        ]
      };
    },

    /* t) GAME_OVER — final, conclusive. Longer than death. ~68 BPM. */
    game_over: () => {
      const ch = chordsOf([['A3', 'min'], ['F3', 'maj'], ['C3', 'maj'], ['E3', 'maj']]);
      return {
        bpm: 68,
        lanes: [
          { instr: 'sawtooth', vol: 0.13, cutoff: 1000, width: 18, env: { a: 0.3, r: 0.9 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.18, cutoff: 800, env: { a: 0.1, r: 1.0 },
            steps: bass(['A2', 'F2', 'C2', 'E2'], [{ d: 4, v: 0.7 }], 0.6) },
          { instr: 'square', vol: 0.18, cutoff: 1400, env: { a: 0.05, r: 1.0 },
            steps: mel([
              ['A4', 2, 0.7], [null, 2], ['F4', 2, 0.6], [null, 2],
              ['G4', 2, 0.6], [null, 2], ['E5', 4, 0.8]
            ], 1) }
          ]
        }
      },

    /* NEW 1) MAP_VOID — atmospheric, dark, slow. Hollow minor drone. ~72 BPM. */
    map_void: () => {
      const ch = chordsOf([['A2', 'min'], ['A2', 'min'], ['E2', 'min'], ['A2', 'min']]);
      return {
        bpm: 72,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 480, width: 22, env: { a: 0.8, r: 1.4 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.16, cutoff: 500,
            steps: bass(['A1', 'A1', 'E1', 'A1'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'square', vol: 0.10, cutoff: 1300, env: { a: 0.05, r: 0.9 },
            steps: mel([
              [null, 4], ['A4', 2, 0.5], [null, 4], ['E4', 2, 0.4], [null, 4]
            ], 1) }
        ]
      };
    },

    /* NEW 2) CATACOMB — low Genesis-style grinding bass. ~96 BPM. */
    catacomb: () => {
      const ch = chordsOf([['E2', 'min'], ['C2', 'maj'], ['D2', 'min'], ['B1', 'maj']]);
      return {
        bpm: 96,
        lanes: [
          { instr: 'sawtooth', vol: 0.08, cutoff: 600, width: 14, env: { a: 0.5, r: 0.7 },
            steps: pad(ch, 4, 0.45) },
          { instr: 'triangle', vol: 0.30, cutoff: 520,
            steps: bass(['E1', 'C1', 'D1', 'B0'],
              [{ d: 0.5, v: 0.95 }, { d: 0.5, v: 0.7 }], 0.7) },
          { instr: 'square', vol: 0.14, cutoff: 1000, env: { a: 0.02, r: 0.3 },
            steps: mel([
              ['E3', 1, 0.5], [null, 1], ['G3', 1, 0.4], [null, 1],
              ['B3', 1, 0.5], [null, 1], ['E4', 1, 0.5], [null, 1],
              ['E3', 1, 0.5], [null, 1], ['G3', 1, 0.4], [null, 1],
              ['B3', 1, 0.5], [null, 1], ['E4', 1, 0.5], [null, 1]
            ], 1) }
        ]
      };
    },

    /* NEW 3) AMBUSH — fast, panicked. ~165 BPM. */
    ambush: () => {
      const ch = chordsOf([['B2', 'min'], ['G2', 'maj'], ['D3', 'maj'], ['A2', 'min']]);
      return {
        bpm: 165,
        lanes: [
          { instr: 'sawtooth', vol: 0.07, cutoff: 1500, width: 10, env: { a: 0.02, r: 0.15 },
            steps: pad(ch, 4, 0.4) },
          { instr: 'triangle', vol: 0.26, cutoff: 1300,
            steps: bass(['B1', 'G1', 'D2', 'A1'],
              [{ d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.22, cutoff: 4200, env: { a: 0.003, r: 0.05 },
            steps: arp(ch, 4, [0, 2, 1, 2, 0, 2, 1, 2], 0.7) },
          { instr: 'perc', vol: 0.6,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* NEW 4) PRAYER_THEME — gentle hymn-like, maj/min7. ~88 BPM. */
    prayer_theme: () => {
      const ch = chordsOf([['D4', 'maj7'], ['A3', 'min7'], ['B3', 'min7'], ['G3', 'maj7']]);
      return {
        bpm: 88,
        lanes: [
          { instr: 'sawtooth', vol: 0.13, cutoff: 1500, width: 24, env: { a: 0.4, r: 0.7 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.14, cutoff: 1900, env: { a: 0.02, r: 0.4 },
            steps: arp(ch, 4, [0, 1, 2, 1], 0.4) },
          { instr: 'square', vol: 0.14, cutoff: 2400, env: { a: 0.03, r: 0.5 },
            steps: mel([
              ['D5', 2, 0.5], [null, 2], ['F#5', 2, 0.5], [null, 2],
              ['A5', 2, 0.5], [null, 2], ['G5', 2, 0.5]
            ], 1) }
        ]
      };
    },

    /* NEW 5) RELIC_FOUND — bright, short-phrased. ~120 BPM. */
    relic_found: () => {
      const ch = chordsOf([['C4', 'maj'], ['G4', 'maj'], ['A4', 'min'], ['F4', 'maj']]);
      return {
        bpm: 120,
        lanes: [
          { instr: 'sawtooth', vol: 0.08, cutoff: 2200, width: 10, env: { a: 0.04, r: 0.3 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.22, cutoff: 1400,
            steps: bass(['C2', 'G2', 'A2', 'F2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.24, cutoff: 4800, env: { a: 0.004, r: 0.1 },
            steps: mel([
              ['C5', 0.5, 0.9], ['E5', 0.5, 0.8], [null, 0.5], ['G5', 0.5, 0.9],
              ['E5', 0.5, 0.7], [null, 0.5], ['C5', 0.5, 0.8], [null, 0.5],
              ['A5', 0.5, 0.8], ['C6', 0.5, 0.9], [null, 1]
            ], 1) }
        ]
      };
    },

    /* NEW 6) TRIAL — tense minor with a rising figure. ~128 BPM. */
    trial: () => {
      const ch = chordsOf([['F#3', 'min'], ['D3', 'maj'], ['E3', 'maj'], ['C#3', 'maj']]);
      return {
        bpm: 128,
        lanes: [
          { instr: 'sawtooth', vol: 0.09, cutoff: 1100, width: 16, env: { a: 0.1, r: 0.3 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.24, cutoff: 900,
            steps: bass(['F#1', 'D1', 'E1', 'C#1'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.20, cutoff: 3000, env: { a: 0.004, r: 0.1 },
            steps: mel([
              ['F#4', 0.5, 0.6], ['G4', 0.5, 0.6], ['A4', 0.5, 0.7], [null, 0.5],
              ['B4', 0.5, 0.7], ['C#5', 0.5, 0.8], ['D5', 1, 0.7], [null, 2],
              ['F#4', 0.5, 0.6], ['G4', 0.5, 0.6], ['A4', 0.5, 0.7], [null, 0.5]
            ], 1) },
          { instr: 'perc', vol: 0.55,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* NEW 7) DREAD — slow, dissonant. dim/aug, sparse clap/hat. ~76 BPM. */
    dread: () => {
      const ch = chordsOf([['B2', 'dim'], ['B2', 'aug'], ['F2', 'dim'], ['B2', 'dim']]);
      return {
        bpm: 76,
        lanes: [
          { instr: 'sawtooth', vol: 0.11, cutoff: 520, width: 26, env: { a: 0.7, r: 1.2 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.18, cutoff: 420,
            steps: bass(['B1', 'B1', 'F1', 'B1'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'perc', vol: 0.4,
            steps: perc([
              { n: 'hat', d: 2, v: 0.3 }, { n: 'clap', d: 2, v: 0.2 },
              { n: 'hat', d: 2, v: 0.3 }, { n: 'clap', d: 2, v: 0.25 }
            ], 1) }
        ]
      };
    },

    /* NEW 8) SWARM — frantic fast arpeggios. ~170 BPM. */
    swarm: () => {
      const ch = chordsOf([['G3', 'min'], ['G3', 'min'], ['Bb3', 'maj'], ['F3', 'maj']]);
      return {
        bpm: 170,
        lanes: [
          { instr: 'sawtooth', vol: 0.06, cutoff: 2000, width: 8, env: { a: 0.01, r: 0.1 },
            steps: pad(ch, 4, 0.4) },
          { instr: 'triangle', vol: 0.22, cutoff: 1100,
            steps: bass(['G1', 'G1', 'Bb1', 'F1'],
              [{ d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.20, cutoff: 5200, env: { a: 0.002, r: 0.04 },
            steps: arp(ch, 4, [0, 1, 2, 1, 2, 1, 0, 2, 1, 2, 0, 1], 0.7) }
        ]
      };
    },

    /* NEW 9) FORGE — industrial heavy kick pattern. ~110 BPM. */
    forge: () => {
      const ch = chordsOf([['D3', 'min'], ['D3', 'min'], ['A2', 'maj'], ['D3', 'min']]);
      return {
        bpm: 110,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 900, width: 18, env: { a: 0.05, r: 0.3 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.28, cutoff: 700,
            steps: bass(['D1', 'D1', 'A0', 'D1'],
              [{ d: 1, v: 0.95 }, { d: 1, v: 0.6 }], 0.7) },
          { instr: 'square', vol: 0.16, cutoff: 1800, env: { a: 0.01, r: 0.2 },
            steps: arp(ch, 4, [0, 2, 1, 2], 0.5) },
          { instr: 'perc', vol: 0.85,
            steps: perc([
              { n: 'kick', d: 1, v: 0.95 }, { n: 'kick', d: 1, v: 0.6 },
              { n: 'kick', d: 1, v: 0.95 }, { n: 'kick', d: 1, v: 0.6 },
              { n: 'kick', d: 1, v: 0.95 }, { n: 'kick', d: 1, v: 0.6 },
              { n: 'kick', d: 1, v: 0.95 }, { n: 'snare', d: 1, v: 0.8 }
            ], 1) }
        ]
      };
    },

    /* NEW 10) ASCENT — heroic rising motif. ~132 BPM. */
    ascent: () => {
      const ch = chordsOf([['C4', 'maj'], ['A3', 'min'], ['F3', 'maj'], ['G3', 'maj']]);
      return {
        bpm: 132,
        lanes: [
          { instr: 'sawtooth', vol: 0.11, cutoff: 2200, width: 14, env: { a: 0.05, r: 0.3 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.26, cutoff: 1200,
            steps: bass(['C2', 'A1', 'F2', 'G1'],
              [{ d: 0.5, v: 0.9 }, { d: 0.5, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.24, cutoff: 4000, env: { a: 0.004, r: 0.1 },
            steps: mel([
              ['C4', 0.5, 0.7], ['E4', 0.5, 0.7], ['G4', 0.5, 0.8], ['C5', 0.5, 0.9],
              ['A4', 0.5, 0.7], ['C5', 0.5, 0.8], ['E5', 0.5, 0.9], [null, 0.5],
              ['F4', 0.5, 0.7], ['A4', 0.5, 0.8], ['C5', 0.5, 0.9], ['F5', 1, 0.9]
            ], 1) },
          { instr: 'perc', vol: 0.6,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.35 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.35 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* NEW 11) WHISPERS — very sparse, quiet, long rests. ~84 BPM. 2 lanes. */
    whispers: () => {
      const ch = chordsOf([['E3', 'min'], ['E3', 'min'], ['C3', 'maj'], ['E3', 'min']]);
      return {
        bpm: 84,
        lanes: [
          { instr: 'sawtooth', vol: 0.05, cutoff: 700, width: 30, env: { a: 0.9, r: 1.6 },
            steps: pad(ch, 4, 0.35) },
          { instr: 'square', vol: 0.08, cutoff: 1600, env: { a: 0.04, r: 1.0 },
            steps: mel([
              [null, 6], ['E5', 2, 0.4], [null, 6], ['B4', 2, 0.3], [null, 4]
            ], 1) }
        ]
      };
    },

    /* NEW 12) JUDGEMENT — heavy, organ-like. saw pads + low bass. ~100 BPM. */
    judgement: () => {
      const ch = chordsOf([['A3', 'min'], ['F3', 'maj'], ['D3', 'min'], ['E3', 'maj']]);
      return {
        bpm: 100,
        lanes: [
          { instr: 'sawtooth', vol: 0.13, cutoff: 1300, width: 28, env: { a: 0.3, r: 0.5 },
            steps: pad(ch, 4, 0.6) },
          { instr: 'sawtooth', vol: 0.08, cutoff: 700, width: 32, env: { a: 0.4, r: 0.6 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.30, cutoff: 560,
            steps: bass(['A1', 'F1', 'D1', 'E1'], [{ d: 4, v: 0.8 }], 0.6) },
          { instr: 'perc', vol: 0.6,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* NEW 13) PLAGUE — chromatic, unsettling melody. ~138 BPM. */
    plague: () => {
      const ch = chordsOf([['C3', 'min'], ['C3', 'min'], ['Db3', 'maj'], ['C3', 'min']]);
      return {
        bpm: 138,
        lanes: [
          { instr: 'sawtooth', vol: 0.09, cutoff: 900, width: 12, env: { a: 0.1, r: 0.3 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.22, cutoff: 800,
            steps: bass(['C2', 'C2', 'Db2', 'C2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.20, cutoff: 2600, env: { a: 0.004, r: 0.08 },
            steps: mel([
              ['C4', 0.5, 0.6], ['C#4', 0.5, 0.6], ['D4', 0.5, 0.6], ['Eb4', 0.5, 0.6],
              ['E4', 0.5, 0.6], ['F4', 0.5, 0.5], [null, 0.5], ['D4', 0.5, 0.6],
              ['C4', 0.5, 0.6], ['B3', 0.5, 0.5], ['A#3', 0.5, 0.6], [null, 0.5]
            ], 1) }
        ]
      };
    },

    /* NEW 14) PROCESSION — steady march, snare on the beat. ~92 BPM. */
    procession: () => {
      const ch = chordsOf([['F3', 'maj'], ['F3', 'maj'], ['Bb3', 'maj'], ['C3', 'maj']]);
      return {
        bpm: 92,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 1400, width: 18, env: { a: 0.2, r: 0.4 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.26, cutoff: 950,
            steps: bass(['F1', 'F1', 'Bb1', 'C1'],
              [{ d: 2, v: 0.9 }, { d: 2, v: 0.6 }], 0.6) },
          { instr: 'square', vol: 0.16, cutoff: 2800, env: { a: 0.01, r: 0.2 },
            steps: mel([
              ['F4', 1, 0.6], [null, 1], ['A4', 1, 0.5], [null, 1],
              ['Bb4', 1, 0.6], [null, 1], ['C5', 1, 0.6], [null, 1]
            ], 1) },
          { instr: 'perc', vol: 0.7,
            steps: perc([
              { n: 'snare', d: 2, v: 0.8 }, { n: 'hat', d: 2, v: 0.3 },
              { n: 'snare', d: 2, v: 0.8 }, { n: 'hat', d: 2, v: 0.3 }
            ], 1) }
        ]
      };
    },

    /* NEW 15) STILL_WATER — calm, warm, slow. ~78 BPM. */
    still_water: () => {
      const ch = chordsOf([['D4', 'maj'], ['A3', 'maj'], ['B3', 'min'], ['G3', 'maj']]);
      return {
        bpm: 78,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 1300, width: 20, env: { a: 0.5, r: 0.8 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.16, cutoff: 1000,
            steps: bass(['D2', 'A1', 'B1', 'G1'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'square', vol: 0.14, cutoff: 2000, env: { a: 0.04, r: 0.6 },
            steps: mel([
              ['D5', 2, 0.5], [null, 2], ['F#5', 2, 0.5], [null, 2],
              ['A5', 2, 0.5], [null, 2], ['G5', 2, 0.5]
            ], 1) }
        ]
      };
    },

    /* NEW 16) WRATH — aggressive, fast, double-kick. ~158 BPM. */
    wrath: () => {
      const ch = chordsOf([['A3', 'min'], ['A3', 'min'], ['F3', 'maj'], ['E3', 'min']]);
      return {
        bpm: 158,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 1600, width: 10, env: { a: 0.02, r: 0.15 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.28, cutoff: 1100,
            steps: bass(['A1', 'A1', 'F1', 'E1'],
              [{ d: 0.5, v: 0.95 }, { d: 0.5, v: 0.55 }], 0.7) },
          { instr: 'square', vol: 0.24, cutoff: 4400, env: { a: 0.003, r: 0.06 },
            steps: arp(ch, 4, [0, 2, 1, 2, 0, 2, 1, 2], 0.75) },
          { instr: 'perc', vol: 0.8,
            steps: perc([
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'kick', d: 0.25, v: 0.7 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'kick', d: 0.25, v: 0.7 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'snare', d: 0.25, v: 0.8 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'kick', d: 0.25, v: 0.7 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'snare', d: 0.25, v: 0.8 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'kick', d: 0.25, v: 0.7 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'snare', d: 0.25, v: 0.8 },
              { n: 'kick', d: 0.25, v: 0.95 }, { n: 'kick', d: 0.25, v: 0.7 }
            ], 1) }
        ]
      };
    },

    /* NEW 17) LAMENT — mournful descending minor. ~90 BPM. */
    lament: () => {
      const ch = chordsOf([['G3', 'min'], ['G3', 'min'], ['Eb3', 'maj'], ['D3', 'min']]);
      return {
        bpm: 90,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 800, width: 22, env: { a: 0.4, r: 1.0 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.18, cutoff: 700,
            steps: bass(['G1', 'G1', 'Eb1', 'D1'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'square', vol: 0.16, cutoff: 1500, env: { a: 0.04, r: 0.8 },
            steps: mel([
              ['G4', 1, 0.6], ['F4', 1, 0.5], ['E4', 1, 0.5], ['D4', 1, 0.5],
              ['C4', 2, 0.5], [null, 2], ['B3', 1, 0.5], ['A3', 1, 0.5],
              ['G3', 2, 0.5], [null, 4]
            ], 1) }
        ]
      };
    },

    /* NEW 18) COVENANT — warm major progression, hopeful. ~108 BPM. */
    covenant: () => {
      const ch = chordsOf([['C4', 'maj'], ['G4', 'maj'], ['A4', 'min'], ['F4', 'maj']]);
      return {
        bpm: 108,
        lanes: [
          { instr: 'sawtooth', vol: 0.11, cutoff: 1800, width: 20, env: { a: 0.3, r: 0.5 },
            steps: pad(ch, 4, 0.55) },
          { instr: 'triangle', vol: 0.22, cutoff: 1200,
            steps: bass(['C2', 'G2', 'A1', 'F2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.6) },
          { instr: 'square', vol: 0.18, cutoff: 3200, env: { a: 0.01, r: 0.3 },
            steps: arp(ch, 4, [0, 2, 1, 2], 0.45) },
          { instr: 'perc', vol: 0.5,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.6 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'hat', d: 1, v: 0.3 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.6 }
            ], 1) }
        ]
      };
    },

    /* NEW 19) DESCENT — falling melodic motif each phrase. ~96 BPM. */
    descent: () => {
      const ch = chordsOf([['E3', 'min'], ['C3', 'maj'], ['B2', 'min'], ['A2', 'maj']]);
      return {
        bpm: 96,
        lanes: [
          { instr: 'sawtooth', vol: 0.09, cutoff: 700, width: 18, env: { a: 0.4, r: 0.7 },
            steps: pad(ch, 4, 0.5) },
          { instr: 'triangle', vol: 0.18, cutoff: 600,
            steps: bass(['E1', 'C1', 'B0', 'A0'], [{ d: 4, v: 0.7 }], 0.5) },
          { instr: 'square', vol: 0.16, cutoff: 1600, env: { a: 0.03, r: 0.5 },
            steps: mel([
              ['E5', 1.5, 0.6], ['D5', 1, 0.5], ['C5', 1.5, 0.5], [null, 1],
              ['B4', 1.5, 0.5], ['A4', 1, 0.5], ['G4', 1.5, 0.5], [null, 1],
              ['F4', 1.5, 0.5], ['E4', 1, 0.5], ['D4', 1.5, 0.5], [null, 1]
            ], 1) }
        ]
      };
    },

    /* NEW 20) REVELATION — apocalyptic grand build, boss-tier. ~118 BPM. 5 lanes. */
    revelation: () => {
      const ch = chordsOf([
        ['D3', 'min'], ['Bb3', 'maj'], ['F3', 'maj'], ['C3', 'maj'],
        ['D3', 'min'], ['Bb3', 'maj'], ['A3', 'maj'], ['A3', 'maj']
      ]);
      return {
        bpm: 118,
        lanes: [
          { instr: 'sawtooth', vol: 0.12, cutoff: 1800, width: 28, env: { a: 0.2, r: 0.3 },
            steps: pad(ch, 2, 0.6) },
          { instr: 'sawtooth', vol: 0.07, cutoff: 900, width: 32, env: { a: 0.3, r: 0.4 },
            steps: pad(ch, 2, 0.5) },
          { instr: 'triangle', vol: 0.22, cutoff: 1200,
            steps: bass(['D2', 'Bb1', 'F2', 'C2', 'D2', 'Bb1', 'A1', 'A1'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.7) },
          { instr: 'square', vol: 0.22, cutoff: 3600, env: { a: 0.005, r: 0.08 },
            steps: arp(ch, 2, [0, 2, 1, 2, 0, 2, 1, 2], 0.75) },
          { instr: 'perc', vol: 0.8,
            steps: perc([
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.75 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'hat', d: 0.5, v: 0.4 },
              { n: 'kick', d: 0.5, v: 0.9 }, { n: 'snare', d: 0.5, v: 0.75 }
            ], 1) }
        ]
      };
    },

    /* NEW 21) SABBATH — gentle 6/8 feel, soft. ~86 BPM. */
    sabbath: () => {
      const ch = chordsOf([['G3', 'maj'], ['G3', 'maj'], ['D3', 'maj'], ['C3', 'maj']]);
      return {
        bpm: 86,
        lanes: [
          { instr: 'sawtooth', vol: 0.09, cutoff: 1200, width: 24, env: { a: 0.4, r: 0.7 },
            steps: pad(ch, 4, 0.45) },
          { instr: 'triangle', vol: 0.14, cutoff: 900,
            steps: bass(['G1', 'G1', 'D1', 'C1'], [{ d: 3, v: 0.7 }, { d: 1, v: 0.4 }], 0.5) },
          { instr: 'square', vol: 0.12, cutoff: 2200, env: { a: 0.03, r: 0.5 },
            steps: mel([
              ['G4', 1.5, 0.5], ['B4', 1.5, 0.5], ['D5', 1, 0.5], [null, 0.5],
              ['D5', 1.5, 0.5], ['B4', 1.5, 0.5], ['G4', 1, 0.5], [null, 0.5],
              ['A4', 1.5, 0.5], ['C5', 1.5, 0.5], ['G4', 1, 0.5], [null, 0.5]
            ], 1) }
        ]
      };
    },

    /* NEW 22) VICTORY_REPRISE — triumphant but short, major fanfare. ~134 BPM. */
    victory_reprise: () => {
      const ch = chordsOf([['C4', 'maj'], ['F4', 'maj'], ['G4', 'maj'], ['C4', 'maj']]);
      return {
        bpm: 134,
        lanes: [
          { instr: 'sawtooth', vol: 0.10, cutoff: 2200, width: 12, env: { a: 0.05, r: 0.3 },
            steps: pad(ch, 2, 0.55) },
          { instr: 'triangle', vol: 0.26, cutoff: 1300,
            steps: bass(['C2', 'F2', 'G2', 'C2'],
              [{ d: 1, v: 0.9 }, { d: 1, v: 0.5 }], 0.7) },
          { instr: 'square', vol: 0.28, cutoff: 4200, env: { a: 0.004, r: 0.1 },
            steps: mel([
              ['C5', 0.5, 0.9], ['E5', 0.5, 0.9], ['G5', 0.5, 0.9], ['C6', 1, 1.0],
              ['F5', 0.5, 0.8], ['A5', 0.5, 0.8], ['G5', 0.5, 0.8], ['C6', 1, 1.0]
            ], 1) },
          { instr: 'perc', vol: 0.7,
            steps: perc([
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 },
              { n: 'kick', d: 1, v: 0.9 }, { n: 'snare', d: 1, v: 0.7 }
            ], 1) }
        ]
      };
    }
  };

  /* --------------------------- Voice rendering -------------------------- */
  function makeNoise() {
    const len = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Normalize a step note into a frequency (or array of frequencies).
  function toFreq(n) {
    if (n == null) return null;
    if (Array.isArray(n)) return n.map(toFreq);
    return (typeof n === 'number') ? n : ntof(n);
  }

  function playNote(lane, step, t, dur) {
    const v = (step.v == null ? 1 : step.v) * (lane.vol == null ? 1 : lane.vol);
    if (lane.instr === 'perc') { playPerc(step.n, t, dur, v); return; }

    const notes = toFreq(step.n);
    if (notes == null) return;
    const list = Array.isArray(notes) ? notes : [notes];

    const a = (lane.env && lane.env.a != null) ? lane.env.a : 0.005;
    const r = (lane.env && lane.env.r != null) ? lane.env.r : 0.08;

    list.forEach(f => {
      // ponytail: some lanes ship without a valid `instr`; assigning undefined to
      // oscillator.type throws, which killed the audio scheduler. Default instead.
      const instr = (typeof lane.instr === 'string' && lane.instr !== 'perc') ? lane.instr : 'square';
      const o1 = ctx.createOscillator();
      o1.type = instr;
      o1.frequency.value = f;

      const g = ctx.createGain();
      const peak = Math.max(0.0001, v);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      const relStart = Math.max(t + a, t + dur - r);
      g.gain.setValueAtTime(peak, relStart);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      o1.connect(g);
      g.connect(lane.filter);

      const nodes = [o1];
      if (lane.width) {
        const o2 = ctx.createOscillator();
        o2.type = instr;
        o2.frequency.value = f;
        o2.detune.value = lane.width;
        o2.connect(g);
        nodes.push(o2);
      }

      nodes.forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
    });
  }

  function playPerc(type, t, dur, v) {
    if (type === 'kick') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(Math.max(0.001, v), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(masterGain);
      o.start(t); o.stop(t + 0.22);
      return;
    }
    // Noise-based percussion.
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    if (type === 'hat') {
      f.type = 'highpass'; f.frequency.value = 7000;
      g.gain.setValueAtTime(Math.max(0.001, v * 0.5), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.start(t); src.stop(t + 0.06);
    } else if (type === 'snare' || type === 'clap') {
      f.type = 'highpass'; f.frequency.value = 1200;
      g.gain.setValueAtTime(Math.max(0.001, v * 0.7), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      src.start(t); src.stop(t + 0.15);
    } else { // generic tom / low noise
      f.type = 'bandpass'; f.frequency.value = 350;
      g.gain.setValueAtTime(Math.max(0.001, v * 0.6), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.start(t); src.stop(t + 0.14);
    }
    src.connect(f); f.connect(g); g.connect(masterGain);
  }

  /* ----------------------------- Scheduler ------------------------------ */
  function scheduler() {
    if (!currentTrack) return;
    const now = ctx.currentTime;
    const ahead = now + LOOKAHEAD;
    currentTrack.lanes.forEach(lane => {
      let guard = 0;
      while (lane.next < ahead && guard++ < 512) {
        const step = lane.def.steps[lane.idx];
        const dur = step.d * currentTrack.beatDur;
        if (step.n !== null) playNote(lane, step, lane.next, dur);
        lane.next += dur;
        lane.idx = (lane.idx + 1) % lane.def.steps.length;
      }
    });
  }

  /* ------------------------------ Public API ---------------------------- */
  function init() {
    if (ctx) return;
    const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
               (typeof AudioContext !== 'undefined' ? AudioContext : null);
    if (!AC) { console.warn('MusicEngine: Web Audio API unavailable.'); return; }
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    compressor = ctx.createDynamicsCompressor();
    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    noiseBuffer = makeNoise();
    // ponytail: resume once, on the first user gesture. Calling resume() every
    // frame before a gesture is allowed spams a console error and burns CPU.
    if (ctx.state === 'suspended' && ctx.resume) {
      const kick = () => { if (ctx.state === 'suspended') ctx.resume(); };
      ctx.resume().then(() => {}, () => {});
      document.addEventListener('pointerdown', kick, { once: true });
      document.addEventListener('touchstart', kick, { once: true });
      document.addEventListener('keydown', kick, { once: true });
    }
  }

  function startTrack(name) {
    if (!ctx) { console.warn('MusicEngine: call init() first (after a user gesture).'); return; }
    const builder = TRACKS[name];
    if (!builder) { console.warn('MusicEngine: unknown track "' + name + '".'); return; }

    // Reset any current playback.
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    currentTrack = null;

    const def = builder();
    const startT = ctx.currentTime + 0.08;
    const lanes = def.lanes.map(ld => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = (ld.cutoff != null) ? ld.cutoff : 3000;
      filter.Q.value = (ld.q != null) ? ld.q : 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      filter.connect(gain);
      gain.connect(masterGain);
      return { def: ld, filter, gain, idx: 0, next: startT };
    });

    currentTrack = { name, bpm: def.bpm, beatDur: 60 / def.bpm, lanes };
    schedulerTimer = setInterval(scheduler, TICK);

    // Fade in.
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.3);
  }

  function stop() {
    if (!ctx || !currentTrack) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), t);
    masterGain.gain.linearRampToValueAtTime(0.0001, t + 0.4);

    const lanes = currentTrack.lanes;
    currentTrack = null;
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    setTimeout(() => {
      lanes.forEach(l => { try { l.filter.disconnect(); l.gain.disconnect(); } catch (e) {} });
    }, 600);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain && currentTrack) {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.linearRampToValueAtTime(volume, t + 0.1);
    }
  }

  function isPlaying() {
    return !!currentTrack && !!schedulerTimer;
  }

  function listTracks() {
    return Object.keys(TRACKS);
  }

  return {
    init, playTrack: startTrack, stop, setVolume, isPlaying, listTracks,
    _tracks: TRACKS
  };
})();

// Browser global export.
if (typeof window !== 'undefined') window.MusicEngine = MusicEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = MusicEngine;
