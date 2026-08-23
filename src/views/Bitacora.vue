<script setup>

import AdminLayout from '../layout/AdminLayout.vue'

import { ref, computed, onMounted } from 'vue'

import { useRouter, useRoute } from 'vue-router'

import { Modal } from 'bootstrap'

import {
    getBitacora, agregarBitacora, getUsuarios, eliminarBitacora, actualizarBitacora,

    getDocumentos, actualizarDocumento, retroalimentarBitacora, cancelarDocumento,

    eliminarDocumento, getConfiguracion
} from '../services/api.js'
import { useSesion } from '../composables/UseSesion.js'
import { formatearFolio } from '@/utils/folio.js'
import CompartirAcciones from '@/components/CompartirAcciones.vue'

const router = useRouter()

const route = useRoute()

const { usuarioActivo } = useSesion()

const TIPO_A_RUTA = {
    'Comisión': 'comision',

    'Liberación de Proyecto': 'liberacion-proyecto',

    'Aceptación de Residencia': 'aceptacion-residencia',

    'Aceptación Servicio Social': 'aceptacion-servicio-social',

    'Terminación Servicio Social': 'terminacion-servicio-social',

    'Terminación de Residencia': 'terminacion-residencia',

    'Oficio de revisión': 'revision-tesis',

    'Memorándum': 'memorandum',

    'Otros': 'otros',
}

// Tipos reales guardados en doc.tipo — para el filtro y la
// columna "Tipo" de la tabla (distinto de TIPO_A_RUTA, que son
// los nombres cortos al crear una tarea).
const TIPOS_DOCUMENTO = [
    { valor: 'comision-externa', etiqueta: 'Comisión Externa' },
    { valor: 'comision-interna', etiqueta: 'Comisión Interna' },
    { valor: 'memorandum-solventacion-faltas', etiqueta: 'Memorándum — Solventación de Faltas' },
    { valor: 'memorandum-compactacion-horario', etiqueta: 'Memorándum — Compactación' },
    { valor: 'aceptacion-residencia', etiqueta: 'Aceptación de Residencia' },
    { valor: 'terminacion-residencia', etiqueta: 'Terminación de Residencia' },
    { valor: 'aceptacion-servicio-social', etiqueta: 'Aceptación Servicio Social' },
    { valor: 'terminacion-servicio-social', etiqueta: 'Terminación Servicio Social' },
    { valor: 'liberacion-proyecto', etiqueta: 'Liberación de Proyecto' },
    { valor: 'revision-tesis', etiqueta: 'Revisión de Tesis' },
    { valor: 'mantenimiento', etiqueta: 'Solicitud de Mantenimiento' },
    { valor: 'otros', etiqueta: 'Otros' },
    { valor: 'tutorias', etiqueta: 'Tutorías' },
]
function etiquetaTipo(tipo) {
    return TIPOS_DOCUMENTO.find(t => t.valor === tipo)?.etiqueta || tipo
}

const cargando = ref(true)

const entradas = ref([])

const documentos = ref([])

const usuarios = ref([])

const bitacoraPorDocumentoId = ref({})

const retroalimentandoId = ref(null)

const textoObservacion = ref('')

const nuevaEntrada = ref({ fecha: '', fechaCaducidad: '', descripcion: '', tipo: '', asignadoA: '' })

const editandoId = ref(null)

let modalInstancia = null

// Recarga todo desde el servidor tras cualquier acción — las filas
// de la tabla son copias, mutar el objeto local no las actualizaba.
async function cargarTodo() {
    cargando.value = true

    const todasTareas = await getBitacora()

    // Los ids son strings aleatorios, no sirven para ordenar —
    // creadoEn sí (más reciente primero).
    entradas.value = todasTareas.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0))

    usuarios.value = await getUsuarios()

    documentos.value = (await getDocumentos()).sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0))

    bitacoraPorDocumentoId.value = Object.fromEntries(
        todasTareas.filter(t => t.documentoId).map(t => [t.documentoId, t])
    )

    // Prefijo/año para armar el folio real ("P-050/2026") y poder
    // buscar por él, no solo por el interno (DOC-2026-002).
    const config = await getConfiguracion()
    prefijoFolio.value = config.folio?.prefijo_default || 'P'
    anioFolio.value = config.folio?.anio || new Date().getFullYear()

    cargando.value = false
}

onMounted(cargarTodo)

function faseDe(doc) {
    // Cancelado aplica a cualquier tipo — va primero para que un doc
    // normal cancelado no se quede atorado en fase 'normal'.
    if (doc.estado === 'cancelado') return doc.revisionJefeDepto === 'corregir' ? 'c' : 'x'

    if (doc.tipo === 'comision-externa') {
        if (doc.estado === 'pendiente_jefeDepto') {
            if (doc.revisionJefeDepto === 'corregir') return 'c'

            // Rechazo de Subdirectora/Director — fase aparte de
            // "Pendiente de tu revisión" (nunca revisado).
            if (doc.rechazadoPor) return 'r'

            return 'pendiente_jefeDepto'
        }

        return doc.estado // pendiente_subdirectora / pendiente_director / autorizado
    }

    if (!creadoPorSecretaria(doc) && !fueCompartido(doc)) return 'normal'
    if (doc.revisionJefeDepto === 'corregir') return 'c'
    if (doc.revisionJefeDepto === 'aprobado') return 'normal'
    // Necesita que Secretaria/Apoyo la haya enviado a revisión.
    if (!doc.solicitoRevision) return 'normal'
    return 'pendiente_jefeDepto'
}

