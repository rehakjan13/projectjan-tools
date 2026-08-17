/*
 * interpret.js — turns Lab deltas into a plain-language description.
 * Pure functions: no DOM. Depends on DeltaE.basicDeltas (deltae.js).
 * Never recommends a dosage — direction only (spec rule: no receptura).
 */
(function (global) {
  'use strict';

  var HUE_SECTORS = [
    { max: 22.5, key: 'hueRed' },
    { max: 67.5, key: 'hueOrange' },
    { max: 112.5, key: 'hueYellow' },
    { max: 157.5, key: 'hueYellowGreen' },
    { max: 202.5, key: 'hueGreen' },
    { max: 247.5, key: 'hueCyan' },
    { max: 292.5, key: 'hueBlue' },
    { max: 337.5, key: 'hueViolet' },
    { max: 360.01, key: 'hueRed' }
  ];

  function hueSectorKey(angleDeg) {
    var a = ((angleDeg % 360) + 360) % 360;
    for (var i = 0; i < HUE_SECTORS.length; i++) {
      if (a < HUE_SECTORS[i].max) return HUE_SECTORS[i].key;
    }
    return 'hueRed';
  }

  // Direction of the shift in the a*b* plane (master -> sample), named via its hue sector.
  function shiftDirectionKey(da, db) {
    if (da === 0 && db === 0) return null;
    var angle = Math.atan2(db, da) * (180 / Math.PI);
    return hueSectorKey(angle);
  }

  function oppositeAngle(key) {
    var idx = -1;
    for (var i = 0; i < 8; i++) { if (HUE_SECTORS[i].key === key) { idx = i; break; } }
    return HUE_SECTORS[(idx + 4) % 8].key;
  }

  // master, sample: {L,a,b}. deviation: {L, ab} — typical instrument repeatability,
  // read straight off a spectro's spec sheet (e.g. ±0.3 on L*/a*/b*). Gating happens
  // on the raw Δa*/Δb* the instrument actually reports, not the derived ΔC*/ΔH* —
  // a component can't exceed the Δa*/Δb* vector it's rotated from, so this is the
  // stricter, more meaningful check. t: i18n lookup fn.
  function interpret(master, sample, deviation, t) {
    t = t || function (k) { return k; };
    deviation = deviation || {};
    var devL = deviation.L == null ? 0.3 : deviation.L;
    var devAB = deviation.ab == null ? 0.3 : deviation.ab;

    var d = global.DeltaE.basicDeltas(master, sample);
    var hasAbShift = Math.abs(d.da) > devAB || Math.abs(d.db) > devAB;

    var components = [];
    if (Math.abs(d.dL) > devL) {
      components.push({ key: 'L', mag: Math.abs(d.dL), sign: d.dL >= 0, pos: 'lighter', neg: 'darker' });
    }
    if (hasAbShift) {
      components.push({ key: 'C', mag: Math.abs(d.dC), sign: d.dC >= 0, pos: 'moreSaturated', neg: 'lessSaturated' });
      components.push({ key: 'H', mag: Math.abs(d.dH), sign: d.dH >= 0 });
    }
    components.sort(function (a, b) { return b.mag - a.mag; });

    if (components.length === 0) {
      return { sentences: [t('withinRepeatability')], allBelowFloor: true, deltas: d };
    }

    var forwardClauses = [];
    var reverseClauses = [];
    var hueKey = shiftDirectionKey(d.da, d.db);

    components.forEach(function (c) {
      if (c.key === 'H') {
        if (hueKey) {
          forwardClauses.push(t('hueToward') + ' ' + t(hueKey));
          reverseClauses.push(t('hueToward') + ' ' + t(oppositeAngle(hueKey)));
        }
      } else {
        forwardClauses.push(t(c.sign ? c.pos : c.neg));
        reverseClauses.push(t(c.sign ? c.neg : c.pos));
      }
    });

    var s1 = t('sampleIs') + ' ' + forwardClauses.join(', ') + '.';
    var s2 = t('correctionNeeded') + ' ' + reverseClauses.join(', ') + '.';

    return { sentences: [s1, s2], allBelowFloor: false, deltas: d };
  }

  global.Interpret = {
    interpret: interpret,
    hueSectorKey: hueSectorKey,
    shiftDirectionKey: shiftDirectionKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
