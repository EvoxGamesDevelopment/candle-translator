(() => {
// Lectura de la gráfica con reglas fijas: con las mismas velas da siempre la misma lectura.
// No usa IA y no recomienda nada: solo describe lo que hay.

function ema(valores, n) {
  const k = 2 / (n + 1);
  const out = [];
  valores.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

function atr(velas, n = 14) {
  let suma = 0;
  const rangos = velas.map((v, i) => {
    const prev = i ? velas[i - 1].c : v.o;
    return Math.max(v.h - v.l, Math.abs(v.h - prev), Math.abs(v.l - prev));
  });
  const ult = rangos.slice(-n);
  ult.forEach(r => (suma += r));
  return suma / ult.length;
}

// Pisos y techos: puntos donde el precio dio la vuelta, agrupados por cercanía.
function niveles(velas, a) {
  const ventana = 3, pivotes = [];
  const desde = Math.max(ventana, velas.length - 160);
  for (let i = desde; i < velas.length - ventana; i++) {
    const v = velas[i];
    let alto = true, bajo = true;
    for (let j = i - ventana; j <= i + ventana; j++) {
      if (j === i) continue;
      if (velas[j].h >= v.h) alto = false;
      if (velas[j].l <= v.l) bajo = false;
    }
    if (alto) pivotes.push(v.h);
    if (bajo) pivotes.push(v.l);
  }
  pivotes.sort((x, y) => x - y);
  const grupos = [];
  for (const p of pivotes) {
    const g = grupos[grupos.length - 1];
    if (g && p - g.max <= a * 0.6) { g.precios.push(p); g.max = p; }
    else grupos.push({ precios: [p], max: p });
  }
  return grupos.map(g => ({
    precio: g.precios.reduce((s, x) => s + x, 0) / g.precios.length,
    toques: g.precios.length,
  }));
}

function patron(velas, tendencia) {
  const v = velas[velas.length - 1], p = velas[velas.length - 2];
  if (!v || !p) return null;
  const rango = v.h - v.l || 1e-12;
  const cuerpo = Math.abs(v.c - v.o);
  const mechaSup = v.h - Math.max(v.c, v.o);
  const mechaInf = Math.min(v.c, v.o) - v.l;
  const cuerpoP = Math.abs(p.c - p.o);
  if (p.c < p.o && v.c > v.o && v.c >= p.o && v.o <= p.c && cuerpo > cuerpoP) return 'envolvente_alcista';
  if (p.c > p.o && v.c < v.o && v.o >= p.c && v.c <= p.o && cuerpo > cuerpoP) return 'envolvente_bajista';
  if (mechaInf >= cuerpo * 2 && mechaSup <= cuerpo * 0.6 && mechaInf > rango * 0.55) {
    return tendencia === 'sube' ? 'hombre_colgado' : 'martillo';
  }
  if (mechaSup >= cuerpo * 2 && mechaInf <= cuerpo * 0.6 && mechaSup > rango * 0.55) {
    return tendencia === 'baja' ? 'martillo_invertido' : 'estrella_fugaz';
  }
  if (cuerpo <= rango * 0.1) return 'doji';
  return null;
}

// Lee una temporalidad. Usa solo velas cerradas; la vela en formación no cuenta.
function leer(todas) {
  const velas = todas.filter(v => v.cerrada);
  if (velas.length < 60) return null;
  const cierres = velas.map(v => v.c);
  const e20 = ema(cierres, 20), e50 = ema(cierres, 50);
  const n = velas.length - 1;
  const precio = todas[todas.length - 1].c;
  const a = atr(velas);
  const pendiente = (e20[n] - e20[n - 5]) / a;

  let tendencia = 'lado';
  if (e20[n] > e50[n] && cierres[n] > e20[n] && pendiente > 0.15) tendencia = 'sube';
  else if (e20[n] < e50[n] && cierres[n] < e20[n] && pendiente < -0.15) tendencia = 'baja';

  const nv = niveles(velas, a);
  const debajo = nv.filter(x => x.precio < precio - a * 0.3).sort((x, y) => y.precio - x.precio);
  const encima = nv.filter(x => x.precio > precio + a * 0.3).sort((x, y) => x.precio - y.precio);
  const ult50 = velas.slice(-50);
  const piso = debajo[0] || { precio: Math.min(...ult50.map(v => v.l)), toques: 1 };
  const techo = encima[0] || { precio: Math.max(...ult50.map(v => v.h)), toques: 1 };

  const vol20 = velas.slice(-21, -1).reduce((s, v) => s + v.v, 0) / 20 || 1;
  const volumen = velas[n].v / vol20;
  const p = patron(velas, tendencia);
  const cambio = (velas[n].c - velas[n].o) / velas[n].o;

  return {
    tendencia, precio, cierre: cierres[n], atr: a, piso, techo, volumen, patron: p,
    velaPatron: p ? velas[n].t : null, cambio, ema20: e20[n], ema50: e50[n],
  };
}

// Junta las cuatro temporalidades en una sola lectura.
function juntar(l) {
  const chicas = [l['15m'], l['1h']].map(x => x?.tendencia);
  const grandes = [l['4h'], l['1d']].map(x => x?.tendencia);
  const todas = [...chicas, ...grandes];
  let caso;
  if (todas.every(t => t === 'sube')) caso = 'todo_sube';
  else if (todas.every(t => t === 'baja')) caso = 'todo_baja';
  else if (grandes.every(t => t === 'sube') && chicas.includes('baja')) caso = 'correccion';
  else if (grandes.every(t => t === 'baja') && chicas.includes('sube')) caso = 'rebote';
  else if (grandes.includes('sube') && !grandes.includes('baja')) caso = 'pausa_sube';
  else if (grandes.includes('baja') && !grandes.includes('sube')) caso = 'pausa_baja';
  else if (grandes.every(t => t === 'lado')) caso = 'sin_direccion';
  else caso = 'mixto';
  // Los niveles que deciden: los de 4 h (si no hay, los de 1 h)
  const ref = l['4h'] || l['1h'];
  return { caso, piso: ref?.piso, techo: ref?.techo };
}

window.Analisis = { leer, juntar, atr };
})();