const STAGE_META = {
    pendiente_jefeDepto: { texto: 'Pendiente de tu revisión', clase: 'bg-warning-subtle text-warning' },

    pendiente_subdirectora: { texto: 'Con la Subdirectora', clase: 'bg-info-subtle text-info' },

    pendiente_director: { texto: 'Con el Director', clase: 'bg-info-subtle text-info' },

    autorizado: { texto: 'Autorizado', clase: 'bg-success-subtle text-success' },

    c: { texto: 'Corrección solicitada', clase: 'bg-warning-subtle text-warning' },

    x: { texto: 'Cancelado', clase: 'bg-secondary-subtle text-secondary' },

    r: { texto: 'Rechazado', clase: 'bg-danger-subtle text-danger' },
}

const REVISIONES = {
    sin_revisar: { texto: 'Sin revisar', clase: 'bg-secondary-subtle text-secondary' },

    aprobado: { texto: 'Revisado y aprobado', clase: 'bg-success-subtle text-success' },

    corregir: { texto: 'Corrección solicitada', clase: 'bg-warning-subtle text-warning' },
}

// Si el documento lo creó el propio admin, no hay nada que revisar —
// no se muestra badge de revisión ni Aprobar/Retroalimentar.
function estadoBadge(doc) {
    const fase = faseDe(doc)
    if (fase === 'pendiente_jefeDepto' && doc.esperandoCorreccionSecretaria) {
        return { texto: 'Compartido\nesperando corrección', clase: 'bg-warning-subtle text-warning' }
    }
    if (fase !== 'normal') return STAGE_META[fase]
    // En fase 'normal' solo queda 'aprobado' o vacío — 'corregir' y
    // 'pendiente' ya se filtraron en fases anteriores.
    if (doc.revisionJefeDepto === 'aprobado') return REVISIONES.aprobado
    return { texto: 'Finalizado', clase: 'bg-success-subtle text-success' }
}

function creadoPorSecretaria(doc) {
    const creador = usuarios.value.find(u => String(u.id) === String(doc.creadoPor))

    return creador?.rol === 'secretaria' || creador?.rol === 'apoyo'
}

// Un compartido lo creó el Admin, pero si Secretaria/Apoyo lo editó
// igual necesita revisión del Jefe — por eso creadoPorSecretaria(doc)
// || fueCompartido(doc) siempre van juntas, nunca una sola.
function fueCompartido(doc) {
    return !!doc.visibleParaSecretaria
}

// Si la tarea ligada ya está asignada a quien ve la pantalla,
// "regresársela a la Secretaria" no tiene caso.
function esTareaPropia(fila) {
    return String(bitacoraPorDocumentoId.value[fila.id]?.asignadoA) === String(usuarioActivo?.id)
}

// Solo para docs que el Admin creó directo, sin tarea de Bitácora —
// es el único caso donde Secretaria/Apoyo no se enterarían solas.
// Da Ver+Editar; Cancelar/Eliminar siguen exclusivos del Admin/Jefe
// de Depto por cadena de mando.
function puedeCompartir(doc) {
    return !bitacoraPorDocumentoId.value[doc.id] && !creadoPorSecretaria(doc)
}

// Interruptor puro: solo cambia Ver+Editar. Nunca pide nota ni toca
// el estado — para eso está "Pedir corrección" aparte.
async function alternarCompartir(doc) {
    const activar = !doc.visibleParaSecretaria
    const cambios = { visibleParaSecretaria: activar }
    if (!activar) {
        // Ya no aplica ninguna corrección pendiente.
        cambios.esperandoCorreccionSecretaria = false
    }
    await actualizarDocumento(doc.id, cambios)
    await cargarTodo()
}

// Solo tiene sentido si ya está compartido y no está Autorizado.
function puedeCorregir(doc) {
    return !!doc.visibleParaSecretaria && doc.estado !== 'autorizado'
}

// Repetible cuantas veces haga falta. Si estaba con la Subdirectora/
// Director, se jala a Pendiente del Jefe de una vez (evita que la
// autoricen con el error todavía sin corregir). Limpia cualquier
// nota/motivo viejo para que solo se vea la instrucción vigente.
async function pedirCorreccion(doc) {
    const nota = prompt('¿Qué hay que corregir?')
    if (nota === null) return // canceló el cuadro de texto, no se manda nada
    if (!nota.trim()) {
        alert('Escribe qué hay que corregir antes de continuar')
        return
    }
    const cambios = {
        notaAlCompartir: nota.trim(),
        esperandoCorreccionSecretaria: true,
        motivoCancelacion: '',
        observaciones: '',
        observacionJefeDepto: '',
    }
    if (doc.tipo === 'comision-externa' &&
        (doc.estado === 'pendiente_subdirectora' || doc.estado === 'pendiente_director')) {
        cambios.estado = 'pendiente_jefeDepto'
    }
    await actualizarDocumento(doc.id, cambios)
    await cargarTodo()
}

