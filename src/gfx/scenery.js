// Canvas scenery. Everything is generated at runtime — no image assets.
// Deterministic per world and step: the same view every visit.

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
