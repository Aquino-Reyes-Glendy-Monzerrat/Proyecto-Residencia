
import { fechaLarga } from './fechas.js'
import { escaparHTML } from './html.js'

const primeraMinuscula = (texto) => texto.charAt(0).toLowerCase() + texto.slice(1)

export function textoIncidencia(tipo, fechaISO) {
    const tipoLimpio = (tipo || '').trim()
    const fecha = fechaLarga(fechaISO)
    if (!tipoLimpio && !fecha) return ''
    const que = tipoLimpio ? escaparHTML(primeraMinuscula(tipoLimpio)) : 'una incidencia'
    const cuando = fecha ? ` el día <strong>${fecha}</strong>` : ''
    return `presentó ${que}${cuando}, `
}