function nombreUsuario(id) {
    return usuarios.value.find(u => String(u.id) === String(id))?.nombre || '—'
}

function personaRelevante(doc) {
    return doc.campos?.nombre_destinatario || doc.campos?.nombre_estudiante || doc.asunto || '—'
}

// Descripción original de la tarea, aunque el documento ya tenga
// folio. Si no hay tarea ligada, no hay nada que mostrar.
function descripcionDe(doc) {
    return bitacoraPorDocumentoId.value[doc.id]?.descripcion || '—'
}

// Fechas creada/caducidad de la tarea, aparte de la del documento.
function fechaTareaDe(doc) {
    return bitacoraPorDocumentoId.value[doc.id] || null
}

const personasAsignables = computed(() =>

    usuarios.value.filter(u =>

        (u.rol === 'secretaria' || u.rol === 'apoyo' || u.rol === 'admin') && u.estado === 'activo'
    )
)

const ROLES_CREADOR = [
    { valor: 'admin', etiqueta: 'Admin' },

    { valor: 'secretaria', etiqueta: 'Secretaria' },

    { valor: 'apoyo', etiqueta: 'Apoyo' },
]

function rolDe(id) {
    return usuarios.value.find(u => String(u.id) === String(id))?.rol
}

// activeStage vive sincronizado con la URL (?fase=...) — así el
// filtro sigue puesto al volver de VerDocumento.vue.
const activeStage = ref(route.query.fase || null)

const filtroTipo = ref('')

const filtroEstadoTarea = ref('')

const creadorFiltro = ref('todos')

const busqueda = ref('')
// Para armar el folio real ("P-050/2026") y buscar por él.
const prefijoFolio = ref('P')
const anioFolio = ref(new Date().getFullYear())

const fechaDesde = ref('')

const fechaHasta = ref('')

function toggleStage(valor) {
    activeStage.value = activeStage.value === valor ? null : valor

    router.replace({ query: { ...route.query, fase: activeStage.value || undefined } })
}

const TAREA_ABIERTA = ['pendiente', 'elaboracion']

const tareasAbiertas = computed(() => entradas.value.filter(e => TAREA_ABIERTA.includes(e.estado) && !e.documentoId))

const tareasEliminadas = computed(() => entradas.value.filter(e => e.estado === 'eliminado'))

function parseFecha(str) {
    if (!str) return null

    if (str.includes('/')) {
        const [d, m, y] = str.split('/')

        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    }

    return new Date(str)
}

const conteos = computed(() => ({
    tareas: tareasAbiertas.value.length,

    // Con esperandoCorreccionSecretaria prendida no cuenta como
    // pendiente — todavía no hay nada que revisar, es turno de ella.
    pendiente_jefeDepto: documentos.value.filter(d => faseDe(d) === 'pendiente_jefeDepto' && !d.esperandoCorreccionSecretaria).length,

    r: documentos.value.filter(d => faseDe(d) === 'r').length,

    pendiente_subdirectora: documentos.value.filter(d => faseDe(d) === 'pendiente_subdirectora').length,

    pendiente_director: documentos.value.filter(d => faseDe(d) === 'pendiente_director').length,

    autorizado: documentos.value.filter(d => faseDe(d) === 'autorizado').length,

    c: documentos.value.filter(d => faseDe(d) === 'c').length,

    x: documentos.value.filter(d => faseDe(d) === 'x').length,

    eliminado: tareasEliminadas.value.length,
}))

