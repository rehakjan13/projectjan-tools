/*
 * plot.js — hand-rolled SVG rendering for the a*b* plane and L* band.
 * No chart library (ellipses with rotated axes don't map onto Chart.js's
 * scatter primitives — see CLAUDE.md). Depends on ColorSpace for sind/cosd.
 */
(function (global) {
  'use strict';

  var CS = global.ColorSpace;
  var DE = global.DeltaE;
  var sind = CS.sind, cosd = CS.cosd, atan2d = CS.atan2d;

  // ---- Tolerance ellipse / band radii per formula, evaluated at the master only. ----
  // (Exact formulas use master+sample averages; anchoring on the master alone is the
  // standard simplification for drawing a fixed "you are within tolerance" zone — the
  // same approximation CIE94 makes explicit by using C1, not a mean chroma.)
  function toleranceGeometry(formulaKey, master, tol, opts) {
    opts = opts || {};
    var a1 = master.a, b1 = master.b, L1 = master.L;
    var C1 = Math.sqrt(a1 * a1 + b1 * b1);
    var h1 = (a1 === 0 && b1 === 0) ? 0 : atan2d(b1, a1);

    if (formulaKey === 'cie76') {
      return { radiusC: tol, radiusH: tol, radiusL: tol, angleDeg: h1 };
    }

    if (formulaKey === 'cie94') {
      var preset = DE.CIE94_PRESETS[opts.preset || 'graphicArts'];
      var kL = opts.kL != null ? opts.kL : preset.kL;
      var kC = opts.kC != null ? opts.kC : 1;
      var kH = opts.kH != null ? opts.kH : 1;
      var K1 = opts.K1 != null ? opts.K1 : preset.K1;
      var K2 = opts.K2 != null ? opts.K2 : preset.K2;
      var SC94 = 1 + K1 * C1;
      var SH94 = 1 + K2 * C1;
      return { radiusC: tol * kC * SC94, radiusH: tol * kH * SH94, radiusL: tol * kL, angleDeg: h1 };
    }

    if (formulaKey === 'cmc') {
      var l = opts.l != null ? opts.l : 2;
      var c = opts.c != null ? opts.c : 1;
      var SL = L1 < 16 ? 0.511 : (0.040975 * L1) / (1 + 0.01765 * L1);
      var SCc = (0.0638 * C1) / (1 + 0.0131 * C1) + 0.638;
      var T;
      if (h1 < 164 || h1 > 345) T = 0.36 + Math.abs(0.4 * cosd(h1 + 35));
      else T = 0.56 + Math.abs(0.2 * cosd(h1 + 168));
      var C1_4 = Math.pow(C1, 4);
      var F = Math.sqrt(C1_4 / (C1_4 + 1900));
      var SHc = SCc * (F * T + 1 - F);
      return { radiusC: tol * c * SCc, radiusH: tol * SHc, radiusL: tol * l * SL, angleDeg: h1 };
    }

    // ciede2000 — anchored on master only (G, C', h' computed from master alone).
    var C1_7 = Math.pow(C1, 7);
    var G = 0.5 * (1 - Math.sqrt(C1_7 / (C1_7 + Math.pow(25, 7))));
    var a1p = a1 * (1 + G);
    var C1p = Math.sqrt(a1p * a1p + b1 * b1);
    var h1p = (a1p === 0 && b1 === 0) ? 0 : atan2d(b1, a1p);
    var T00 = 1 - 0.17 * cosd(h1p - 30) + 0.24 * cosd(2 * h1p) + 0.32 * cosd(3 * h1p + 6) - 0.20 * cosd(4 * h1p - 63);
    var SL00 = 1 + (0.015 * Math.pow(L1 - 50, 2)) / Math.sqrt(20 + Math.pow(L1 - 50, 2));
    var SC00 = 1 + 0.045 * C1p;
    var SH00 = 1 + 0.015 * C1p * T00;
    var kL0 = opts.kL != null ? opts.kL : 1, kC0 = opts.kC != null ? opts.kC : 1, kH0 = opts.kH != null ? opts.kH : 1;
    return { radiusC: tol * kC0 * SC00, radiusH: tol * kH0 * SH00, radiusL: tol * kL0 * SL00, angleDeg: h1p };
  }

  function svgEl(tag, attrs, children) {
    var s = '<' + tag;
    for (var k in attrs) s += ' ' + k + '="' + attrs[k] + '"';
    s += children ? '>' + children + '</' + tag + '>' : '/>';
    return s;
  }

  function arrowMarkerDefs() {
    return '<defs>' +
      '<marker id="arrow-o" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--o)"/></marker>' +
      '<marker id="arrow-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--g)"/></marker>' +
      '</defs>';
  }

  // opts: {master, sample, formulaKey, tolerance, formulaOpts, t}
  function renderABPlane(container, opts) {
    var master = opts.master, sample = opts.sample;
    var t = opts.t || function (k) { return k; };
    var da = sample.a - master.a, db = sample.b - master.b;

    var geo = toleranceGeometry(opts.formulaKey, master, opts.tolerance, opts.formulaOpts);

    var size = 300, cx = size / 2, cy = size / 2;
    var margin = 34;
    var half = cx - margin;
    var range = Math.max(2, Math.ceil(Math.max(Math.abs(da), Math.abs(db), geo.radiusC, geo.radiusH) * 1.3));
    var scale = half / range;

    function toXY(a, b) { return [cx + a * scale, cy - b * scale]; }

    var mXY = toXY(0, 0);
    var sXY = toXY(da, db);
    var targetXY = toXY(-da, -db);

    var markup = arrowMarkerDefs();

    // axes
    markup += svgEl('line', { x1: margin, y1: cy, x2: size - margin, y2: cy, stroke: 'var(--border)', 'stroke-width': 1 });
    markup += svgEl('line', { x1: cx, y1: margin, x2: cx, y2: size - margin, stroke: 'var(--border)', 'stroke-width': 1 });

    // tolerance ellipse
    markup += svgEl('ellipse', {
      cx: mXY[0], cy: mXY[1], rx: Math.max(2, geo.radiusC * scale), ry: Math.max(2, geo.radiusH * scale),
      transform: 'rotate(' + (-geo.angleDeg) + ' ' + mXY[0] + ' ' + mXY[1] + ')',
      fill: 'var(--gl)', 'fill-opacity': '0.55', stroke: 'var(--g)', 'stroke-width': 1.25, 'stroke-dasharray': '4 3'
    });

    // arrow: master -> sample (where we are)
    if (da !== 0 || db !== 0) {
      markup += svgEl('line', {
        x1: mXY[0], y1: mXY[1], x2: sXY[0], y2: sXY[1],
        stroke: 'var(--o)', 'stroke-width': 2.25, 'marker-end': 'url(#arrow-o)'
      });
      // arrow: sample -> mirrored target (correction direction)
      markup += svgEl('line', {
        x1: sXY[0], y1: sXY[1], x2: targetXY[0], y2: targetXY[1],
        stroke: 'var(--g)', 'stroke-width': 2.25, 'stroke-dasharray': '1 5', 'stroke-linecap': 'round',
        'marker-end': 'url(#arrow-g)'
      });
    }

    // master + sample points
    markup += svgEl('circle', { cx: mXY[0], cy: mXY[1], r: 5, fill: 'var(--p)', stroke: '#fff', 'stroke-width': 1.5 });
    markup += svgEl('circle', { cx: sXY[0], cy: sXY[1], r: 5, fill: 'var(--o)', stroke: '#fff', 'stroke-width': 1.5 });

    // axis labels
    markup += svgEl('text', { x: size - margin + 4, y: cy + 4, 'font-size': 9, fill: '#B91C1C', 'font-family': "'JetBrains Mono',monospace" }, '+a red');
    markup += svgEl('text', { x: margin - 4, y: cy + 4, 'text-anchor': 'end', 'font-size': 9, fill: 'var(--g)', 'font-family': "'JetBrains Mono',monospace" }, '&#8722;a green');
    markup += svgEl('text', { x: cx, y: margin - 10, 'text-anchor': 'middle', 'font-size': 9, fill: '#A16207', 'font-family': "'JetBrains Mono',monospace" }, '+b yellow');
    markup += svgEl('text', { x: cx, y: size - margin + 16, 'text-anchor': 'middle', 'font-size': 9, fill: '#2563EB', 'font-family': "'JetBrains Mono',monospace" }, '&#8722;b blue');

    container.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    container.innerHTML = markup;
  }

  // opts: {master, sample, formulaKey, tolerance, formulaOpts}
  function renderLBand(container, opts) {
    var master = opts.master, sample = opts.sample;
    var dL = sample.L - master.L;
    var geo = toleranceGeometry(opts.formulaKey, master, opts.tolerance, opts.formulaOpts);

    var w = 90, h = 300, cx = w / 2, cy = h / 2, margin = 24;
    var halfH = cy - margin;
    var range = Math.max(2, Math.ceil(Math.max(Math.abs(dL), geo.radiusL) * 1.3));
    var scale = halfH / range;

    function toY(l) { return cy - l * scale; }

    var mY = toY(0), sY = toY(dL);
    var bandTop = toY(geo.radiusL), bandBottom = toY(-geo.radiusL);

    var markup = '';
    markup += svgEl('rect', { x: margin, y: bandTop, width: w - margin * 2, height: bandBottom - bandTop, fill: 'var(--gl)', 'fill-opacity': 0.6, stroke: 'var(--g)', 'stroke-width': 1, 'stroke-dasharray': '4 3' });
    markup += svgEl('line', { x1: margin, y1: mY, x2: w - margin, y2: mY, stroke: 'var(--p)', 'stroke-width': 2.5 });
    markup += svgEl('line', { x1: margin, y1: sY, x2: w - margin, y2: sY, stroke: 'var(--o)', 'stroke-width': 2.5 });
    markup += svgEl('circle', { cx: cx, cy: sY, r: 4, fill: 'var(--o)', stroke: '#fff', 'stroke-width': 1.25 });
    markup += svgEl('text', { x: cx, y: 14, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--hint)', 'font-family': "'JetBrains Mono',monospace" }, 'L*');

    container.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    container.innerHTML = markup;
  }

  global.Plot = { renderABPlane: renderABPlane, renderLBand: renderLBand, toleranceGeometry: toleranceGeometry };
})(typeof window !== 'undefined' ? window : globalThis);
