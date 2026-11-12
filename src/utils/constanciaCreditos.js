// para generar constancias de creditos complementarios

export const TIPO_CONSTANCIAS = 'constancia-creditos'      
export const SUBTIPO_TUTORIA = 'constancia-tutorado'      
export const SUBTIPO_ACTIVIDAD = 'constancia-actividad'   

export const CREDITOS_PERMITIDOS = Object.freeze([0.5, 1])


export const NIVELES_DESEMPENO = Object.freeze(['EXCELENTE', 'NOTABLE', 'BUENO', 'SUFICIENTE'])


export const MAX_DESCRIPCION = 200


export function creditosTexto(creditos) {
    const n = CREDITOS_PERMITIDOS.includes(Number(creditos)) ? Number(creditos) : 1
    return `${n} ${n === 1 ? 'crédito' : 'créditos'}`
}


export function actividadTexto(tipo, descripcion) {
    const partes = [tipo, descripcion].map(t => (t || '').trim()).filter(Boolean)
    return partes.join(': ').toLocaleUpperCase('es-MX')
}


export function desempenoTexto(nivel) {
    return NIVELES_DESEMPENO.includes(nivel) ? nivel : ''
}


export function valorNumericoTexto(valor) {
    if (valor === '' || valor === null || valor === undefined) return ''
    const n = Number(valor)
    return Number.isFinite(n) && n >= 0 ? String(n) : ''
}


export function motivoNoGenerarConstancia(campos, subtipo) {
    if (!campos?.numero_control) return 'Busca y selecciona al alumno.'
    if (!campos?.docente_tutor_id) {
        return subtipo === SUBTIPO_ACTIVIDAD ? 'Elige al docente responsable de la actividad.' : 'Elige al docente tutor.'
    }
    if (subtipo === SUBTIPO_ACTIVIDAD && !actividadTexto(campos.actividad_tipo, campos.descripcion_actividad)) {
        return 'Elige el tipo de actividad o escribe su descripción.'
    }
    return ''
}