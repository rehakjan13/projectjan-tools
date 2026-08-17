/*
 * i18n.js — minimal string dictionary + t(key) lookup.
 * v1 ships EN-only; cs is stubbed so training/UI copy never gets hardwired
 * outside this dictionary. Add cs.* translations without touching page code.
 */
(function (global) {
  'use strict';

  var DICT = {
    en: {
      appName: 'Delta E Calculator',
      tagline: 'Colour difference for the people who mix and match — read it on a tablet next to the spectro.',
      master: 'Master',
      sample: 'Sample',
      swap: 'Swap master / sample',
      manualTab: 'Manual',
      pasteTab: 'Paste',
      lightness: 'L*',
      aStar: 'a*',
      bStar: 'b*',
      gloss: 'Gloss',
      glossTol: 'Gloss tol. (±)',
      geometry: 'Geometry',
      illuminant: 'Illuminant / observer',
      masterName: 'Master name',
      sampleName: 'Sample name',
      saveMaster: 'Save as master',
      loadMaster: 'Load master',
      noMasters: 'No saved masters yet.',
      geometryWarning: 'Master and sample were measured with a different geometry or illuminant/observer. ΔE between them is not reliable — this is the most common source of disputes in practice.',
      pastePlaceholder: 'Paste from Excel or a measurement printout — tab, semicolon, comma, or space separated. Decimal comma or dot both work. One row = one sample.',
      parsePaste: 'Parse',
      confirmValues: 'Recognized values — check and confirm before calculating',
      formula: 'Formula',
      tolerance: 'Tolerance',
      customTolerance: 'Custom',
      pass: 'PASS',
      fail: 'FAIL',
      noDosage: 'This tool shows direction only, never a dosage amount — that depends on your tinting system and colorant strength and can’t be responsibly guessed.',
      noiseFloorLabel: 'Noise floor (instrument repeatability)',
      withinRepeatability: 'Within instrument repeatability — no meaningful difference.',
      darker: 'darker', lighter: 'lighter',
      lessSaturated: 'less saturated', moreSaturated: 'more saturated',
      hueToward: 'hue shifted toward',
      sampleIs: 'Sample is',
      correctionNeeded: 'Correction needed:',
      history: 'History',
      clearAll: 'Clear all',
      exportLibrary: 'Export library (JSON)',
      importLibrary: 'Import library',
      exportHistory: 'Export history (JSON)',
      saveToHistory: 'Save to history',
      saved: 'Saved',
      calculate: 'Calculate',
      abPlaneTitle: 'a*b* plane',
      lBandTitle: 'L*',
      whereWeAre: 'where we are',
      whereToGo: 'correction direction',
      previewNotice: 'Preview only, not a colorimetric reference',
      outOfGamut: 'out of gamut on a screen — hatched',
      batchResults: 'Batch — one master, multiple samples',
      dft: 'DFT', batchNo: 'Batch no.', comment: 'Comment', measuredBy: 'Instrument / measured by', date: 'Date',
      hueRed: 'red', hueOrange: 'orange', hueYellow: 'yellow', hueYellowGreen: 'yellow-green',
      hueGreen: 'green', hueCyan: 'cyan', hueBlue: 'blue', hueViolet: 'violet'
    },
    cs: {
      // TODO: fill in for bilingual training rollout — keys must match `en`.
    }
  };

  var currentLang = 'en';

  function t(key) {
    var entry = DICT[currentLang] && DICT[currentLang][key];
    if (entry != null) return entry;
    return DICT.en[key] != null ? DICT.en[key] : key;
  }

  function setLang(lang) {
    if (DICT[lang]) currentLang = lang;
  }

  global.I18n = { t: t, setLang: setLang, DICT: DICT };
})(typeof window !== 'undefined' ? window : globalThis);
