// Tipos reales guardados en doc.tipo: para el filtro "Tipo de
// documento" y la columna "Tipo" de las tablas. Distinto de
// TIPOS_TAREA (tiposTarea.js), que son los nombres cortos al crear una
// tarea. Lo usan Bitacora y BitacoraSecApo.
export const TIPOS_DOCUMENTO = [
    { valor: 'comision-externa', etiqueta: 'Comisión Externa' },
    { valor: 'comision-interna', etiqueta: 'Comisión Interna' },
    { valor: 'memorandum-solventacion-faltas', etiqueta: 'Memorándum: Solventación de Faltas' },
    { valor: 'memorandum-compactacion-horario', etiqueta: 'Memorándum: Compactación' },
    { valor: 'oficio-compactacion', etiqueta: 'Oficio de Compactación de Horario' },
    { valor: 'aceptacion-residencia', etiqueta: 'Aceptación de Residencia' },
    { valor: 'terminacion-residencia', etiqueta: 'Terminación de Residencia' },
    { valor: 'aceptacion-servicio-social', etiqueta: 'Aceptación Servicio Social' },
    { valor: 'terminacion-servicio-social', etiqueta: 'Terminación Servicio Social' },
    { valor: 'liberacion-proyecto', etiqueta: 'Liberación de Proyecto' },
    { valor: 'revision-tesis', etiqueta: 'Revisión de Tesis' },
    { valor: 'mantenimiento', etiqueta: 'Solicitud de Mantenimiento' },
    { valor: 'otros', etiqueta: 'Otros' },
    { valor: 'tutorias', etiqueta: 'Tutorías' },
    { valor: 'constancia-tutorado', etiqueta: 'Constancia de Tutoría' },
    { valor: 'constancia-actividad', etiqueta: 'Constancia de Actividad Complementaria' },
]

// Nombre legible de un doc.tipo; si no está en la lista, el tipo tal cual.
export function etiquetaTipo(tipo) {
    return TIPOS_DOCUMENTO.find(t => t.valor === tipo)?.etiqueta || tipo
}