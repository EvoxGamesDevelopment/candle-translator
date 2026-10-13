(() => {
// Todos los textos del programa, en español e inglés.
// Regla: describir lo que pasa, nunca decirle al usuario qué hacer.

const GLOSARIO = {
  es: {
    tendencia: 'Hacia dónde va el precio en esa temporalidad: de subida, de bajada o de lado.',
    piso: 'Soporte: precio donde antes se detuvo la caída porque aparecieron compradores.',
    techo: 'Resistencia: precio donde antes se frenó la subida porque aparecieron vendedores.',
    media: 'Media móvil: el precio promedio de las últimas velas. Suaviza el ruido para ver la dirección.',
    volumen: 'Cuánto se compró y vendió. Un movimiento con mucho volumen tiene más fuerza.',
    correccion: 'Bajada temporal dentro de una tendencia de subida.',
    rebote: 'Subida temporal dentro de una tendencia de bajada.',
    martillo: 'Vela que bajó mucho y se recuperó antes de cerrar: los compradores defendieron el precio.',
    hombre_colgado: 'Igual que el martillo, pero después de una subida: aviso de que los vendedores empiezan a aparecer.',
    estrella_fugaz: 'Vela que subió mucho y regresó antes de cerrar: los vendedores frenaron la subida.',
    martillo_invertido: 'Vela con mecha larga arriba después de una bajada: los compradores intentaron subir el precio.',
    envolvente_alcista: 'Vela verde que cubre por completo a la roja anterior: los compradores tomaron el control.',
    envolvente_bajista: 'Vela roja que cubre por completo a la verde anterior: los vendedores tomaron el control.',
    doji: 'Vela que abre y cierra casi en el mismo precio: indecisión entre compradores y vendedores.',
    temporalidad: 'El tiempo que representa cada vela: 15 minutos, 1 hora, 4 horas o 1 día.',
  },
  en: {
    tendencia: 'Where price is heading on that timeframe: up, down or sideways.',
    piso: 'Support: a price where earlier declines stopped because buyers stepped in.',
    techo: 'Resistance: a price where earlier rallies stalled because sellers stepped in.',
    media: 'Moving average: the average price of the latest candles. It smooths out noise to show direction.',
    volumen: 'How much was bought and sold. A move with high volume carries more strength.',
    correccion: 'A temporary decline within an uptrend.',
    rebote: 'A temporary rise within a downtrend.',
    martillo: 'A candle that dropped sharply and recovered before closing: buyers defended the price.',
    hombre_colgado: 'Same shape as a hammer, but after a rally: a warning that sellers are starting to appear.',
    estrella_fugaz: 'A candle that rose sharply and fell back before closing: sellers stopped the rally.',
    martillo_invertido: 'A candle with a long upper wick after a decline: buyers tried to push the price up.',
    envolvente_alcista: 'A green candle that fully covers the previous red one: buyers took control.',
    envolvente_bajista: 'A red candle that fully covers the previous green one: sellers took control.',
    doji: 'A candle that opens and closes at almost the same price: indecision between buyers and sellers.',
    temporalidad: 'The time each candle represents: 15 minutes, 1 hour, 4 hours or 1 day.',
  },
};

const T = {
  es: {
    buscar: 'Buscar cripto…',
    cargando: 'Leyendo velas…',
    error: 'No se pudo conectar con el exchange. Se reintentará en unos segundos.',
    retirada: b => `${b} ya no se opera en Binance ni en OKX. Elige otra cripto.`,
    fuenteRespaldo: 'Datos de OKX (Binance no respondió).',
    siempreEncima: 'Mantener la ventana siempre encima',
    explicar: 'Explícame más',
    ocultar: 'Ocultar explicación',
    piso: 'Piso', techo: 'Techo',
    avisos: 'Avisos',
    sinAvisos: 'Sin avisos por ahora.',
    nota: 'Explica lo que pasa en la gráfica; no es asesoría financiera. La decisión siempre es tuya.',
    oro: 'Sigue el precio del oro, pero no es idéntico: también se mueve en fin de semana, cuando el oro normal está cerrado.',
    hecho: 'by EVOX Games Development',
    versionLista: v => `La versión ${v} ya se descargó; se instalará al cerrar el programa.`,
    versionNueva: v => `Hay una versión nueva (${v}).`,
    reiniciar: 'Reiniciar ahora', descargar: 'Descargar',
    tf: { '15m': '15 min', '1h': '1 h', '4h': '4 h', '1d': 'Diario' },
    tendencia: { sube: 'de subida', baja: 'de bajada', lado: 'de lado' },
    tendenciaTip: {
      sube: (tf) => `▲ ${tf}: va de subida. En esta temporalidad el precio está arriba de su promedio y el promedio va subiendo.`,
      baja: (tf) => `▼ ${tf}: va de bajada. En esta temporalidad el precio está abajo de su promedio y el promedio va bajando.`,
      lado: (tf) => `▬ ${tf}: va de lado. No hay una dirección clara: el precio se mueve dentro de un rango.`,
    },
    casos: {
      todo_sube: ['Todo a favor de la subida.', 'Las cuatro temporalidades van de subida: el movimiento chico y el grande apuntan al mismo lado.'],
      todo_baja: ['Todo a favor de la bajada.', 'Las cuatro temporalidades van de bajada: el movimiento chico y el grande apuntan al mismo lado.'],
      correccion: ['Se contradicen: [correccion] dentro de una subida.', 'La tendencia grande (4 h y diario) sigue de subida; lo de las temporalidades chicas es una [correccion] dentro de esa subida.'],
      rebote: ['Se contradicen: [rebote] dentro de una bajada.', 'La tendencia grande (4 h y diario) sigue de bajada; lo de las temporalidades chicas es un [rebote] dentro de esa bajada.'],
      pausa_sube: ['Pausa dentro de una subida.', 'Lo grande todavía se inclina a la subida, pero sin fuerza: el precio está descansando.'],
      pausa_baja: ['Pausa dentro de una bajada.', 'Lo grande todavía se inclina a la bajada, pero sin fuerza: el precio está descansando.'],
      sin_direccion: ['Sin dirección clara.', 'Las temporalidades grandes están de lado: el mercado está en rango, esperando un motivo para moverse.'],
      mixto: ['Señales mezcladas.', 'Las temporalidades no se ponen de acuerdo: conviene leer cada una por separado.'],
    },
    decide: (p, t) => `Si respeta el [piso] de ${p}, la estructura se mantiene; si rompe el [techo] de ${t} o pierde ese piso, cambia la lectura.`,
    patrones: {
      martillo: 'Martillo', hombre_colgado: 'Hombre colgado', estrella_fugaz: 'Estrella fugaz',
      martillo_invertido: 'Martillo invertido', envolvente_alcista: 'Envolvente alcista',
      envolvente_bajista: 'Envolvente bajista', doji: 'Doji',
    },
    patronEn: (tf, nombre, clave) => `[${clave}|${nombre}] en ${tf}`,
    detalle: {
      titulo: tf => `En ${tf}`,
      tendencia: (t, precio, e20, e50) => ({
        sube: `Va de subida: la última vela cerró en ${precio}, arriba de su [media] corta (${e20}), que a su vez está arriba de la larga (${e50}).`,
        baja: `Va de bajada: la última vela cerró en ${precio}, abajo de su [media] corta (${e20}), que a su vez está abajo de la larga (${e50}).`,
        lado: `Va de lado: las [media|medias] (${e20} y ${e50}) están casi planas o cruzadas; no hay una dirección dominante.`,
      })[t],
      niveles: (p, tp, t, tt, dp, dt) => `El [piso] más cercano está en ${p} (${tp} ${tp === 1 ? 'vez' : 'veces'}, a ${dp}) y el [techo] en ${t} (${tt} ${tt === 1 ? 'vez' : 'veces'}, a ${dt}).`,
      volumen: v => v >= 1.8 ? `La última vela cerró con [volumen] alto (${v}× lo normal): el movimiento tuvo fuerza.`
        : v <= 0.6 ? `La última vela cerró con [volumen] bajo (${v}× lo normal): el movimiento fue sin ganas.`
        : `El [volumen] de la última vela es normal (${v}× el promedio).`,
      vigilar: (p, t) => `Qué vigilar: un cierre arriba de ${t} o abajo de ${p} en las temporalidades grandes.`,
    },
    alertas: {
      rompePiso: (tf, p) => `Rompió el piso de ${p} (${tf}).`,
      rompeTecho: (tf, p) => `Rompió el techo de ${p} (${tf}).`,
      brusco: c => `Movimiento brusco: ${c} en 3 minutos.`,
      volumen: (lado) => `Volumen muy alto en el último minuto: alguien está ${lado === 'compra' ? 'comprando' : 'vendiendo'} fuerte.`,
    },
  },
  en: {
    buscar: 'Search crypto…',
    cargando: 'Reading candles…',
    error: 'Could not reach the exchange. Retrying in a few seconds.',
    retirada: b => `${b} is no longer traded on Binance or OKX. Please choose another crypto.`,
    fuenteRespaldo: 'Data from OKX (Binance did not respond).',
    siempreEncima: 'Keep the window always on top',
    explicar: 'Explain more',
    ocultar: 'Hide explanation',
    piso: 'Support', techo: 'Resistance',
    avisos: 'Alerts',
    sinAvisos: 'No alerts right now.',
    nota: 'Explains what the chart shows; this is not financial advice. The decision is always yours.',
    oro: 'Tracks the price of gold but is not identical: it also trades on weekends, when regular gold markets are closed.',
    hecho: 'by EVOX Games Development',
    versionLista: v => `Version ${v} has been downloaded and will be installed when you close the app.`,
    versionNueva: v => `A new version is available (${v}).`,
    reiniciar: 'Restart now', descargar: 'Download',
    tf: { '15m': '15m', '1h': '1h', '4h': '4h', '1d': 'Daily' },
    tendencia: { sube: 'up', baja: 'down', lado: 'sideways' },
    tendenciaTip: {
      sube: (tf) => `▲ ${tf}: uptrend. On this timeframe price is above its average and the average is rising.`,
      baja: (tf) => `▼ ${tf}: downtrend. On this timeframe price is below its average and the average is falling.`,
      lado: (tf) => `▬ ${tf}: sideways. No clear direction: price is moving within a range.`,
    },
    casos: {
      todo_sube: ['Everything points up.', 'All four timeframes are in an uptrend: the short and long-term moves point the same way.'],
      todo_baja: ['Everything points down.', 'All four timeframes are in a downtrend: the short and long-term moves point the same way.'],
      correccion: ['Mixed: a [correccion|pullback] within an uptrend.', 'The bigger trend (4h and daily) is still up; the move on the shorter timeframes is a [correccion|pullback] within that uptrend.'],
      rebote: ['Mixed: a [rebote|bounce] within a downtrend.', 'The bigger trend (4h and daily) is still down; the move on the shorter timeframes is a [rebote|bounce] within that downtrend.'],
      pausa_sube: ['A pause within an uptrend.', 'The bigger picture still leans up, but without strength: price is consolidating.'],
      pausa_baja: ['A pause within a downtrend.', 'The bigger picture still leans down, but without strength: price is consolidating.'],
      sin_direccion: ['No clear direction.', 'The larger timeframes are moving sideways: the market is ranging, waiting for a reason to move.'],
      mixto: ['Mixed signals.', 'The timeframes disagree: it helps to read each one separately.'],
    },
    decide: (p, t) => `If ${p} [piso|support] holds, the structure stays intact; a break above ${t} [techo|resistance] or below that support changes the picture.`,
    patrones: {
      martillo: 'Hammer', hombre_colgado: 'Hanging man', estrella_fugaz: 'Shooting star',
      martillo_invertido: 'Inverted hammer', envolvente_alcista: 'Bullish engulfing',
      envolvente_bajista: 'Bearish engulfing', doji: 'Doji',
    },
    patronEn: (tf, nombre, clave) => `[${clave}|${nombre}] on ${tf}`,
    detalle: {
      titulo: tf => `On ${tf}`,
      tendencia: (t, precio, e20, e50) => ({
        sube: `Uptrend: the last candle closed at ${precio}, above its short [media|moving average] (${e20}), which in turn is above the long one (${e50}).`,
        baja: `Downtrend: the last candle closed at ${precio}, below its short [media|moving average] (${e20}), which in turn is below the long one (${e50}).`,
        lado: `Sideways: the [media|moving averages] (${e20} and ${e50}) are flat or crossed; no direction dominates.`,
      })[t],
      niveles: (p, tp, t, tt, dp, dt) => `Nearest [piso|support] is at ${p} (${tp} ${tp === 1 ? 'touch' : 'touches'}, ${dp} away) and [techo|resistance] at ${t} (${tt} ${tt === 1 ? 'touch' : 'touches'}, ${dt} away).`,
      volumen: v => v >= 1.8 ? `The last candle closed on high [volumen|volume] (${v}× normal): the move had strength.`
        : v <= 0.6 ? `The last candle closed on low [volumen|volume] (${v}× normal): the move lacked conviction.`
        : `[volumen|Volume] on the last candle is normal (${v}× average).`,
      vigilar: (p, t) => `What to watch: a close above ${t} or below ${p} on the larger timeframes.`,
    },
    alertas: {
      rompePiso: (tf, p) => `Broke the ${p} support (${tf}).`,
      rompeTecho: (tf, p) => `Broke the ${p} resistance (${tf}).`,
      brusco: c => `Sharp move: ${c} in 3 minutes.`,
      volumen: (lado) => `Very high volume in the last minute: someone is ${lado === 'compra' ? 'buying' : 'selling'} aggressively.`,
    },
  },
};

// Convierte "[clave]" o "[clave|texto]" en un término con su explicación al pasar el mouse.
function conGlosario(texto, idioma) {
  return texto.replace(/\[([a-z_]+)(?:\|([^\]]+))?\]/g, (_, clave, etiqueta) => {
    const def = GLOSARIO[idioma][clave] || '';
    const visible = etiqueta || ({ piso: 'piso', techo: 'techo', media: 'media móvil', volumen: 'volumen',
      correccion: 'corrección', rebote: 'rebote' }[clave] || clave);
    const seguro = def.replace(/"/g, '&quot;');
    return `<span class="tooltip tooltip-bottom" data-tip="${seguro}"><span class="termino">${visible}</span></span>`;
  });
}

window.Textos = { T, GLOSARIO, conGlosario };
})();
