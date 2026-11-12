
import { aFechaISO } from './fechas.js'
import { diaDeISO, nombreDelDia } from './periodosEstadistica.js'
import { SUBTIPO_TUTORIA, SUBTIPO_ACTIVIDAD } from './constanciaCreditos.js'
import { esComisionConCadena, autorizadoPorCadena, esperaEnvioRH } from './estadoDocumento.js'
export const TIPO_SOLVENTACION = 'memorandum-solventacion-faltas'
export const TIPO_COMISION_EXTERNA = 'comision-externa'
export const TIPO_COMISION_INTERNA = 'comision-interna'
export const ACTIVIDAD_TUTORIA = 'Tutoría'


export const SIN_TIPO = '__sin_tipo'
export const ETIQUETA_SIN_TIPO = 'Sin tipo'
const SIN_DOCENTE = { clave: '__sin_docente', nombre: 'Sin docente', grado: '' }


export function comoLista(respuesta) {
    if (Array.isArray(respuesta)) return respuesta
    if (Array.isArray(respuesta?.data)) return respuesta.data
    return []
}

const vigente = (doc) => doc.estado !== 'cancelado'

const memoEmitido = (doc) => vigente(doc) && !esperaEnvioRH(doc)

const texto = (valor) => String(valor ?? '').trim()


