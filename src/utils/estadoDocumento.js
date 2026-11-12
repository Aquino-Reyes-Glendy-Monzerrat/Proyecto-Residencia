
import { TIPO_OFICIO_COMPACTACION, TIPO_MEMO_COMPACTACION } from './oficioCompactacion.js'
// Reglas de estado que comparten Bitacora.vue y BitacoraSecApo.vue,
// para que "en corrección" o "comisión con cadena" signifiquen
// exactamente lo mismo en ambas pantallas.


export function esComisionConCadena(doc) {
    return doc.tipo === 'comision-externa' || (doc.tipo === 'comision-interna' && !!doc.campos?.para_jefe_depto)
}

export function enCorreccion(doc) {
    return doc.revisionJefeDepto === 'corregir' || !!doc.esperandoCorreccionSecretaria
}



// "Autorizado" que sí cierra el ciclo: una comisión con cadena que ya
// firmó la Subdirectora o el Director. Los demás documentos también
// quedan con estado 'autorizado' cuando se firman electrónicamente
// (firma del Jefe de Depto. al generarlos), pero eso no los cierra:
// se pueden editar, corregir y cancelar como siempre.
export function autorizadoPorCadena(doc) {
    return doc.estado === 'autorizado' && esComisionConCadena(doc)
}


// Oficios de Tutorías: se generan en lote y se corrigen solo desde el
// módulo Tutorías (corregir ahí y volver a generar). En las Bitácoras
// se ven, imprimen, comparten, cancelan y borran, pero no se editan ni
// se mandan a corregir: editarlos a mano los desligaría de su docente.
export function esOficioDeLote(doc) {
    return doc.tipo === 'tutorias'
}


// docs para rh

const TIPOS_PARA_RH = ['memorandum-solventacion-faltas', TIPO_OFICIO_COMPACTACION]

export function esTipoParaRH(tipo, enviarARH = false) {
    return TIPOS_PARA_RH.includes(tipo) || (tipo === TIPO_MEMO_COMPACTACION && !!enviarARH)
}

export function esParaRH(doc) {
    return esTipoParaRH(doc?.tipo, doc?.campos?.enviar_rh)
}

export function esperaEnvioRH(doc) {
    return esParaRH(doc) && doc.estado === 'pendiente_jefeDepto'
}


export function enviadoARH(doc) {
    return esParaRH(doc) && ['enviado_rh', 'aceptado_rh'].includes(doc.estado)
}


export function cicloCerrado(doc) {
    return autorizadoPorCadena(doc) || enviadoARH(doc)
}


export function estadoRH(doc) {
    return doc.estado === 'aceptado_rh'
        ? { texto: 'Aceptado por RH', color: 'success' }
        : { texto: 'En revisión de RH', color: 'info' }
}