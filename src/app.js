// Lógica de la ventana: pide las velas, las lee, lo explica y avisa en vivo.
const { T: TEXTOS, conGlosario } = window.Textos;
const TFS = ['15m', '1h', '4h', '1d'];
const POPULARES = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'PAXG', 'XAUT'];
const ORO = ['PAXG', 'XAUT'];

const $ = id => document.getElementById(id);
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const leerPref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

const estado = {
  base: leerPref('activo', 'BTC'),
  idioma: leerPref('idioma', (navigator.language || 'es').startsWith('es') ? 'es' : 'en'),
  tfVisible: leerPref('tf', '1h'),
  fuente: 'binance',
  datos: {}, lecturas: {}, junta: null,
  avisos: [], ultimoAviso: {}, nivelesAvisados: new Set(),
  detalleAbierto: false, ws: null, sondeo: null, generacion: 0,
};

// ---------- formato ----------
function fmt(p) {
  if (p == null || !isFinite(p)) return '—';
  const dec = p >= 1000 ? 0 : p >= 100 ? 1 : p >= 1 ? 2 : p >= 0.01 ? 4 : 6;
  return '$' + p.toLocaleString(estado.idioma === 'es' ? 'es-MX' : 'en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
const tx = () => TEXTOS[estado.idioma];
const flecha = t => ({ sube: '▲', baja: '▼', lado: '▬' })[t] || '·';

// ---------- datos ----------
async function pedirTodo(base, fuente) {
  const res = {};
  await Promise.all(['1m', ...TFS].map(async tf => {
    res[tf] = await window.ct.velas(base, tf, tf === '1m' ? 60 : 300, fuente);
  }));
  return res;
}

async function cargar(base) {
  const gen = ++estado.generacion;
  cerrarVivo();
  estado.base = base; guardar('activo', base);
  estado.lecturas = {}; estado.avisos = []; estado.nivelesAvisados.clear();
  $('titulo').textContent = tx().cargando;
  $('resumen').textContent = $('decide').textContent = '';
  try {
    let datos, fuente = 'binance';
    try { datos = await pedirTodo(base, 'binance'); }
    catch { datos = await pedirTodo(base, 'okx'); fuente = 'okx'; }
    if (gen !== estado.generacion) return;
    estado.datos = datos; estado.fuente = fuente;
    TFS.forEach(tf => (estado.lecturas[tf] = window.Analisis.leer(datos[tf])));
    estado.junta = window.Analisis.juntar(estado.lecturas);
    pintarTodo();
    conectarVivo(base, gen);
  } catch (e) {
    if (gen !== estado.generacion) return;
    $('titulo').textContent = tx().error;
    setTimeout(() => gen === estado.generacion && cargar(base), 10000);
  }
}

// ---------- en vivo ----------
function cerrarVivo() {
  if (estado.ws) { estado.ws.onclose = null; estado.ws.close(); estado.ws = null; }
  if (estado.sondeo) { clearInterval(estado.sondeo); estado.sondeo = null; }
}

function conectarVivo(base, gen) {
  if (estado.fuente === 'okx') {
    estado.sondeo = setInterval(async () => {
      for (const tf of ['1m', ...TFS]) {
        try {
          const ult = await window.ct.velas(base, tf, 3, 'okx');
          ult.forEach(v => recibirVela(tf, v));
        } catch {}
      }
    }, 5000);
    return;
  }
  const s = base.toLowerCase() + 'usdt';
  const streams = ['1m', ...TFS].map(tf => `${s}@kline_${tf}`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
  ws.onmessage = ev => {
    const k = JSON.parse(ev.data).data?.k;
    if (!k) return;
    recibirVela(k.i, { t: Math.floor(k.t / 1000), o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, cerrada: k.x });
  };
  ws.onclose = () => { if (gen === estado.generacion) setTimeout(() => conectarVivo(base, gen), 3000); };
  estado.ws = ws;
}

let pintaPendiente = false;
function recibirVela(tf, v) {
  const lista = estado.datos[tf];
  if (!lista) return;
  const ult = lista[lista.length - 1];
  const precioAntes = estado.datos['1m']?.at(-1)?.c;
  if (ult && ult.t === v.t) Object.assign(ult, v);
  else if (!ult || v.t > ult.t) { if (ult) ult.cerrada = true; lista.push(v); if (lista.length > 400) lista.shift(); }
  else return;

  if (tf === '1m') revisarAvisos(precioAntes, v);
  if (tf === estado.tfVisible && serie) serie.update({ time: v.t, open: v.o, high: v.h, low: v.l, close: v.c });

  // La explicación solo cambia cuando cierra una vela.
  if (v.cerrada && TFS.includes(tf)) {
    estado.lecturas[tf] = window.Analisis.leer(lista);
    estado.junta = window.Analisis.juntar(estado.lecturas);
    estado.nivelesAvisados.clear();
    pintarTodo();
    return;
  }
  if (!pintaPendiente) { pintaPendiente = true; requestAnimationFrame(() => { pintaPendiente = false; pintarPrecio(); }); }
}

// ---------- avisos a media vela ----------
function avisar(clave, texto, minutos = 10) {
  const ahora = Date.now();
  if (estado.ultimoAviso[clave] && ahora - estado.ultimoAviso[clave] < minutos * 60000) return;
  estado.ultimoAviso[clave] = ahora;
  estado.avisos.unshift({ hora: new Date(), texto });
  estado.avisos = estado.avisos.slice(0, 6);
  pintarAvisos();
}

function revisarAvisos(antes, v) {
  const t = tx().alertas, precio = v.c;
  if (antes != null) {
    for (const tf of ['1h', '4h']) {
      const l = estado.lecturas[tf];
      if (!l) continue;
      const kp = `${tf}-p-${l.piso.precio}`, kt = `${tf}-t-${l.techo.precio}`;
      if (antes >= l.piso.precio && precio < l.piso.precio * 0.999 && !estado.nivelesAvisados.has(kp)) {
        estado.nivelesAvisados.add(kp); avisar(kp, t.rompePiso(tx().tf[tf], fmt(l.piso.precio)), 60);
      }
      if (antes <= l.techo.precio && precio > l.techo.precio * 1.001 && !estado.nivelesAvisados.has(kt)) {
        estado.nivelesAvisados.add(kt); avisar(kt, t.rompeTecho(tx().tf[tf], fmt(l.techo.precio)), 60);
      }
    }
  }
  const m = estado.datos['1m'];
  if (m.length > 30) {
    const hace3 = m[m.length - 4].c;
    const cambio = (precio - hace3) / hace3;
    const a1m = window.Analisis.atr(m.slice(-30));
    if (Math.abs(cambio) > Math.max(0.005, (4 * a1m) / precio)) avisar('brusco', t.brusco(pct(cambio)));
    if (v.cerrada) {
      const prom = m.slice(-31, -1).reduce((s, x) => s + x.v, 0) / 30;
      if (prom > 0 && v.v > prom * 5) avisar('volumen', t.volumen(v.c >= v.o ? 'compra' : 'venta'));
    }
  }
}

// ---------- pintar ----------
function pintarPrecio() {
  const h = estado.datos['1h'];
  const precio = estado.datos['1m']?.at(-1)?.c ?? h?.at(-1)?.c;
  $('precio').textContent = fmt(precio);
  if (h && h.length > 25) {
    const c = (precio - h[h.length - 25].c) / h[h.length - 25].c;
    $('cambio').textContent = `${c >= 0 ? '▲' : '▼'}${Math.abs(c * 100).toFixed(2)}%`;
    $('cambio').className = 'text-xs tabular-nums ' + (c >= 0 ? 'text-success' : 'text-error');
  }
}

function pintarTodo() {
  const t = tx(), j = estado.junta, L = estado.lecturas, idioma = estado.idioma;
  document.documentElement.lang = idioma;
  pintarPrecio();

  $('estados').innerHTML = TFS.map(tf => {
    const tend = L[tf]?.tendencia;
    return `<span class="badge badge-sm badge-ghost gap-1"><span class="opacity-70">${t.tf[tf]}</span><span class="flecha-${tend}">${flecha(tend)}</span></span>`;
  }).join('');

  if (j) {
    const [titulo, resumen] = t.casos[j.caso];
    $('titulo').innerHTML = conGlosario(titulo, idioma);
    $('resumen').innerHTML = conGlosario(resumen, idioma);
    $('decide').innerHTML = j.piso && j.techo ? conGlosario(t.decide(fmt(j.piso.precio), fmt(j.techo.precio)), idioma) : '';
  }

  $('patrones').innerHTML = TFS.filter(tf => L[tf]?.patron).map(tf => {
    const p = L[tf].patron;
    return `<span class="badge badge-sm badge-outline">${conGlosario(t.patronEn(t.tf[tf], t.patrones[p], p), idioma)}</span>`;
  }).join('');

  $('btn-explicar').textContent = estado.detalleAbierto ? t.ocultar : t.explicar;
  $('detalle').classList.toggle('hidden', !estado.detalleAbierto);
  if (estado.detalleAbierto) pintarDetalle();

  $('aviso-oro').classList.toggle('hidden', !ORO.includes(estado.base));
  $('aviso-oro').textContent = t.oro;
  $('aviso-fuente').classList.toggle('hidden', estado.fuente !== 'okx');
  $('aviso-fuente').textContent = t.fuenteRespaldo;
  $('titulo-avisos').textContent = t.avisos;
  $('nota').textContent = t.nota;
  $('lbl-encima').dataset.tip = t.siempreEncima;
  $('activo').placeholder = t.buscar;
  document.querySelectorAll('[data-idioma]').forEach(b => b.classList.toggle('btn-primary', b.dataset.idioma === idioma));

  $('pestanas').innerHTML = TFS.map(tf =>
    `<a role="tab" class="tab ${tf === estado.tfVisible ? 'tab-active' : ''}" data-tf="${tf}">${t.tf[tf]}</a>`).join('');
  pintarAvisos();
  pintarGrafica();
  if (typeof pintarVersion === 'function') pintarVersion();
}

function pintarDetalle() {
  const t = tx(), d = t.detalle, L = estado.lecturas, idioma = estado.idioma;
  const partes = TFS.filter(tf => L[tf]).map(tf => {
    const l = L[tf];
    const dist = x => pct((x - l.precio) / l.precio);
    const lineas = [
      d.tendencia(l.tendencia, fmt(l.cierre), fmt(l.ema20), fmt(l.ema50)),
      d.niveles(fmt(l.piso.precio), l.piso.toques, fmt(l.techo.precio), l.techo.toques, dist(l.piso.precio), dist(l.techo.precio)),
      d.volumen(l.volumen.toFixed(1)),
    ];
    if (l.patron) lineas.push(`${t.patrones[l.patron]}: ${window.Textos.GLOSARIO[idioma][l.patron]}`);
    return `<div><div class="font-semibold">${d.titulo(t.tf[tf])}</div>${lineas.map(x => `<p>${conGlosario(x, idioma)}</p>`).join('')}</div>`;
  });
  const j = estado.junta;
  if (j?.piso && j?.techo) partes.push(`<p class="opacity-80">${d.vigilar(fmt(j.piso.precio), fmt(j.techo.precio))}</p>`);
  $('detalle').innerHTML = partes.join('');
}

function pintarAvisos() {
  const lista = estado.avisos;
  const loc = estado.idioma === 'es' ? 'es-MX' : 'en-US';
  $('avisos').innerHTML = lista.length
    ? lista.map(a => `<li class="flex gap-2"><span class="opacity-50 tabular-nums">${a.hora.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</span><span>⚠️ ${a.texto}</span></li>`).join('')
    : `<li class="opacity-50">${tx().sinAvisos}</li>`;
}

// ---------- gráfica ----------
let grafica, serie, marcas, lineas = [];
function crearGrafica() {
  const LC = window.LightweightCharts;
  grafica = LC.createChart($('grafica'), {
    autoSize: true,
    layout: { background: { color: 'transparent' }, textColor: '#9aa4b2', fontSize: 10, attributionLogo: true },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: true },
    crosshair: { mode: 0 },
  });
  serie = grafica.addSeries(LC.CandlestickSeries, {
    upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
  });
  marcas = LC.createSeriesMarkers(serie, []);
}

function pintarGrafica() {
  if (!serie) return;
  const tf = estado.tfVisible, velas = estado.datos[tf], l = estado.lecturas[tf], t = tx();
  if (!velas) return;
  const ref = velas.at(-1).c, dec = ref >= 1000 ? 0 : ref >= 100 ? 1 : ref >= 1 ? 2 : ref >= 0.01 ? 4 : 6;
  serie.applyOptions({ priceFormat: { type: 'price', precision: dec, minMove: 1 / 10 ** dec } });
  serie.setData(velas.map(v => ({ time: v.t, open: v.o, high: v.h, low: v.l, close: v.c })));
  lineas.forEach(x => serie.removePriceLine(x)); lineas = [];
  if (l) {
    lineas.push(serie.createPriceLine({ price: l.piso.precio, color: '#22c55e', lineStyle: 2, lineWidth: 1, title: t.piso }));
    lineas.push(serie.createPriceLine({ price: l.techo.precio, color: '#ef4444', lineStyle: 2, lineWidth: 1, title: t.techo }));
    marcas.setMarkers(l.patron ? [{
      time: l.velaPatron, position: ['martillo', 'envolvente_alcista', 'martillo_invertido'].includes(l.patron) ? 'belowBar' : 'aboveBar',
      color: '#eab308', shape: 'circle', text: t.patrones[l.patron],
    }] : []);
  }
  grafica.timeScale().setVisibleLogicalRange({ from: velas.length - 90, to: velas.length + 2 });
}

// ---------- eventos ----------
$('activo').addEventListener('change', e => {
  const base = e.target.value.trim().toUpperCase().replace(/USDT$/, '');
  if (base && base !== estado.base) cargar(base);
});
$('activo').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
document.querySelectorAll('[data-idioma]').forEach(b => b.addEventListener('click', () => {
  estado.idioma = b.dataset.idioma; guardar('idioma', estado.idioma); pintarTodo();
}));
$('pestanas').addEventListener('click', e => {
  const tf = e.target.dataset?.tf;
  if (!tf) return;
  estado.tfVisible = tf; guardar('tf', tf); pintarTodo();
});
$('btn-explicar').addEventListener('click', () => { estado.detalleAbierto = !estado.detalleAbierto; pintarTodo(); });
$('encima').checked = leerPref('encima', '1') === '1';
window.ct.siempreEncima($('encima').checked);
$('encima').addEventListener('change', e => { guardar('encima', e.target.checked ? '1' : '0'); window.ct.siempreEncima(e.target.checked); });

async function llenarLista() {
  let todos = [];
  try { todos = await window.ct.simbolos(); } catch {}
  const lista = [...POPULARES, ...todos.filter(s => !POPULARES.includes(s))];
  $('lista-activos').innerHTML = lista.map(s => `<option value="${s}">`).join('');
}

// ---------- actualizaciones ----------
let actualizacion = null;
function pintarVersion() {
  const t = tx(), u = actualizacion;
  $('aviso-version').classList.toggle('hidden', !u);
  if (!u) return;
  $('texto-version').textContent = u.tipo === 'lista' ? t.versionLista(u.version) : t.versionNueva(u.version);
  $('btn-version').textContent = u.tipo === 'lista' ? t.reiniciar : t.descargar;
}
window.ct.alActualizar(datos => { actualizacion = datos; pintarVersion(); });
$('btn-version').addEventListener('click', () => {
  if (actualizacion?.tipo === 'lista') window.ct.reiniciarActualizar();
  else if (actualizacion?.url) window.ct.abrirDescarga(actualizacion.url);
});

window.ct.version().then(v => ($('version').textContent = 'v' + v));

crearGrafica();
$('activo').value = estado.base;
pintarTodo();
cargar(estado.base);
llenarLista();
