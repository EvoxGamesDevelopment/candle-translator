// Lo único que la ventana puede pedirle al proceso principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ct', {
  velas: (base, tf, limite, fuente) => ipcRenderer.invoke('velas', { base, tf, limite, fuente }),
  simbolos: () => ipcRenderer.invoke('simbolos'),
  version: () => ipcRenderer.invoke('version'),
  siempreEncima: valor => ipcRenderer.invoke('siempre-encima', valor),
  alActualizar: cb => ipcRenderer.on('actualizacion', (_e, datos) => cb(datos)),
  reiniciarActualizar: () => ipcRenderer.invoke('reiniciar-actualizar'),
  abrirDescarga: url => ipcRenderer.invoke('abrir-descarga', url),
});