const filasVisibles = computed(() => {
    // "Eliminado" es un carril aparte, no convive con el resto.
    if (activeStage.value === 'eliminado') {
        return tareasEliminadas.value.map(e => ({ esTarea: true, ...e }))
    }

    // Chip "Pendientes" — todas las tareas abiertas, sin desplegable.
    if (activeStage.value === 'tareas') {
        return tareasAbiertas.value.map(e => ({ esTarea: true, ...e }))
    }

    if (filtroEstadoTarea.value === 'finalizado') {
        // No exige tarea ligada — un doc creado directo también
        // puede estar "Finalizado".
        return documentos.value
            .filter(d => d.tipo !== 'comision-externa' && faseDe(d) === 'normal' && d.revisionJefeDepto !== 'aprobado')
            .map(d => ({ esTarea: false, ...d, fase: faseDe(d) }))
    }

    let filas

    if (filtroEstadoTarea.value === 'pendiente' || filtroEstadoTarea.value === 'elaboracion') {
        filas = tareasAbiertas.value.filter(e => e.estado === filtroEstadoTarea.value).map(e => ({ esTarea: true, ...e }))
    } else {
        filas = [
            ...tareasAbiertas.value.map(e => ({ esTarea: true, ...e })),

            ...documentos.value.map(d => ({ esTarea: false, ...d, fase: faseDe(d) })),
        ]

        if (activeStage.value) {
            filas = filas.filter(f => !f.esTarea && f.fase === activeStage.value &&
                !(activeStage.value === 'pendiente_jefeDepto' && f.esperandoCorreccionSecretaria))
        }
    }

    if (creadorFiltro.value !== 'todos') {
        filas = filas.filter(f => !f.esTarea && rolDe(f.creadoPor) === creadorFiltro.value)
    }

    if (filtroTipo.value) {
        filas = filas.filter(f => f.tipo === filtroTipo.value)
    }

    if (busqueda.value.trim()) {
        const q = busqueda.value.trim().toLowerCase()

        filas = filas.filter(f => {
            const folio = (f.folio || '').toLowerCase()

            const nombre = f.esTarea ? f.descripcion?.toLowerCase() : personaRelevante(f).toLowerCase()

            // Folio real impreso ("P-050/2026"), no el interno —
            // buscar "50" o "P-050/2026" da el mismo resultado.
            const oficioTexto = (!f.esTarea && f.campos?.numero_oficio)
                ? formatearFolio(f.campos.numero_oficio, prefijoFolio.value, anioFolio.value).toLowerCase()
                : ''
            const folioMantenimiento = (!f.esTarea && f.campos?.folio_mantenimiento || '').toLowerCase()

            return folio.includes(q) || (nombre || '').includes(q) || oficioTexto.includes(q) || folioMantenimiento.includes(q)
        })
    }

    const desde = fechaDesde.value ? parseFecha(fechaDesde.value) : null

    const hasta = fechaHasta.value ? parseFecha(fechaHasta.value) : null

    if (desde || hasta) {
        filas = filas.filter(f => {
            const fecha = parseFecha(f.fecha)

            if (!fecha) return false

            if (desde && fecha < desde) return false

            if (hasta && fecha > hasta) return false

            return true
        })
    }

    return filas
})

function verDocumento(doc) {
    router.push(`/bitacorasecapo/ver/${doc.id}`)
}

// Para tareas que el admin se asignó a sí mismo (personasAsignables).
function irACrearDocumento(entrada) {
    const rutaTipo = TIPO_A_RUTA[entrada.tipo]

    if (!rutaTipo) {
        alert(`No se encontró a qué formulario corresponde el tipo "${entrada.tipo}".`)

        return
    }

    router.push(`/nuevo-documento/${rutaTipo}?bitacoraId=${entrada.id}`)
}

function editarDocumento(doc) {
    if (!doc.tipoRuta) {
        alert('No se encontró la plantilla de este documento.')

        return
    }

    router.push(`/nuevo-documento/${doc.tipoRuta}/editar/${doc.id}`)
}

async function aprobarDocumento(doc) {
    if (!confirm(`¿Aprobar ${doc.folio || doc.id}${doc.tipo === 'comision-externa' && doc.estado === 'pendiente_jefeDepto' ? ' y enviarlo a la Subdirectora' : ''}?`)) return

    const cambios = { revisionJefeDepto: 'aprobado' }

    if (doc.tipo === 'comision-externa' && doc.estado === 'pendiente_jefeDepto') {
        cambios.estado = 'pendiente_subdirectora'
    }

    await actualizarDocumento(doc.id, cambios)

    await cargarTodo()
}

function abrirRetroalimentacion(doc) {
    retroalimentandoId.value = doc.id

    // Prellenar el motivo de cancelación solo si es SU PROPIO doc.
    const esPropio = String(doc.creadoPor) === String(usuarioActivo?.id)
    textoObservacion.value = esPropio ? (doc.motivoCancelacion || '') : ''
}

function cerrarRetroalimentacion() {
    retroalimentandoId.value = null

    textoObservacion.value = ''
}

async function confirmarRetroalimentacion(doc) {
    if (!textoObservacion.value.trim()) {
        alert('Escribe qué hay que corregir antes de continuar')

        return
    }

    const nota = textoObservacion.value.trim()

    const tarea = bitacoraPorDocumentoId.value[doc.id]

    await actualizarDocumento(doc.id, { revisionJefeDepto: 'corregir', observacionJefeDepto: nota })

    if (tarea) {
        await retroalimentarBitacora(tarea.id, nota)
    }

    cerrarRetroalimentacion()

    await cargarTodo()

    alert('Documento enviado a la secretaría para corrección')
}

async function cancelarDoc(doc) {
    if (doc.estado === 'autorizado') {
        if (!confirm(`${doc.folio} ya fue autorizado por el Director. ¿Seguro que quieres cancelarlo?`)) return

        if (!confirm('Confirma una vez más: esto invalida un documento ya autorizado. ¿Continuar?')) return
    }

    const motivo = prompt(`¿Por qué se cancela el documento ${doc.folio}? (opcional)`)

    if (motivo === null) return

    await cancelarDocumento(doc.id, motivo.trim())

    await cargarTodo()
}

