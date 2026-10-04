// Reglas de estado que comparten Bitacora.vue y BitacoraSecApo.vue,
// para que "en corrección" o "comisión con cadena" signifiquen
// exactamente lo mismo en ambas pantallas.


export function esComisionConCadena(doc) {
    return doc.tipo === 'comision-externa' || (doc.tipo === 'comision-interna' && !!doc.campos?.para_jefe_depto)
}

export function enCorreccion(doc) {
    return doc.revisionJefeDepto === 'corregir' || !!doc.esperandoCorreccionSecretaria
}