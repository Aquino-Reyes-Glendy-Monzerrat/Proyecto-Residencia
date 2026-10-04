// Tipos que se pueden elegir al crear una tarea de Bitácora, y a qué
// formulario llevan. Aceptación/Terminación comparten formulario
// ('aceptacion' / 'terminacion') y se distinguen por subtipo; por eso
// no basta con el nombre de la ruta. Lo usan Bitacora y BitacoraSecApo.
export const TIPOS_TAREA = {
    'Comisión': { ruta: 'comision' },
    'Liberación de Proyecto': { ruta: 'liberacion-proyecto' },
    'Aceptación de Residencia': { ruta: 'aceptacion', subtipo: 'aceptacion-residencia' },
    'Aceptación Servicio Social': { ruta: 'aceptacion', subtipo: 'aceptacion-servicio-social' },
    'Terminación Servicio Social': { ruta: 'terminacion', subtipo: 'terminacion-servicio-social' },
    'Terminación de Residencia': { ruta: 'terminacion', subtipo: 'terminacion-residencia' },
    'Oficio de revisión': { ruta: 'revision-tesis' },
    'Memorándum': { ruta: 'memorandum' },
    'Otros': { ruta: 'otros' },
    'Solicitud de Mantenimiento': { ruta: 'mantenimiento' },
}

// URL del formulario para cumplir una tarea, o null si su tipo no
// existe (tarea vieja con un tipo que ya se quitó).
export function rutaParaTarea(entrada) {
    const t = TIPOS_TAREA[entrada.tipo]
    if (!t) return null
    const query = new URLSearchParams({ bitacoraId: entrada.id })
    if (t.subtipo) query.set('subtipo', t.subtipo)
    return `/nuevo-documento/${t.ruta}?${query}`
}