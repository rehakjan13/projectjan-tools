/*
 * colorspace.js — pure color space math, no DOM.
 * CIELAB <-> LCh, CIELAB -> sRGB (D65, 2°) for preview only.
 * Works as a plain <script> (exposes window.ColorSpace) and as a CommonJS module.
 */
(function (global) {
  'use strict';

  var DEG2RAD = Math.PI / 180;
  var RAD2DEG = 180 / Math.PI;

  function sind(deg) { return Math.sin(deg * DEG2RAD); }
  function cosd(deg) { return Math.cos(deg * DEG2RAD); }
  function atan2d(y, x) {
    var deg = Math.atan2(y, x) * RAD2DEG;
    return deg < 0 ? deg + 360 : deg;
  }

  // L*a*b* -> C*, h (degrees, 0-360)
  function labToLch(lab) {
    var a = lab.a, b = lab.b;
    var C = Math.sqrt(a * a + b * b);
    var h = (a === 0 && b === 0) ? 0 : atan2d(b, a);
    return { L: lab.L, C: C, h: h };
  }

  function lchToLab(lch) {
    return {
      L: lch.L,
      a: lch.C * cosd(lch.h),
      b: lch.C * sind(lch.h)
    };
  }

  // D65 2° white point
  var WHITE_D65 = { Xn: 95.047, Yn: 100.000, Zn: 108.883 };

  function labToXyz(lab, white) {
    white = white || WHITE_D65;
    var fy = (lab.L + 16) / 116;
    var fx = fy + lab.a / 500;
    var fz = fy - lab.b / 200;

    function finv(t) {
      var t3 = t * t * t;
      return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
    }

    return {
      X: white.Xn * finv(fx),
      Y: white.Yn * finv(fy),
      Z: white.Zn * finv(fz)
    };
  }

  function gammaEncode(v) {
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  }

  // XYZ (0-100 scale) -> linear sRGB -> gamma sRGB (0-1 range, NOT clamped)
  function xyzToSrgb(xyz) {
    var X = xyz.X / 100, Y = xyz.Y / 100, Z = xyz.Z / 100;

    var rLin = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
    var gLin = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
    var bLin = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

    return {
      r: gammaEncode(rLin),
      g: gammaEncode(gLin),
      b: gammaEncode(bLin)
    };
  }

  // L*a*b* -> sRGB preview. Marks out-of-gamut so the UI can flag it —
  // the preview is not colorimetrically trustworthy once clamped.
  function labToSrgb(lab) {
    var srgb = xyzToSrgb(labToXyz(lab));
    var outOfGamut = srgb.r < 0 || srgb.r > 1 || srgb.g < 0 || srgb.g > 1 || srgb.b < 0 || srgb.b > 1;

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    var r = clamp01(srgb.r), g = clamp01(srgb.g), b = clamp01(srgb.b);

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      outOfGamut: outOfGamut
    };
  }

  function toHex(rgb) {
    function h(v) { var s = v.toString(16); return s.length < 2 ? '0' + s : s; }
    return '#' + h(rgb.r) + h(rgb.g) + h(rgb.b);
  }

  function labToHex(lab) {
    return toHex(labToSrgb(lab));
  }

  var ColorSpace = {
    sind: sind,
    cosd: cosd,
    atan2d: atan2d,
    labToLch: labToLch,
    lchToLab: lchToLab,
    labToXyz: labToXyz,
    xyzToSrgb: xyzToSrgb,
    labToSrgb: labToSrgb,
    labToHex: labToHex,
    WHITE_D65: WHITE_D65
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorSpace;
  } else {
    global.ColorSpace = ColorSpace;
  }
})(typeof window !== 'undefined' ? window : globalThis);
