/*
 * glossary.js — colorimetry term data + a small substring/token search.
 * Pure data + pure functions, no DOM. Shared by the landing-page quick
 * search and the full /color/glossary/ page.
 */
(function (global) {
  'use strict';

  var TERMS = [
    { term: 'Delta E (ΔE)', aliases: ['delta e', 'de', 'dE', 'color difference', 'colour difference'], topic: 'formulas',
      definition: 'A single number describing how different two colours are. Bigger = more different. It\'s built by combining ΔL*, Δa* and Δb* (or ΔL*, ΔC*, ΔH*) into one value — exactly how depends on the formula: CIE76 just takes the straight-line distance between them, while CIE94, CMC l:c and CIEDE2000 each weight lightness/chroma/hue differently before combining them, which is why the same pair of colours gives four different ΔE numbers.' },
    { term: 'Δ (Delta)', aliases: ['delta', 'difference', 'deviation'], topic: 'reading',
      definition: 'The Greek letter Δ just means "difference": sample value minus master value. Δ on its own isn\'t a number you read off an instrument — it\'s the prefix on ΔL*, Δa*, Δb*, ΔC*, ΔH* and ΔE, each of which is a specific difference.' },
    { term: 'ΔL*', aliases: ['delta l', 'dl'], topic: 'reading',
      definition: 'Difference in lightness: sample L* − master L*. Positive = sample is lighter than the master. Negative = darker.' },
    { term: 'Δa*', aliases: ['delta a', 'da'], topic: 'reading',
      definition: 'Difference in a*: sample a* − master a*. Positive = shifted toward red. Negative = shifted toward green.' },
    { term: 'Δb*', aliases: ['delta b', 'db'], topic: 'reading',
      definition: 'Difference in b*: sample b* − master b*. Positive = shifted toward yellow. Negative = shifted toward blue.' },
    { term: 'ΔC*', aliases: ['delta c', 'dc'], topic: 'reading',
      definition: 'Difference in chroma: sample C* − master C*. Positive = sample is more saturated/vivid. Negative = less saturated, closer to grey.' },
    { term: 'ΔH*', aliases: ['delta h', 'dh'], topic: 'reading',
      definition: 'Difference in hue, at constant lightness and chroma — captures a hue shift that Δa*/Δb* alone don\'t describe cleanly. Its sign follows the direction of the hue shift around the colour wheel.' },
    { term: 'CIE76 (ΔE*ab)', aliases: ['cie 76', 'de76', 'deltae76', 'e76'], topic: 'formulas',
      definition: 'The oldest, simplest Delta E formula — a straight-line distance in Lab space: √(ΔL² + Δa² + Δb²). Tends to overstate differences in saturated colours.' },
    { term: 'CIE94', aliases: ['de94', 'deltae94', 'e94'], topic: 'formulas',
      definition: 'A 1994 refinement of CIE76 that stretches the tolerance based on chroma, correcting some of CIE76\'s bias in saturated colours.' },
    { term: 'CMC l:c', aliases: ['cmc', 'cmc 2:1', 'cmc 1:1'], topic: 'formulas',
      definition: 'A formula (from the textile industry) that lets you weight lightness vs. chroma sensitivity independently. 2:1 ("acceptability") is the common industrial default; 1:1 ("perceptibility") is stricter.' },
    { term: 'CIEDE2000', aliases: ['de00', 'de2000', 'ciede 2000', 'e00'], topic: 'formulas',
      definition: 'The current best-practice Delta E formula (2000) — also corrects a known hue-rotation issue CIE76/94 have in blue tones. Usual default when no other formula is specified.' },
    { term: 'L*', aliases: ['l star', 'lightness'], topic: 'axes',
      definition: 'The lightness axis of CIELAB: 0 = black, 100 = white.' },
    { term: 'a*', aliases: ['a star'], topic: 'axes',
      definition: 'One of the two colour axes in CIELAB. Positive a* = red, negative a* = green.' },
    { term: 'b*', aliases: ['b star'], topic: 'axes',
      definition: 'One of the two colour axes in CIELAB. Positive b* = yellow, negative b* = blue.' },
    { term: 'C* (Chroma)', aliases: ['chroma', 'saturation', 'c star'], topic: 'axes',
      definition: 'Distance from the neutral grey axis — √(a*² + b*²). How vivid/saturated a colour is.' },
    { term: 'h (hue angle)', aliases: ['hue', 'hue angle'], topic: 'axes',
      definition: 'The angle around the a*b* plane, 0–360° — atan2(b*, a*). 0° is red-ish, 90° yellow, 180° green, 270° blue.' },
    { term: 'D65', aliases: ['d65 illuminant', 'daylight illuminant'], topic: 'illuminants',
      definition: 'A standardized illuminant approximating average daylight. The most common illuminant for colour measurement.' },
    { term: 'Illuminant A', aliases: ['illuminant a', 'incandescent illuminant'], topic: 'illuminants',
      definition: 'A standardized illuminant approximating incandescent (tungsten) light — much warmer/oranger than daylight.' },
    { term: 'F11', aliases: ['f11 illuminant', 'fluorescent illuminant'], topic: 'illuminants',
      definition: 'A standardized illuminant approximating a common fluorescent light source.' },
    { term: 'Observer angle (2°/10°)', aliases: ['observer', '2 degree observer', '10 degree observer', 'standard observer'], topic: 'illuminants',
      definition: 'The field of view the colour-matching functions were built from — not a measurement geometry. 10° is more common today.' },
    { term: 'Metamerism', aliases: ['metameric', 'metamer'], topic: 'illuminants',
      definition: 'Two colours that match under one illuminant but look different under another. The most common cause of "it matched in the booth, not at the loading dock."' },
    { term: 'Geometry (45/0)', aliases: ['45/0', '0/45', 'measurement geometry'], topic: 'instrument',
      definition: 'The standard measurement geometry for solid colours: light at 45°, sensor reads straight on (0°).' },
    { term: 'Sphere (d/8)', aliases: ['d:8', 'd8', 'integrating sphere'], topic: 'instrument',
      definition: 'A measurement geometry that integrates light from every direction — used when gloss shouldn\'t influence the colour reading.' },
    { term: 'Multiangle', aliases: ['15/45/110', 'flop', 'flop index'], topic: 'instrument',
      definition: 'Measurement at several angles (e.g. 15°/45°/110°), required for metallics and pearls because their colour genuinely changes with viewing angle ("flop").' },
    { term: 'Gloss (GU)', aliases: ['gloss unit', 'gu', 'gloss units'], topic: 'gloss',
      definition: 'A measure of specular reflection, usually read at 60°. Higher gloss tends to make a colour read darker and more saturated, even at identical Lab values. Common bands (60°, roughly — exact cut-offs vary by standard and customer spec, so treat this as a general reference, not a fixed rule): matte under 10 GU, eggshell 10–15, low sheen 15–25, satin 26–40, semi-gloss 41–69, full gloss 70–90+. Very low-gloss ("super matt") products are often measured at 85° instead, since 60° barely registers any specular peak down there and can\'t discriminate well below ~10 GU.' },
    { term: 'Tolerance', aliases: ['pass fail', 'tolerance limit'], topic: 'reading',
      definition: 'The maximum Delta E (or component) allowed before a batch is rejected. Should be agreed with the customer alongside which formula is used.' },
    { term: 'Deviation / noise floor', aliases: ['noise floor', 'instrument repeatability', 'deviation'], topic: 'reading',
      definition: 'The typical measurement scatter of an instrument — differences at or below this aren\'t meaningful and shouldn\'t drive a tinting decision.' },
    { term: 'Master panel', aliases: ['master', 'reference panel', 'standard'], topic: 'instrument',
      definition: 'The reference colour every sample is compared against. Should be recorded with its geometry, illuminant, gloss and measurement date.' },
    { term: 'DFT', aliases: ['dry film thickness'], topic: 'instrument',
      definition: 'Dry film thickness — the cured coating thickness, usually given as a range (e.g. 25–28 µm). Affects how a colour reads.' },
    { term: 'Batch', aliases: ['batch no', 'batch number', 'lot'], topic: 'instrument',
      definition: 'A specific production run of a colour, usually tracked with a batch number so a QC record can be traced back to exactly what was made and when.' },
    { term: 'Colour vision deficiency', aliases: ['color blindness', 'colour blindness', 'daltonism', 'colour vision test'], topic: 'reading',
      definition: 'A reduced ability to distinguish certain hues (commonly red-green). Relevant for QC roles that make pass/fail colour calls — see the hue arrangement self-check.' }
  ];

  function normalize(s) { return (s || '').toLowerCase().trim(); }

  var STOPWORDS = { what: 1, is: 1, are: 1, the: 1, a: 1, an: 1, does: 1, do: 1, mean: 1, of: 1, in: 1, on: 1, to: 1, co: 1, je: 1, jsou: 1, znamena: 1 };

  function tokenize(query) {
    return normalize(query).split(/[^a-z0-9°*]+/).filter(function (t) { return t && !STOPWORDS[t]; });
  }

  // Returns TERMS sorted by relevance, highest first. Empty query -> all terms, unscored order.
  function search(query) {
    var tokens = tokenize(query);
    if (!tokens.length) return TERMS.slice();

    var scored = TERMS.map(function (entry) {
      var score = 0;
      var termLower = normalize(entry.term);
      var aliasLowers = entry.aliases.map(normalize);
      var defLower = normalize(entry.definition);

      tokens.forEach(function (tok) {
        if (termLower === tok || aliasLowers.indexOf(tok) !== -1) score += 10;
        else if (termLower.indexOf(tok) !== -1 || aliasLowers.some(function (a) { return a.indexOf(tok) !== -1; })) score += 5;
        else if (tok.length >= 4 && defLower.indexOf(tok) !== -1) score += 1;
      });

      return { entry: entry, score: score };
    }).filter(function (s) { return s.score > 0; });

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.entry; });
  }

  global.Glossary = { TERMS: TERMS, search: search };
})(typeof window !== 'undefined' ? window : globalThis);