async function borrarComisionCancelada(doc) {
    if (!confirm(`¿Eliminar definitivamente el documento ${doc.folio}? Esta acción no se puede deshacer.`)) return

    const tarea = bitacoraPorDocumentoId.value[doc.id]

    await eliminarDocumento(doc.id)

    if (tarea) {
        // Borrar solo desaparece doc+tarea, sin rama que archive.
        await eliminarBitacora(tarea.id)
    }

    await cargarTodo()
}

async function borrarDocumentoNormal(doc) {
    if (!confirm(`¿Eliminar definitivamente ${doc.folio || doc.id}? Esta acción no se puede deshacer.`)) return

    const tarea = bitacoraPorDocumentoId.value[doc.id]

    await eliminarDocumento(doc.id)

    if (tarea) {
        // Borrar solo desaparece doc+tarea, sin rama que archive.
        await eliminarBitacora(tarea.id)
    }

    await cargarTodo()
}

async function borrarTarea(entrada) {
    if (!confirm(`¿Eliminar la tarea "${entrada.descripcion}"? Esta acción no se puede deshacer.`)) return

    await eliminarBitacora(entrada.id)

    await cargarTodo()
}

function abrirModal() {
    const modalEl = document.getElementById('modalNuevaEntrada')

    modalInstancia = new Modal(modalEl)

    modalInstancia.show()
}

function editarTarea(entrada) {
    editandoId.value = entrada.id

    nuevaEntrada.value = {
        fecha: entrada.fecha,

        fechaCaducidad: entrada.fechaCaducidad === '—' ? '' : entrada.fechaCaducidad,

        descripcion: entrada.descripcion,

        tipo: entrada.tipo,

        asignadoA: entrada.asignadoA || ''
    }

    abrirModal()
}

function cerrarModal() {
    if (modalInstancia) modalInstancia.hide()

    nuevaEntrada.value = { fecha: '', fechaCaducidad: '', descripcion: '', tipo: '', asignadoA: '' }

    editandoId.value = null
}

async function guardarTarea() {
    if (!nuevaEntrada.value.fecha || !nuevaEntrada.value.descripcion || !nuevaEntrada.value.tipo) {
        alert('Por favor completa todos los campos requeridos')

        return
    }

    const datos = {
        fecha: nuevaEntrada.value.fecha,

        fechaCaducidad: nuevaEntrada.value.fechaCaducidad || '—',

        descripcion: nuevaEntrada.value.descripcion,

        tipo: nuevaEntrada.value.tipo,

        asignadoA: nuevaEntrada.value.asignadoA || null,
    }

    if (editandoId.value) {
        await actualizarBitacora(editandoId.value, datos)
    } else {
        await agregarBitacora({ ...datos, creadoPor: usuarioActivo?.id })
    }

    cerrarModal()

    await cargarTodo()
}

</script>