export function claveNombre(nombre) {
    return texto(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase()
}


export function crearBuscadorDocentes(docentes) {
    const porId = new Map(docentes.map(d => [String(d.id), d]))
    const porNombre = new Map(docentes.map(d => [claveNombre(d.nombre), d]))
    return function buscar({ id = null, nombre = '' }) {
        const d = (id !== null && id !== '' && porId.get(String(id))) || porNombre.get(claveNombre(nombre))
        if (d) return { clave: `d${d.id}`, nombre: d.nombre, grado: d.abreviatura || '' }
        const clave = claveNombre(nombre)
        return clave ? { clave: `n${clave}`, nombre: texto(nombre), grado: '' } : null
    }
}


function fechaDelOficio(doc) {
    return diaDeISO(doc.campos?.fecha_documento) ?? diaDeISO(aFechaISO(doc.fecha))
}


const docenteDestinatario = (c) => ({ nombre: c.nombre_solicitante || c.nombre_destinatario })

export function inasistenciasDe(documentos, buscarDocente) {
    return documentos
        .filter(doc => doc.tipo === TIPO_SOLVENTACION && memoEmitido(doc))
        .map(doc => {
            const c = doc.campos || {}
            return {
                id: doc.id,
                fecha: diaDeISO(c.fecha_incidencia) ?? fechaDelOficio(doc),
                tipo: texto(c.tipo_incidencia),
                docente: buscarDocente(docenteDestinatario(c)),
            }
        })
        .filter(e => e.fecha !== null && e.docente)
}


export function comisionFirmada(doc) {
    if (doc.estado === 'cancelado') return false
    return esComisionConCadena(doc) ? autorizadoPorCadena(doc) : !!doc.firmaElectronica
}

export function comisionesFirmadasDe(documentos, tipo, buscarDocente) {
    return documentos
        .filter(doc => doc.tipo === tipo && comisionFirmada(doc))
        .map(doc => {
            const c = doc.campos || {}
            return {
                id: doc.id,
                tipo,
                fecha: fechaDelOficio(doc),
                actividad: texto(c.tipo_actividad),
                destino: texto(c.ciudad_destino),
                docente: buscarDocente(docenteDestinatario(c)),
            }
        })
        .filter(e => e.fecha !== null && e.docente)
}

export function constanciasDe(documentos, buscarDocente) {
    return documentos
        .filter(doc => (doc.tipo === SUBTIPO_TUTORIA || doc.tipo === SUBTIPO_ACTIVIDAD) && vigente(doc))
        .map(doc => {
            const c = doc.campos || {}
            return {
                periodo: c.periodo_escolar,
                anio: Number(c.anio_escolar),
                actividad: doc.tipo === SUBTIPO_TUTORIA ? ACTIVIDAD_TUTORIA : texto(c.actividad_tipo),
                alumno: {
                    clave: texto(c.numero_control) || claveNombre(c.nombre_estudiante),
                    numeroControl: texto(c.numero_control),
                    nombre: texto(c.nombre_estudiante),
                },
                docente: buscarDocente({ id: c.docente_tutor_id, nombre: c.nombre_tutor }) || SIN_DOCENTE,
            }
        })
        .filter(x => x.alumno.clave && x.periodo && x.anio)
}



export const claveDeTipo = (tipo) => tipo || SIN_TIPO
export const etiquetaDeTipo = (clave) => (clave === SIN_TIPO ? ETIQUETA_SIN_TIPO : clave)

export function opcionesDeCatalogo(catalogo, valoresUsados, { primeros = [] } = {}) {
    const usados = valoresUsados.filter(Boolean)
    const unicos = [...new Set([...catalogo, ...usados])]
        .filter(v => !primeros.includes(v))
        .sort((a, b) => a.localeCompare(b, 'es'))
    return [
        ...primeros.map(v => ({ valor: v, etiqueta: v })),
        ...unicos.map(v => ({ valor: v, etiqueta: v })),
        { valor: SIN_TIPO, etiqueta: ETIQUETA_SIN_TIPO },
    ]
}



export const nombreConGrado = (docente) => [docente.grado, docente.nombre].filter(Boolean).join(' ')


export const etiquetaDeOpcion = (opciones, valor) => opciones.find(o => o.valor === valor)?.etiqueta ?? ''

export function opcionesDocentes(docentes, ...listas) {
    const mapa = new Map()
    for (const d of docentes) mapa.set(`d${d.id}`, { nombre: d.nombre, grado: d.abreviatura || '' })
    for (const lista of listas) {
        for (const x of lista) {
            if (x.docente && !mapa.has(x.docente.clave)) mapa.set(x.docente.clave, x.docente)
        }
    }
    return [...mapa]
        .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(([valor, d]) => ({ valor, etiqueta: nombreConGrado(d) }))
}



export const enPeriodo = (fecha, per) => fecha >= per.ini && fecha < per.fin

export function agruparPor(lista, claveDe) {
    const grupos = new Map()
    for (const x of lista) {
        const k = claveDe(x)
        if (!grupos.has(k)) grupos.set(k, [])
        grupos.get(k).push(x)
    }
    return grupos
}

export function alumnosDistintos(constancias) {
    return new Set(constancias.map(c => c.alumno.clave)).size
}


export function conteoOrdenado(grupos, { etiquetaDe = (k) => k, contar = (lista) => lista.length } = {}) {
    return [...grupos]
        .map(([clave, lista]) => ({ clave, etiqueta: etiquetaDe(clave), n: contar(lista) }))
        .sort((a, b) => b.n - a.n || a.etiqueta.localeCompare(b.etiqueta, 'es'))
}



export function barrasPorColumna(eventos, cols) {
    return cols.map(c => ({ etiqueta: c.etiqueta, valor: eventos.filter(e => enPeriodo(e.fecha, c)).length }))
}


function empatadosArriba(lista, valorDe = (x) => x.n) {
    return lista.filter(x => valorDe(x) === valorDe(lista[0]))
}


export function juntarNombres(nombres) {
    if (nombres.length <= 2) return nombres.join(' y ')
    return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`
}


export const masFrecuente = (conteo) => juntarNombres(empatadosArriba(conteo).map(x => x.etiqueta))


export function resumenPorMaestro(eventos, contar = (lista) => lista.length) {
    return [...agruparPor(eventos, e => e.docente.clave).values()]
        .map(lista => ({ ...lista[0].docente, total: contar(lista), lista }))
        .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'))
}


export function filasPorFecha(eventos, detalleDe) {
    return [...eventos]
        .sort((a, b) => b.fecha - a.fecha)
        .map((e, k) => ({ clave: e.id ?? k, titulo: nombreDelDia(e.fecha), detalle: detalleDe(e) }))
}