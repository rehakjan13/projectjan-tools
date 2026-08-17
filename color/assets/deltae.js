/*
 * deltae.js — pure ΔE color-difference formulas, no DOM.
 * Input: CIELAB {L,a,b}. Reference = master, sample = sample.
 * Works as a plain <script> (exposes window.DeltaE) and as a CommonJS module.
 */
(function (global) {
  'use strict';

  var CS = (typeof module !== 'undefined' && module.exports)
    ? require('./colorspace.js')
    : global.ColorSpace;

  var sind = CS.sind, cosd = CS.cosd, atan2d = CS.atan2d;

  // Normalize a hue difference (deg) into [-180, 180]
  function normHueDiff(deg) {
    var d = deg % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // Basic LCh deltas between master (1) and sample (2), per spec 3.1.
  // Signed ΔH follows the direction of the hue shift (h2 - h1, normalized).
  function basicDeltas(master, sample) {
    var dL = sample.L - master.L;
    var da = sample.a - master.a;
    var db = sample.b - master.b;

    var C1 = Math.sqrt(master.a * master.a + master.b * master.b);
    var C2 = Math.sqrt(sample.a * sample.a + sample.b * sample.b);
    var h1 = (master.a === 0 && master.b === 0) ? 0 : atan2d(master.b, master.a);
    var h2 = (sample.a === 0 && sample.b === 0) ? 0 : atan2d(sample.b, sample.a);

    var dC = C2 - C1;
    var underRoot = da * da + db * db - dC * dC;
    var dHmag = Math.sqrt(Math.max(0, underRoot));
    var dhSigned = normHueDiff(h2 - h1);
    var dH = dhSigned < 0 ? -dHmag : dHmag;

    return { dL: dL, da: da, db: db, dC: dC, dH: dH, C1: C1, C2: C2, h1: h1, h2: h2 };
  }

  // 3.2 CIE76
  function cie76(master, sample) {
    var dL = sample.L - master.L;
    var da = sample.a - master.a;
    var db = sample.b - master.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  // 3.3 CIE94. presets: 'graphicArts' (default) or 'textiles'. kL/kC/kH default 1.
  var CIE94_PRESETS = {
    graphicArts: { kL: 1, K1: 0.045, K2: 0.015 },
    textiles: { kL: 2, K1: 0.048, K2: 0.014 }
  };

  function cie94(master, sample, opts) {
    opts = opts || {};
    var preset = CIE94_PRESETS[opts.preset || 'graphicArts'];
    var kL = opts.kL != null ? opts.kL : preset.kL;
    var kC = opts.kC != null ? opts.kC : 1;
    var kH = opts.kH != null ? opts.kH : 1;
    var K1 = opts.K1 != null ? opts.K1 : preset.K1;
    var K2 = opts.K2 != null ? opts.K2 : preset.K2;

    var d = basicDeltas(master, sample);
    var C1 = d.C1;

    var SL = 1;
    var SC = 1 + K1 * C1;
    var SH = 1 + K2 * C1;

    var termL = d.dL / (kL * SL);
    var termC = d.dC / (kC * SC);
    var termH = d.dH / (kH * SH);

    return Math.sqrt(termL * termL + termC * termC + termH * termH);
  }

  // 3.4 CMC l:c. Default l:c = 2:1 (acceptability); 1:1 = perceptibility.
  function cmc(master, sample, opts) {
    opts = opts || {};
    var l = opts.l != null ? opts.l : 2;
    var c = opts.c != null ? opts.c : 1;

    var d = basicDeltas(master, sample);
    var L1 = master.L, C1 = d.C1, h1 = d.h1;

    var SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
    var SC = (0.0638 * C1) / (1 + 0.0131 * C1) + 0.638;

    var T;
    if (h1 < 164 || h1 > 345) {
      T = 0.36 + Math.abs(0.4 * cosd(h1 + 35));
    } else {
      T = 0.56 + Math.abs(0.2 * cosd(h1 + 168));
    }

    var C1_4 = Math.pow(C1, 4);
    var F = Math.sqrt(C1_4 / (C1_4 + 1900));
    var SH = SC * (F * T + 1 - F);

    var termL = d.dL / (l * SL);
    var termC = d.dC / (c * SC);
    var termH = d.dH / SH;

    return Math.sqrt(termL * termL + termC * termC + termH * termH);
  }

  // 3.5 CIEDE2000. kL=kC=kH=1 by default.
  function ciede2000(master, sample, opts) {
    opts = opts || {};
    var kL = opts.kL != null ? opts.kL : 1;
    var kC = opts.kC != null ? opts.kC : 1;
    var kH = opts.kH != null ? opts.kH : 1;

    var L1 = master.L, a1 = master.a, b1 = master.b;
    var L2 = sample.L, a2 = sample.a, b2 = sample.b;

    var Lbar = (L1 + L2) / 2;
    var C1 = Math.sqrt(a1 * a1 + b1 * b1);
    var C2 = Math.sqrt(a2 * a2 + b2 * b2);
    var Cbar = (C1 + C2) / 2;

    var Cbar7 = Math.pow(Cbar, 7);
    var G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

    var a1p = a1 * (1 + G);
    var a2p = a2 * (1 + G);

    var C1p = Math.sqrt(a1p * a1p + b1 * b1);
    var C2p = Math.sqrt(a2p * a2p + b2 * b2);
    var Cbarp = (C1p + C2p) / 2;

    var dLp = L2 - L1;
    var dCp = C2p - C1p;

    var h1p = (a1p === 0 && b1 === 0) ? 0 : atan2d(b1, a1p);
    var h2p = (a2p === 0 && b2 === 0) ? 0 : atan2d(b2, a2p);

    var dhp;
    if (C1p * C2p === 0) {
      dhp = 0;
    } else if (Math.abs(h2p - h1p) <= 180) {
      dhp = h2p - h1p;
    } else if (h2p - h1p > 180) {
      dhp = h2p - h1p - 360;
    } else {
      dhp = h2p - h1p + 360;
    }
    var dHp = 2 * Math.sqrt(C1p * C2p) * sind(dhp / 2);

    var Hbarp;
    if (C1p * C2p === 0) {
      Hbarp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
      Hbarp = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
      Hbarp = (h1p + h2p + 360) / 2;
    } else {
      Hbarp = (h1p + h2p - 360) / 2;
    }

    var T = 1
      - 0.17 * cosd(Hbarp - 30)
      + 0.24 * cosd(2 * Hbarp)
      + 0.32 * cosd(3 * Hbarp + 6)
      - 0.20 * cosd(4 * Hbarp - 63);

    var SL = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2));
    var SC = 1 + 0.045 * Cbarp;
    var SH = 1 + 0.015 * Cbarp * T;

    var Cbarp7 = Math.pow(Cbarp, 7);
    var RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
    var dTheta = 60 * Math.exp(-Math.pow((Hbarp - 275) / 25, 2));
    var RT = -RC * sind(dTheta);

    var termL = dLp / (kL * SL);
    var termC = dCp / (kC * SC);
    var termH = dHp / (kH * SH);

    return Math.sqrt(termL * termL + termC * termC + termH * termH + RT * termC * termH);
  }

  var DeltaE = {
    basicDeltas: basicDeltas,
    cie76: cie76,
    cie94: cie94,
    cmc: cmc,
    ciede2000: ciede2000,
    CIE94_PRESETS: CIE94_PRESETS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaE;
  } else {
    global.DeltaE = DeltaE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
