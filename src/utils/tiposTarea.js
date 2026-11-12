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
    'Memorándum: Solventación de faltas': { ruta: 'memorandum', subtipo: 'memorandum-solventacion-faltas' },
    'Memorándum: Compactación (un docente)': { ruta: 'memorandum', subtipo: 'memorandum-compactacion-horario' },
    
    'Compactación concentrado (varios docentes)': { ruta: 'memorandum', subtipo: 'memorandum-compactacion-horario', modo: 'varios' },
    'Otros': { ruta: 'otros' },
    'Solicitud de Mantenimiento': { ruta: 'mantenimiento' },
    'Constancia de Tutoría': { ruta: 'constancia-creditos', subtipo: 'constancia-tutorado' },
    'Constancia de Actividad Complementaria': { ruta: 'constancia-creditos', subtipo: 'constancia-actividad' },
}





export function rutaParaTarea(entrada) {
    const t = TIPOS_TAREA[entrada.tipo] || TIPOS_TAREA_ANTERIORES[entrada.tipo]
    if (!t) return null
    const query = new URLSearchParams({ bitacoraId: entrada.id })
    if (t.subtipo) query.set('subtipo', t.subtipo)
    if (t.modo) query.set('modo', t.modo)
    return `/nuevo-documento/${t.ruta}?${query}`
}


// Una tarea sigue abierta mientras está pendiente o en elaboración y
// todavía no tiene documento ligado. Lo usan Bitacora, BitacoraSecApo
// y la campanita 
const TAREA_ABIERTA = ['pendiente', 'elaboracion']

export function esTareaAbierta(tarea) {
    return TAREA_ABIERTA.includes(tarea.estado) && !tarea.documentoId
}