<template>

    <AdminLayout>
        <div class="panel p-3 my-0">

            <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">

                <button type="button" class="btn btn-primary btn-sm" @click="abrirModal">

                    <i class="bi bi-plus-square-fill"></i> Nuevo

                </button>

                <div class="d-flex flex-wrap gap-1">

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'tareas' ? 'btn-warning' : 'btn-outline-warning'"
                        @click="toggleStage('tareas')">
                        Pendientes <span class="badge bg-white text-dark ms-1">{{ conteos.tareas }}</span>
                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'pendiente_jefeDepto' ? 'btn-warning' : 'btn-outline-warning'"
                        @click="toggleStage('pendiente_jefeDepto')">

                        Pendiente revisión <span class="badge bg-white text-dark ms-1">{{ conteos.pendiente_jefeDepto
                        }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'r' ? 'btn-danger' : 'btn-outline-danger'" @click="toggleStage('r')">

                        ⚠ Rechazados <span class="badge bg-white text-dark ms-1">{{ conteos.r }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'pendiente_subdirectora' ? 'btn-info' : 'btn-outline-info'"
                        @click="toggleStage('pendiente_subdirectora')">

                        Con Subdirectora <span class="badge bg-white text-dark ms-1">{{ conteos.pendiente_subdirectora
                        }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'pendiente_director' ? 'btn-info' : 'btn-outline-info'"
                        @click="toggleStage('pendiente_director')">

                        Con Director <span class="badge bg-white text-dark ms-1">{{ conteos.pendiente_director }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'autorizado' ? 'btn-success' : 'btn-outline-success'"
                        @click="toggleStage('autorizado')">

                        Autorizado <span class="badge bg-white text-dark ms-1">{{ conteos.autorizado }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'c' ? 'btn-warning' : 'btn-outline-warning'" @click="toggleStage('c')">

                        ✎ En corrección <span class="badge bg-white text-dark ms-1">{{ conteos.c }}</span>

                    </button>

                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'x' ? 'btn-danger' : 'btn-outline-danger'" @click="toggleStage('x')">

                        ✕ Cancelados <span class="badge bg-white text-dark ms-1">{{ conteos.x }}</span>

                    </button>

                </div>

            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">

                <input type="text" class="form-control form-control-sm" style="max-width:260px;"
                    placeholder="Buscar por número de oficio o nombre…" v-model="busqueda">

                <select class="form-select form-select-sm" style="max-width:220px;" v-model="filtroTipo">

                    <option value="">Tipo de documento: todos</option>

                    <option v-for="t in TIPOS_DOCUMENTO" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>

                </select>

                <select class="form-select form-select-sm" style="max-width:220px;" v-model="filtroEstadoTarea">

                    <option value="">Estado de la tarea: todos</option>

                    <option value="pendiente">Pendiente</option>

                    <option value="elaboracion">En elaboración</option>

                    <option value="finalizado">Finalizado</option>

                </select>

                <div class="d-flex align-items-center gap-1">

                    <label class="small text-muted mb-0">Desde</label>

                    <input type="date" class="form-control form-control-sm" v-model="fechaDesde">

                    <label class="small text-muted mb-0">Hasta</label>

                    <input type="date" class="form-control form-control-sm" v-model="fechaHasta">

                </div>

            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-2">

                <span class="small text-muted fw-semibold text-uppercase">Creado por:</span>

                <button type="button" class="btn btn-sm"
                    :class="creadorFiltro === 'todos' ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="creadorFiltro = 'todos'">Todos</button>

                <button v-for="r in ROLES_CREADOR" :key="r.valor" type="button" class="btn btn-sm"
                    :class="creadorFiltro === r.valor ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="creadorFiltro = r.valor">{{ r.etiqueta }}</button>

            </div>

        </div>

        <div v-if="cargando" class="text-center py-5"><span class="spinner-border"></span></div>

        <section v-else class="panel">

            <div class="table-responsive">

                <table class="table align-middle mb-0">

                    <thead>

                        <tr>

                            <th>Folio</th>

                            <th>Fecha</th>

                            <th>Tipo</th>

                            <th>Nombre</th>

                            <th>Descripción</th>

                            <th>Estado</th>

                            <th>Responsable</th>

                            <th>Acciones</th>

                        </tr>

                    </thead>

                    <tbody>

                        <tr v-for="fila in filasVisibles.filter(f => f.esTarea)" :key="'t' + fila.id">

                            <td class="text-muted small">—</td>

                            <td><span class="text-muted small">{{ fila.fecha }}</span>

                                <br><span class="text-muted small">caduca {{ fila.fechaCaducidad }}</span>
                            </td>

                            <td>{{ fila.tipo }}</td>

                            <td class="text-muted">—</td>

                            <td>{{ fila.descripcion }}</td>

                            <td>

                                <span v-if="fila.estado === 'pendiente'"
                                    class="badge bg-warning-subtle text-warning">Pendiente</span>

                                <span v-else-if="fila.estado === 'elaboracion'"
                                    class="badge bg-primary-subtle text-primary">En elaboración</span>

                                <span v-else class="badge bg-secondary-subtle text-secondary">{{ fila.estado }}</span>

                            </td>

                            <td>{{ fila.asignadoA ? nombreUsuario(fila.asignadoA) : '—' }}</td>

                            <td>

                                <div class="d-flex gap-1">

                                    <button
                                        v-if="fila.estado !== 'eliminado' && String(fila.asignadoA) === String(usuarioActivo?.id)"
                                        class="btn btn-sm btn-outline-success" title="Crear documento"
                                        @click="irACrearDocumento(fila)">

                                        <i class="bi bi-file-earmark-plus"></i>

                                    </button>

                                    <button v-if="usuarioActivo?.rol === 'admin' && fila.estado !== 'eliminado'"
                                        class="btn btn-sm btn-outline-secondary" title="Editar tarea"
                                        @click="editarTarea(fila)"><i class="bi bi-pencil"></i></button>

                                    <button v-if="usuarioActivo?.rol === 'admin'" class="btn btn-sm btn-outline-danger"
                                        title="Borrar" @click="borrarTarea(fila)"><i class="bi bi-trash"></i></button>

                                </div>

                            </td>

                        </tr>

                        <tr v-for="fila in filasVisibles.filter(f => !f.esTarea)" :key="'d' + fila.id">

                            <td><span class="folio-text">{{ fila.folio }}</span><br><span class="text-muted small">{{
                                fila.fecha }}</span></td>

                            <td>

                                <template v-if="fechaTareaDe(fila)">

                                    <span class="text-muted small">{{ fechaTareaDe(fila).fecha }}</span>

                                    <br><span class="text-muted small">caduca {{ fechaTareaDe(fila).fechaCaducidad
                                    }}</span>

                                </template>

                                <span v-else class="text-muted small">—</span>

                            </td>

                            <td>{{ fila.tipo === 'comision-externa' ? 'Comisión Externa' : etiquetaTipo(fila.tipo) }}</td>

                            <td>{{ personaRelevante(fila) }}</td>

                            <td class="text-muted small">{{ descripcionDe(fila) }}</td>

                            <td>

                                <span v-if="estadoBadge(fila)" class="badge" :class="estadoBadge(fila).clase"
                                    style="white-space: pre-line;">

                                    {{ estadoBadge(fila).texto }}

                                </span>

                                <span v-else class="text-muted small">—</span>

                                <div v-if="fila.fase === 'r'" class="small text-danger mt-1">

                                    <strong>{{ fila.rechazadoPor }}</strong> no lo autorizó: {{ fila.observaciones }}

                                </div>

                                <div v-if="fila.fase === 'x' && fila.motivoCancelacion" class="small text-muted mt-1">

                                    Motivo: {{ fila.motivoCancelacion }}

                                </div>

                            </td>

                            <td>{{ fila.creadoPor ? nombreUsuario(fila.creadoPor) : '—' }}</td>

                            <td>

                                <div v-if="retroalimentandoId === fila.id" style="min-width:220px;">

                                    <textarea class="form-control form-control-sm mb-1" rows="2"
                                        v-model="textoObservacion" placeholder="¿Qué hay que corregir?"></textarea>

                                    <div class="d-flex gap-1">

                                        <button class="btn btn-sm btn-outline-secondary flex-fill"
                                            @click="cerrarRetroalimentacion">Cerrar</button>

                                        <button class="btn btn-sm btn-warning flex-fill"
                                            @click="confirmarRetroalimentacion(fila)">Enviar</button>

                                    </div>

                                </div>

                                <div v-else class="d-flex flex-wrap gap-1">

                                    <button class="btn btn-sm btn-outline-secondary" title="Ver"
                                        @click="verDocumento(fila)"><i class="bi bi-eye"></i></button>

                                    <template v-if="fila.fase === 'pendiente_jefeDepto'">

                                        <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                        <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                            :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                            @corregir="pedirCorreccion(fila)" />

                                        <!-- Mientras espera la corrección de Secretaria, no hay
                                             nada que Aprobar/Corregir todavía — se avisa en la
                                             columna Estado (ver estadoBadge), aquí no hace falta
                                             repetirlo. -->
                                        <template v-if="!fila.esperandoCorreccionSecretaria">
                                            <button v-if="creadoPorSecretaria(fila) || fueCompartido(fila)"
                                                class="btn btn-sm btn-outline-success" title="Aprobar"
                                                @click="aprobarDocumento(fila)"><i
                                                    class="bi bi-check-lg"></i></button>

                                            <!-- Ya compartido → "Pedir corrección" (arriba, mismo
                                                 ícono) hace exactamente esto mismo. Repetirlo aquí
                                                 sería el mismo botón dos veces con nombre distinto. -->
                                            <button v-if="!fila.visibleParaSecretaria"
                                                class="btn btn-sm btn-outline-warning" title="Corregir"
                                                @click="abrirRetroalimentacion(fila)"><i
                                                    class="bi bi-chat-left-text"></i></button>
                                        </template>

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                    </template>

                                    <!-- Rechazado: se corrige (Editar) y se reenvía solo, o se

                                         regresa a la Secretaria con nota, o se cancela — a

                                         propósito SIN Aprobar (reenviarlo sin cambiar nada casi

                                         seguro se vuelve a rechazar) y SIN Eliminar directo (el

                                         único camino a borrar sigue siendo Cancelados). -->

                                    <template v-else-if="fila.fase === 'r'">

                                        <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                        <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                            :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                            @corregir="pedirCorreccion(fila)" />

                                        <button v-if="!esTareaPropia(fila)" class="btn btn-sm btn-outline-warning"
                                            title="Regresar a la Secretaria" @click="abrirRetroalimentacion(fila)"><i
                                                class="bi bi-arrow-return-left"></i></button>

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                    </template>

                                    <template
                                        v-else-if="fila.fase === 'pendiente_subdirectora' || fila.fase === 'pendiente_director'">

                                        <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                        <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                            :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                            @corregir="pedirCorreccion(fila)" />

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                    </template>

                                    <template v-else-if="fila.fase === 'autorizado'">

                                        <button class="btn btn-sm btn-outline-primary" disabled
                                            title="Disponible cuando esté conectada la firma digital"><i
                                                class="bi bi-download"></i></button>

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                    </template>

                                    <template v-else-if="fila.fase === 'x'">

                                        <template v-if="fila.tipo === 'comision-externa'">

                                            <button class="btn btn-sm btn-outline-secondary"
                                                title="Editar y reenviar yo" @click="editarDocumento(fila)"><i
                                                    class="bi bi-pencil"></i></button>

                                            <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                                :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                                @corregir="pedirCorreccion(fila)" />

                                            <button v-if="bitacoraPorDocumentoId[fila.id] && !esTareaPropia(fila)"
                                                class="btn btn-sm btn-outline-warning" title="Regresar a la Secretaria"
                                                @click="abrirRetroalimentacion(fila)"><i
                                                    class="bi bi-arrow-return-left"></i></button>

                                            <button class="btn btn-sm btn-outline-danger" title="Borrar"
                                                @click="borrarComisionCancelada(fila)"><i
                                                    class="bi bi-trash"></i></button>

                                        </template>

                                        <template v-else>

                                            <!-- Un documento normal cancelado ya cerró su ciclo — no

                                                 tiene sentido "regresarlo a retro", nadie más lo va a

                                                 revisar. Solo se puede editar (queda como registro,

                                                 útil por si se retoma más adelante) o borrar. -->

                                            <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                                @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                            <button class="btn btn-sm btn-outline-danger" title="Borrar"
                                                @click="borrarDocumentoNormal(fila)"><i
                                                    class="bi bi-trash"></i></button>

                                        </template>

                                    </template>

                                    <!-- Admin puede intervenir aquí sin importar de quién es la

                                         tarea (ella podría no estar disponible) — mismo criterio

                                         que ya tiene "Pendiente de tu revisión", donde tampoco se

                                         restringe por dueño de la tarea. -->

                                    <template v-else-if="fila.fase === 'c'">

                                        <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                        <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                            :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                            @corregir="pedirCorreccion(fila)" />

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                    </template>

                                    <template v-else>

                                        <button class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editarDocumento(fila)"><i class="bi bi-pencil"></i></button>

                                        <CompartirAcciones :doc="fila" :puede-compartir="puedeCompartir(fila)"
                                            :puede-corregir="puedeCorregir(fila)" @compartir="alternarCompartir(fila)"
                                            @corregir="pedirCorreccion(fila)" />

                                        <button class="btn btn-sm btn-outline-danger" title="Cancelar"
                                            @click="cancelarDoc(fila)"><i class="bi bi-slash-circle"></i></button>

                                        <button class="btn btn-sm btn-outline-danger" title="Borrar"
                                            @click="borrarDocumentoNormal(fila)"><i class="bi bi-trash"></i></button>

                                    </template>

                                </div>

                            </td>

                        </tr>

                        <tr v-if="filasVisibles.length === 0">

                            <td colspan="8" class="text-center text-muted py-4">

                                <i class="bi bi-inbox" style="font-size:2rem;"></i>

                                <p class="mt-2 mb-0">Nada por aquí con estos filtros.</p>

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </section>

        <div class="modal fade" id="modalNuevaEntrada" tabindex="-1" aria-hidden="true">

            <div class="modal-dialog modal-lg">

                <div class="modal-content">

                    <div class="modal-header">

                        <h5 class="modal-title">

                            <i class="bi bi-plus-square-fill" v-if="!editandoId"></i>

                            <i class="bi bi-pencil" v-else></i>

                            {{ editandoId ? 'Editar tarea' : 'Nueva entrada' }}

                        </h5>

                        <button type="button" class="btn-close" @click="cerrarModal" aria-label="Close"></button>

                    </div>

                    <div class="modal-body">

                        <div class="row g-3 mb-3">

                            <div class="col-md-6">

                                <label class="form-label">Fecha <span class="text-danger">*</span></label>

                                <input type="date" class="form-control" v-model="nuevaEntrada.fecha" required>

                            </div>

                            <div class="col-md-6">

                                <label class="form-label">Fecha de caducidad</label>

                                <input type="date" class="form-control" v-model="nuevaEntrada.fechaCaducidad">

                                <div class="form-text">Opcional(fecha límite para completar el documento)</div>

                            </div>

                        </div>

                        <div class="mb-3">

                            <label class="form-label">Descripción <span class="text-danger">*</span></label>

                            <textarea class="form-control" rows="3"
                                v-model="nuevaEntrada.descripcion" required></textarea>

                           

                        </div>

                        <div class="row g-3">

                            <div class="col-md-6">

                                <label class="form-label">Asignar a</label>

                                <select class="form-select" v-model="nuevaEntrada.asignadoA">

                                    <option value="">Sin asignar</option>

                                    <option v-for="p in personasAsignables" :key="p.id" :value="p.id">{{ p.nombre }}
                                    </option>

                                </select>

                            </div>

                            <div class="col-md-6">

                                <label class="form-label">Tipo de documento <span class="text-danger">*</span></label>

                                <select class="form-select" v-model="nuevaEntrada.tipo" required>

                                    <option value="">Selecciona un tipo</option>

                                    <option v-for="tipo in Object.keys(TIPO_A_RUTA)" :key="tipo" :value="tipo">{{ tipo
                                    }}
                                    </option>

                                </select>

                            </div>

                        </div>

                    </div>

                    <div class="modal-footer">

                        <button type="button" class="btn btn-secondary" @click="cerrarModal">

                            <i class="bi bi-x-circle"></i> Cancelar

                        </button>

                        <button type="button" class="btn btn-primary" @click="guardarTarea">

                            <i class="bi bi-check-lg"></i> {{ editandoId ? 'Guardar cambios' : 'Guardar' }}

                        </button>

                    </div>

                </div>

            </div>

        </div>

    </AdminLayout>

</template>

<style scoped>
.folio-text {
    color: #0d6efd;
    font-weight: 700;
    font-size: 0.85rem;
}
</style>