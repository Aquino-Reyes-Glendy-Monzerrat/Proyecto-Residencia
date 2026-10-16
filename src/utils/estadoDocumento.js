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