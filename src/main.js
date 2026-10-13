// Proceso principal: abre la ventanita y hace las consultas a los exchanges
// (desde aquí no hay problemas de permisos del navegador).
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const pkg = require('../package.json');
const REPO = pkg.build?.publish?.[0];

let ventana;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 400,
    height: 720,
    minWidth: 340,
    minHeight: 480,
    alwaysOnTop: true,
    backgroundColor: '#0f1115',
    title: 'Candle Translator',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  ventana.loadFile(path.join(__dirname, 'index.html'));
  // Solo para pruebas: guarda una captura de la ventana y cierra.
  if (process.env.CT_CAPTURA) {
    ventana.webContents.on('console-message', e => console.log('[ventana]', e.message));
    setTimeout(async () => {
      if (process.env.CT_CLICK) await ventana.webContents.executeJavaScript(process.env.CT_CLICK);
      setTimeout(async () => {
        const img = await ventana.webContents.capturePage();
        require('fs').writeFileSync(process.env.CT_CAPTURA, img.toPNG());
        app.quit();
      }, 1500);
    }, +(process.env.CT_ESPERA || 12000));
  }
  // Los enlaces se abren en el navegador del usuario, nunca dentro del programa.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

async function pedirJSON(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Temporalidades en el formato de cada exchange
const TF_OKX = { '1m': '1m', '15m': '15m', '1h': '1H', '4h': '4H', '1d': '1Dutc' };

ipcMain.handle('velas', async (_e, { base, tf, limite, fuente }) => {
  if (fuente === 'okx') {
    const url = `https://www.okx.com/api/v5/market/candles?instId=${base}-USDT&bar=${TF_OKX[tf]}&limit=${Math.min(limite, 300)}`;
    const j = await pedirJSON(url);
    if (j.code !== '0' || !j.data?.length) throw new Error(j.msg || 'sin datos');
    return j.data.reverse().map(k => ({
      t: Math.floor(+k[0] / 1000), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], cerrada: k[8] === '1',
    }));
  }
  const url = `https://api.binance.com/api/v3/klines?symbol=${base}USDT&interval=${tf}&limit=${limite}`;
  const j = await pedirJSON(url);
  const ahora = Date.now();
  return j.map(k => ({
    t: Math.floor(k[0] / 1000), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], cerrada: k[6] < ahora,
  }));
});

ipcMain.handle('simbolos', async () => {
  try {
    const j = await pedirJSON('https://api.binance.com/api/v3/ticker/price');
    return j.map(x => x.symbol).filter(s => s.endsWith('USDT')).map(s => s.slice(0, -4)).sort();
  } catch {
    const j = await pedirJSON('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
    return j.data.filter(x => x.quoteCcy === 'USDT').map(x => x.baseCcy).sort();
  }
});

ipcMain.handle('version', () => app.getVersion());

ipcMain.handle('siempre-encima', (_e, valor) => {
  ventana.setAlwaysOnTop(!!valor);
  return ventana.isAlwaysOnTop();
});

// ---------- actualizaciones ----------
// Windows: se descarga sola y se instala al cerrar. Mac: solo avisa (Apple exige firma para actualizar solo).
function esMayor(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
const avisarVentana = datos => ventana?.webContents.send('actualizacion', datos);

if (process.platform === 'win32') {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', info => avisarVentana({ tipo: 'lista', version: info.version }));
  autoUpdater.on('error', () => {});
}

async function revisarActualizacion() {
  if (!app.isPackaged || !REPO || REPO.owner.startsWith('PENDIENTE')) return;
  if (process.platform === 'win32') return autoUpdater.checkForUpdates().catch(() => {});
  try {
    const j = await pedirJSON(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/releases/latest`);
    const v = (j.tag_name || '').replace(/^v/, '');
    if (v && esMayor(v, app.getVersion())) avisarVentana({ tipo: 'descargar', version: v, url: j.html_url });
  } catch {}
}

ipcMain.handle('reiniciar-actualizar', () => autoUpdater.quitAndInstall());
ipcMain.handle('abrir-descarga', (_e, url) => {
  if (/^https:\/\/github\.com\//.test(url)) shell.openExternal(url);
});

app.whenReady().then(() => {
  crearVentana();
  setTimeout(revisarActualizacion, 8000);
  setInterval(revisarActualizacion, 6 * 3600 * 1000);
});
app.on('window-all-closed', () => app.quit());
