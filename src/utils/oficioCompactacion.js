// Concentrado de oficio de compactación para RH.
// Junta los memos de compactación que ya existen. Aquí no se da de alta
// a nadie, solo se elige quién va y se le ponen observaciones.
// El texto va fijo, no hay plantilla editable.
// Usado en OficioCompactacion.vue, VistaOficioCompactacion.vue y NuevoDocumento.vue.

export const TIPO_OFICIO_COMPACTACION = 'oficio-compactacion'
export const TIPO_MEMO_COMPACTACION = 'memorandum-compactacion-horario'

// A dónde ir para armar el oficio. `lote` (ids) y `fecha` preseleccionan
// los memos; `bitacoraId` lleva la tarea para que se cierre con el oficio.
export function rutaOficioCompactacion({ lote, fecha, bitacoraId } = {}) {
    const query = {}
    if (lote) query.lote = lote
    if (fecha) query.fecha = fecha
    if (bitacoraId) query.bitacoraId = bitacoraId
    return { path: `/nuevo-documento/${TIPO_OFICIO_COMPACTACION}`, query }
}

// Datos fijos para la plantilla (título y asunto para la Bitácora).
// No se guarda en BD porque el formato nunca cambia.
export const PLANTILLA_OFICIO_COMPACTACION = Object.freeze({
    tipo: TIPO_OFICIO_COMPACTACION,
    nombre: 'Oficio de compactación de horario',
    asunto: 'Oficio de Compactación de Horario',
    cuerpo: '',
})

export const TEXTO_INTRO = 'Por este medio me permito informarle que los docentes adscritos a este departamento, abajo enlistados, tendrán compactación de horario como se describe a continuación. Sin embargo, también deberá de observar lo siguiente:'

export const PUNTOS = Object.freeze([
    'Cubrir sus horas diarias reglamentarias.',
    'El horario por cubrir debe considerar los cursos comisionados.',
    'Coordinarse para cumplir con aquellas actividades académicas que estén bajo su responsabilidad o asignadas en academia.',
])

export const TEXTO_CIERRE = 'Sin más por el momento y agradeciendo de antemano la atención que brinde al presente, aprovecho para enviarle un cordial saludo.'

// Tope de caracteres para las observaciones. Si se pasa, la fila crece
// mucho y luego se rompe el acomodo en las hojas.
export const MAX_OBSERVACION = 250

// Compara fechas en formato 'AAAA-MM-DD'. Si el límite viene vacío, no aplica.
export function enRango(fecha, desde, hasta) {
    if (!fecha) return false
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
}

// Partículas que pueden ir dentro de un apellido (ej. "de la Cruz").
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa'])

// Saca el apellido del final de la lista, respetando las partículas.
// Ojo: siempre deja al menos una palabra (el nombre).
function tomarApellido(palabras) {
    const partes = [palabras.pop()]
    while (palabras.length > 1 && PARTICULAS.has(palabras[palabras.length - 1].toLowerCase())) {
        partes.unshift(palabras.pop())
    }
    return partes.join(' ')
}

// Pone los apellidos primero, para ordenar como en el oficio de RH.
export function apellidosPrimero(nombre) {
    const palabras = (nombre || '').trim().split(/\s+/).filter(Boolean)
    if (palabras.length < 3) return palabras.join(' ')
    const segundo = tomarApellido(palabras)
    const primero = palabras.length > 1 ? tomarApellido(palabras) : ''
    return [primero, segundo, ...palabras].filter(Boolean).join(' ')
}

// Filtra memos de compactación vigentes por rango de fechas y los ordena
// por apellido.
export function memosEnRango(documentos, desde, hasta) {
    const clave = (d) => apellidosPrimero(d.campos?.nombre_solicitante)
    return (documentos || [])
        .filter(d => d.tipo === TIPO_MEMO_COMPACTACION && d.estado !== 'cancelado'
            && enRango(d.campos?.fecha_documento, desde, hasta))
        .sort((a, b) => clave(a).localeCompare(clave(b), 'es'))
}

// Arma la fila de la tabla desde un memo.
// Se copian los datos a propósito: si luego editan el memo original, este
// oficio ya guardado no debe cambiar.
export function filaDesdeMemo(memo, folioTexto = '') {
    const c = memo.campos || {}
    return {
        memoId: String(memo.id),
        folio: folioTexto,
        nombre: (c.nombre_solicitante || '').trim(),
        hora_entrada: c.hora_entrada || '',
        hora_salida: c.hora_salida || '',
        fecha_inicio: c.fecha_inicio || '',
        fecha_fin: c.fecha_fin || '',
        observaciones: '',
        incluir: true,
    }
}

// Al recargar los memos, se actualizan los datos pero se respeta lo que
// el usuario ya había escrito (observaciones y el check de incluir).
export function combinarConPrevias(nuevas, previas) {
    const porMemo = new Map((previas || []).map(f => [f.memoId, f]))
    return nuevas.map(f => {
        const previa = porMemo.get(f.memoId)
        return previa ? { ...f, observaciones: previa.observaciones || '', incluir: previa.incluir !== false } : f
    })
}

export function filasIncluidas(filas) {
    return (filas || []).filter(f => f.incluir !== false)
}

// Quita el cero a la izquierda de la hora: '09:00' -> '9:00'
const sinCeroInicial = (hora) => (hora || '').replace(/^0(\d)/, '$1')

// Formato de horario para el oficio: '9:00 - 17:00'
export function horarioTexto(entrada, salida) {
    if (!entrada && !salida) return ''
    return `${sinCeroInicial(entrada)} - ${sinCeroInicial(salida)}`
}

// Devuelve el motivo por el que no se puede generar el oficio (o '' si sí se puede).
export function motivoNoGenerar(campos) {
    if (filasIncluidas(campos?.filas_compactacion).length === 0) {
        return 'Trae los memos de compactación y deja al menos un docente incluido.'
    }
    return ''
}

// Reparte las filas entre las hojas según lo que miden (en px).
//   util       -> espacio real disponible en la hoja
//   encabezado -> logo (va en todas las hojas)
//   inicio     -> texto de arriba (solo en la primera)
//   thead      -> encabezados de la tabla (solo en la primera)
//   filas[]    -> alto de cada fila
//   cierre     -> firma y C.c.p. (solo en la última)
// Regla: la firma nunca debe quedar sola en una hoja. Si el cierre no
// cabe, se arrastra la última fila junto con él a la siguiente página.
export function repartirEnHojas(alturas) {
    const { util, encabezado, inicio, thead, filas, cierre } = alturas
    const hojas = []
    let actual = { filas: [], primera: true }
    let usado = encabezado + inicio + thead

    filas.forEach((alto, i) => {
        if (actual.filas.length > 0 && usado + alto > util) {
            hojas.push(actual)
            actual = { filas: [], primera: false }
            usado = encabezado
        }
        actual.filas.push(i)
        usado += alto
    })

        if (usado + cierre > util && actual.filas.length > 0) {
       // Si el cierre no cabe, se pasa a la siguiente hoja
        const arrastradas = actual.filas.length > 1 ? actual.filas.splice(-1) : []
        hojas.push(actual)
        actual = { filas: arrastradas, primera: false }
    }
    hojas.push(actual)

    return hojas.map((h, i) => ({ ...h, ultima: i === hojas.length - 1 }))
}