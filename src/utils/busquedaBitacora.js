// busqueda de las bitacoras 

import { folioDelDocumento } from './folio.js'
const SOLO_NUMEROS = /^\d+$/

export function normalizarBusqueda(texto) {
    return String(texto ?? '').trim().toLowerCase()
}


export function coincideBusqueda(fila, q, { nombre = '', prefijo, anio } = {}) {
    if (!q) return true
    
    const c = fila.esTarea ? {} : (fila.campos || {})
    const folioVisible = (!fila.esTarea && folioDelDocumento(fila, prefijo, anio)) || String(fila.folio ?? '')
    const numeroControl = String(c.numero_control ?? '')

    if (SOLO_NUMEROS.test(q)) {
        
        const numeroFolio = c.numero_oficio || folioVisible.match(/(\d+)\D*$/)?.[1]
        return (numeroFolio != null && Number(numeroFolio) === Number(q))
            || (q.length >= 4 && numeroControl.includes(q))
    }

    return [folioVisible, nombre, numeroControl]
        .some(t => String(t ?? '').toLowerCase().includes(q))
}