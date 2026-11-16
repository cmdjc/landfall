// Canvas scenery. Everything is generated at runtime — no image assets.
// Deterministic per world and step: the same view every visit.
import { hashString, rngf } from "../core/rng.js";

const devicePixelRatio = () => Math.min(2, globalThis.devicePixelRatio || 1);

const linGrad = (g, x0, y0, x1, y1, stops) => {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
};

const starsFx = (g, w, h, r, n) => {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.3 + r() * 0.7;
    g.fillStyle = "#fff";
    const s = r() < 0.1 ? 1.8 : 1;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.globalAlpha = 1;
};

const bandsFx = (g, x0, y0, w, h, v, r) => {
  for (let y = 0; y < h;) {
    const bh = 16 + r() * 34;
    g.fillStyle = v.bands[Math.floor(r() * v.bands.length)];
    g.beginPath();
    g.moveTo(x0, y0 + y);
    const f = 28 + r() * 20, p = r() * 9;
    for (let x = 0; x <= w; x += 10) g.lineTo(x0 + x, y0 + y + Math.sin(x / f + p) * 3);
    g.lineTo(x0 + w, y0 + y + bh + 8);
    g.lineTo(x0, y0 + y + bh + 8);
    g.fill();
    y += bh;
  }
  for (let i = 0; i < 9; i++) {
    g.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.1})`;
    g.beginPath();
    g.ellipse(x0 + r() * w, y0 + r() * h, 20 + r() * 50, 3 + r() * 6, 0, 0, 6.3);
    g.fill();
  }
};

const orbitFx = (g, w, h, v, r) => {
  g.fillStyle = linGrad(g, 0, 0, 0, h, ["#04061A", "#0B1236"]);
  g.fillRect(0, 0, w, h);
  starsFx(g, w, h, r, 90);
  if (v.kind === "belt") {
    for (let i = 0; i < 70; i++) {
      const s = 1 + r() * 4, x = r() * w, y = r() * h;
      g.fillStyle = `rgba(${(150 + r() * 50) | 0},${(145 + r() * 40) | 0},${(135 + r() * 40) | 0},.9)`;
      g.beginPath();
      g.ellipse(x, y, s * 1.3, s, r() * 3, 0, 6.3);
      g.fill();
    }
    const cx = w * 0.68, cy = h * 0.5, R = Math.min(h * 0.26, 38);
    const k = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 2, cx, cy, R);
    k.addColorStop(0, "#C9C3BA");
    k.addColorStop(1, "#4A4642");
    g.fillStyle = k;
    g.beginPath();
    g.arc(cx, cy, R, 0, 6.3);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(cx + R * 0.2, cy - R * 0.1, 2.4, 0, 6.3);
    g.fill();
    return;
  }
  if (v.kind === "star") {
    const cx = w * 0.5, cy = h * 1.25;
    const k = g.createRadialGradient(cx, cy, 10, cx, cy, h * 1.5);
    k.addColorStop(0, "#FFF6D0");
    k.addColorStop(0.35, "#FFB547");
    k.addColorStop(0.6, "rgba(255,120,40,.45)");
    k.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = k;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,190,100,.7)";
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const x = w * (0.2 + i * 0.3) + r() * 30;
      g.beginPath();
      g.ellipse(x, h * 0.82, 26 + r() * 14, 34 + r() * 22, 0, Math.PI, 0);
      g.stroke();
    }
    return;
  }
  const R = w * 0.62, cx = w * 0.5, cy = h * 0.4 + R;
  g.save();
  g.shadowColor = v.glow || "#fff";
  g.shadowBlur = 26;
  g.fillStyle = v.glow || "#fff";
  g.beginPath();
  g.arc(cx, cy, R + 3, 0, 6.3);
  g.fill();
  g.restore();
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, 6.3);
  g.clip();
  const k = g.createRadialGradient(cx - R * 0.3, cy - R * 0.7, R * 0.1, cx, cy, R * 1.1);
  k.addColorStop(0, v.disc[0]);
  k.addColorStop(1, v.disc[1]);
  g.fillStyle = k;
  g.fillRect(0, 0, w, h);
  if (v.bands) bandsFx(g, 0, h * 0.35, w, h, v, r);
  if (v.craters) {
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = h * 0.4 + r() * h * 0.6, s = 3 + r() * 14;
      g.fillStyle = "rgba(0,0,0,.18)";
      g.beginPath();
      g.arc(x, y, s, 0, 6.3);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.12)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x - 1, y - 1, s, 0, 6.3);
      g.stroke();
    }
  }
  if (v.clouds || (v.kind !== "gas" && !v.craters)) {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = "rgba(255,255,255,.22)";
      g.beginPath();
      g.ellipse(r() * w, h * 0.45 + r() * h * 0.5, 30 + r() * 70, 5 + r() * 9, 0, 0, 6.3);
      g.fill();
    }
  }
  g.fillStyle = linGrad(g, 0, 0, w, 0, ["rgba(0,0,10,0)", "rgba(0,0,10,.55)"]);
  g.fillRect(0, 0, w, h);
  g.restore();
  if (v.rings) {
    g.save();
    g.translate(cx, h * 0.78);
    g.rotate(-0.1);
    [[1.15, 0.2, "rgba(228,205,150,.85)", 12], [1.3, 0.23, "rgba(190,165,110,.7)", 8], [1.45, 0.26, "rgba(215,190,140,.5)", 6]]
      .forEach(([a, b, c, lw]) => {
        g.strokeStyle = c;
        g.lineWidth = lw;
        g.beginPath();
        g.ellipse(0, 0, w * a * 0.62, h * b, 0, Math.PI * 1.02, Math.PI * 1.98);
        g.stroke();
      });
    g.restore();
  }
};

export function drawOrbit(canvas, view, rng) {
  if (!canvas || !canvas.clientWidth) return;
  const g = canvas.getContext && canvas.getContext("2d");
  if (!g) return;
  const dpr = devicePixelRatio();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  orbitFx(g, w, h, view, rng);
}

const terrainFx = (g, w, h, v, r, step) => {
  const hz = h * (step === 1 ? 0.64 : 0.5), amp = step === 1 ? 10 : 28;
  if (v.terrain === "ocean") {
    g.fillStyle = linGrad(g, 0, hz, 0, h, v.ground);
    g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = "rgba(255,255,255,.25)";
    g.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const x = r() * w, y = hz + 8 + r() * (h - hz - 8), l = 10 + r() * 26;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + l / 2, y - 4, x + l, y);
      g.stroke();
    }
    return;
  }
  const a = r() * 6, b = r() * 6, k = v.terrain === "smooth" ? 0.45 : 1;
  g.fillStyle = linGrad(g, 0, hz, 0, h, v.ground);
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, hz - k * (Math.sin(x / 70 + a) * amp * 0.6 + Math.sin(x / 23 + b) * amp * 0.3 + r() * 2));
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  const n = step === 2 ? 16 : 8;
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = hz + 12 + r() * (h - hz - 12), s = (step === 2 ? 8 : 4) + r() * (step === 2 ? 22 : 10);
    g.fillStyle = "rgba(0,0,0,.24)";
    g.beginPath();
    g.ellipse(x, y, s, s * 0.5, 0, 0, 6.3);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.1)";
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x, y - 1, s, s * 0.5, 0, Math.PI, 0);
    g.stroke();
  }
};

export function drawView(cv, world, step) {
  if (!cv || !cv.clientWidth) return;
  const g = cv.getContext && cv.getContext("2d");
  if (!g) return;
  const dpr = devicePixelRatio();
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr;
  cv.height = h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = rngf(hashString(world.id) + step * 7919), v = world.v;
  if (step === 0) {
    orbitFx(g, w, h, v, r);
    return;
  }
  g.fillStyle = linGrad(g, 0, 0, 0, h, v.sky || ["#2A1A10", "#0E0A08"]);
  g.fillRect(0, 0, w, h);
  if (v.stars) starsFx(g, w, h * 0.75, r, 70);
  if (v.body) {
    const b = v.body, k = g.createRadialGradient(b.x * w - b.r * 0.3, b.y * h - b.r * 0.3, 2, b.x * w, b.y * h, b.r);
    k.addColorStop(0, b.c[0]);
    k.addColorStop(1, b.c[1]);
    g.fillStyle = k;
    g.beginPath();
    g.arc(b.x * w, b.y * h, b.r, 0, 6.3);
    g.fill();
  }
  if (v.sun) {
    const sx = w * 0.78, sy = h * 0.26, sr = v.sun[0];
    g.save();
    g.shadowColor = v.sun[1];
    g.shadowBlur = sr * 1.6;
    g.fillStyle = v.sun[1];
    g.beginPath();
    g.arc(sx, sy, sr, 0, 6.3);
    g.fill();
    g.restore();
  }
  if (v.bands) {
    bandsFx(g, 0, 0, w, h, v, r);
    if (v.kind === "star") {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = "rgba(90,30,0,.55)";
        g.beginPath();
        g.ellipse(r() * w, r() * h, 6 + r() * 12, 4 + r() * 7, 0, 0, 6.3);
        g.fill();
      }
    } else {
      g.fillStyle = linGrad(g, 0, 0, 0, h, [step === 1 ? "rgba(20,10,0,0)" : "rgba(20,10,0,.25)", step === 1 ? "rgba(20,10,0,.3)" : "rgba(10,5,0,.7)"]);
      g.fillRect(0, 0, w, h);
    }
  } else terrainFx(g, w, h, v, r, step);
  if (v.clouds) {
    for (let i = 0; i < 7; i++) {
      g.fillStyle = "rgba(255,255,255,.55)";
      g.beginPath();
      g.ellipse(r() * w, r() * h * 0.45, 30 + r() * 60, 6 + r() * 10, 0, 0, 6.3);
      g.fill();
    }
  }
  if (v.haze) {
    g.fillStyle = v.haze;
    g.fillRect(0, 0, w, h);
  }
}
