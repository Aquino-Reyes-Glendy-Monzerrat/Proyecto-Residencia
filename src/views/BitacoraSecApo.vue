<script setup>
import AdminLayout from '@/layout/AdminLayout.vue';
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import {
    getDocumentos, getUsuarios, eliminarDocumento, getConfiguracion,
    getBitacora, agregarBitacora, actualizarBitacora, eliminarBitacora,
    actualizarDocumento, cancelarDocumento
} from '../services/api.js'
import { useSesion } from '../composables/UseSesion.js'

const router = useRouter()
const { usuarioActivo: usuario } = useSesion()

const documentos = ref([])
const entradas = ref([])
const usuarios = ref([])
const cargando = ref(true)
// Liga inversa: documentoId → tarea que lo creó, para limpiarla
// si se borra el documento.
const bitacoraPorDocumentoId = ref({})

const filtroFechaInicio = ref('')
const filtroFechaFin = ref('')
const filtroTipo = ref('')
// Fase activa y quién lo creó, combinados con fecha/tipo.
const activeStage = ref(null)
const creadorFiltro = ref('todos') // 'todos' | 'mi' | 'admin'

const TIPOS_DOCUMENTO = [
    { valor: 'comision-externa', etiqueta: 'Comisión Externa' },
    { valor: 'comision-interna', etiqueta: 'Comisión Interna' },
    { valor: 'memorandum-solventacion-faltas', etiqueta: 'Memorándum: Solventación de Faltas' },
    { valor: 'memorandum-compactacion-horario', etiqueta: 'Memorándum: Compactación' },
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

// A qué formulario mandar al crear el documento desde una tarea.
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

async function cargarTodo() {
    cargando.value = true
    const lista = await getDocumentos()
    // creadoEn es un timestamp real, no depende del orden en que
    // la API devuelve los registros.
    documentos.value = lista.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0))
    usuarios.value = await getUsuarios()
    const bitacora = await getBitacora()
    // Mismo criterio que documentos — más reciente arriba.
    entradas.value = bitacora.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0))
    bitacoraPorDocumentoId.value = Object.fromEntries(
        bitacora.filter(b => b.documentoId).map(b => [b.documentoId, b])
    )

    const config = await getConfiguracion()
    document.documentElement.style.setProperty('--margen-superior', config.estilo.margen_superior + 'cm')
    document.documentElement.style.setProperty('--margen-derecho', config.estilo.margen_derecho + 'cm')
    document.documentElement.style.setProperty('--margen-inferior', config.estilo.margen_inferior + 'cm')
    document.documentElement.style.setProperty('--margen-izquierdo', config.estilo.margen_izquierdo + 'cm')

    cargando.value = false
}
onMounted(cargarTodo)

function nombreUsuario(id) {
    const u = usuarios.value.find(u => String(u.id) === String(id))
    return u?.nombre || '—'
}

// Alumno para SS/Residencia/Liberación, docente/destinatario para
// el resto. Documentos viejos sin "campos" quedan en "—".
function personaRelevante(doc) {
    const c = doc.campos || {}
    return c.nombre_estudiante || c.nombre_destinatario || c.nombre_solicitante || null
}

function etiquetaTipo(tipo) {
    return TIPOS_DOCUMENTO.find(t => t.valor === tipo)?.etiqueta || tipo
}

// Mismo concepto que faseDe en Bitácora.vue, para que los chips
// signifiquen lo mismo en ambas pantallas.
function faseDe(doc) {
    if (doc.estado === 'cancelado') return doc.revisionJefeDepto === 'corregir' ? 'c' : 'x'
    if (doc.tipo === 'comision-externa') {
        if (doc.estado === 'pendiente_jefeDepto') {
            if (doc.revisionJefeDepto === 'corregir') return 'c'
            if (doc.rechazadoPor) return 'r'
            return 'en_revision'
        }
        return doc.estado // pendiente_subdirectora / pendiente_director / autorizado
    }
    if (doc.revisionJefeDepto === 'corregir') return 'c'
    if (doc.revisionJefeDepto !== 'aprobado' && doc.solicitoRevision) return 'en_revision'
    return 'normal'
}

const ESTADOS = {
    pendiente_jefeDepto: { texto: 'Pendiente (Jefe de Depto)', clase: 'text-bg-warning' },
    pendiente_subdirectora: { texto: 'Pendiente (Subdirectora)', clase: 'text-bg-warning' },
    pendiente_director: { texto: 'Pendiente (Director)', clase: 'text-bg-warning' },
    autorizado: { texto: 'Autorizado', clase: 'text-bg-success' },
    no_autorizado: { texto: 'No autorizado', clase: 'text-bg-danger' },
    cancelado: { texto: 'Cancelado', clase: 'text-bg-secondary' },
}

const REVISIONES = {
    aprobado: { texto: 'Revisado y aprobado', clase: 'text-bg-success' },
    corregir: { texto: 'Corrección solicitada', clase: 'text-bg-warning' },
}

function infoEstado(doc) {
    if (doc.tipo === 'comision-externa') {
        // "Corrección solicitada" aplica sin importar el estado
        // (pendiente_jefeDepto o cancelado).
        if (doc.revisionJefeDepto === 'corregir') return REVISIONES.corregir
        // Se le compartió para que ELLA corrija — "En revisión
        // (Jefe de Depto)" sería engañoso, es su turno de actuar.
        if (doc.esperandoCorreccionSecretaria) {
            return { texto: 'Compartido\npendiente de tu corrección', clase: 'text-bg-warning' }
        }
        // Mientras espera revisión del Jefe, no se muestra nada —
        // igual que "sin revisar" en documentos normales.
        if (doc.estado === 'pendiente_jefeDepto') {
            if (doc.rechazadoPor) return { texto: 'Rechazado', clase: 'text-bg-danger' }
            return { texto: 'En revisión\n(Jefe de Depto)', clase: 'text-bg-info' }
        }
        return ESTADOS[doc.estado] || null
    }
    // Para normales, "estado" casi siempre es "generado" — la única
    // excepción real es "cancelado".
    if (doc.estado === 'cancelado') return { texto: 'Cancelado', clase: 'text-bg-secondary' }
    if (doc.revisionJefeDepto === 'aprobado') return REVISIONES.aprobado
    if (doc.revisionJefeDepto === 'corregir') return REVISIONES.corregir
    if (doc.solicitoRevision) return { texto: 'Enviado a revision', clase: 'text-bg-info' }
    if (doc.editadoTrasEnvio) return { texto: 'Editado - falta reenviar', clase: 'text-bg-warning' }
    // Desde su vista, su parte ya está hecha — por eso "Finalizado",
    // no "Sin revisar" (que sonaría a que a ELLA le falta algo).
    return { texto: 'Finalizado', clase: 'text-bg-success' }
}

async function enviarARevision(doc) {
    await actualizarDocumento(doc.id, { solicitoRevision: true, editadoTrasEnvio: false })
    alert('Documento enviado a revisión con el Jefe de Depto')
    await cargarTodo()
}

function fechaAOrden(fechaStr) {
    if (!fechaStr) return ''
    const [d, m, y] = fechaStr.split('/')
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ── Tareas de Bitácora asignadas a ella (sin importar quién las creó)
const TAREA_ABIERTA = ['pendiente', 'elaboracion']
const tareasAbiertas = computed(() =>
    entradas.value.filter(e => String(e.asignadoA) === String(usuario.id) && TAREA_ABIERTA.includes(e.estado) && !e.documentoId)
)
const tareasEliminadas = computed(() =>
    entradas.value.filter(e => String(e.asignadoA) === String(usuario.id) && e.estado === 'eliminado')
)

function esMio(doc) {
    return String(doc.creadoPor) === String(usuario.id)
}
function esCompartido(doc) {
    return !!doc.visibleParaSecretaria && !esMio(doc)
}

const conteos = computed(() => ({
    tareas: tareasAbiertas.value.length,
    enRevision: documentos.value.filter(d => esMio(d) && faseDe(d) === 'en_revision').length,
    r: documentos.value.filter(d => esMio(d) && faseDe(d) === 'r').length,
    c: documentos.value.filter(d => esMio(d) && faseDe(d) === 'c').length,
    autorizado: documentos.value.filter(d => esMio(d) && faseDe(d) === 'autorizado').length,
    x: documentos.value.filter(d => esMio(d) && faseDe(d) === 'x').length,
    eliminado: tareasEliminadas.value.length,
}))

function toggleStage(valor) {
    activeStage.value = activeStage.value === valor ? null : valor
}

const filasVisibles = computed(() => {
    if (activeStage.value === 'eliminado') {
        return tareasEliminadas.value.map(e => ({ esTarea: true, ...e }))
    }
    if (activeStage.value === 'tareas') {
        return tareasAbiertas.value.map(e => ({ esTarea: true, ...e }))
    }

    let filas = documentos.value
        .filter(doc => {
            const mio = esMio(doc)
            const compartido = esCompartido(doc)
            if (usuario.rol !== 'admin' && !mio && !compartido) return false
            if (creadorFiltro.value === 'mi' && !mio) return false
            if (creadorFiltro.value === 'admin' && !compartido) return false
            return true
        })
        .map(doc => ({ esTarea: false, ...doc, fase: faseDe(doc), compartido: esCompartido(doc) }))

    if (activeStage.value) {
        filas = filas.filter(f => f.fase === activeStage.value)
    }
    if (filtroTipo.value) {
        filas = filas.filter(f => f.tipo === filtroTipo.value)
    }
    if (filtroFechaInicio.value || filtroFechaFin.value) {
        filas = filas.filter(f => {
            const fecha = fechaAOrden(f.fecha)
            if (filtroFechaInicio.value && fecha < filtroFechaInicio.value) return false
            if (filtroFechaFin.value && fecha > filtroFechaFin.value) return false
            return true
        })
    }
    // Ya llega ordenado desde cargarTodo() — filter()/map()
    // preservan el orden, no hace falta ordenar de nuevo.
    return filas
})

function limpiarFiltros() {
    filtroFechaInicio.value = ''
    filtroFechaFin.value = ''
    filtroTipo.value = ''
    activeStage.value = null
    creadorFiltro.value = 'todos'
}

function verDocumento(doc) {
    router.push(`/bitacorasecapo/ver/${doc.id}`)
}

// Editar aplica a lo que ella creó y a lo compartido por Admin —
// al editar un compartido se manda a revisión del Jefe de Depto
// (ver destinoAlGuardarEdicion en NuevoDocumento.vue).
// Cancelar/Eliminar siguen exclusivos del Admin/Jefe de Depto.
function fueAsignada(doc) {
    return !!bitacoraPorDocumentoId.value[doc.id]
}
function puedeEditar(doc) {
    if (!doc.tipoRuta) return false
    // Autorizado ya cerró su ciclo — tampoco lo edita el Admin.
    if (doc.estado === 'autorizado') return false
    if (usuario.rol === 'admin') return true
    return esMio(doc) || esCompartido(doc)
}

function editar(doc) {
    router.push(`/nuevo-documento/${doc.tipoRuta}/editar/${doc.id}`)
}

function puedeEliminar(doc) {
    if (doc.tipo === 'comision-externa') return false
    if (esCompartido(doc)) return false
    if (usuario.rol === 'admin') return true
    if (!esMio(doc)) return false
    // Si la tarea es de ella misma, no hay instrucción del Admin que
    // proteger — solo se bloquea si la tarea es de alguien más.
    const tarea = bitacoraPorDocumentoId.value[doc.id]
    if (!tarea) return true
    return String(tarea.creadoPor) === String(usuario.id)
}

async function eliminar(doc) {
    if (!confirm(`¿Eliminar el documento ${doc.folio}? Esta acción no se puede deshacer.`)) return
    await borrarUnDocumento(doc)
    documentos.value = documentos.value.filter(d => d.id !== doc.id)
}

// Mismo criterio que puedeEditar — cancelar no es más grave que
// editar, y editar ya lo tiene permitido.
function puedeCancelar(doc) {
    if (doc.estado === 'cancelado') return false
    if (esCompartido(doc)) return false
    if (usuario.rol === 'admin') return true
    return esMio(doc)
}
async function cancelarDoc(doc) {
    const motivo = prompt(`¿Por qué se cancela el documento ${doc.folio}? (opcional)`)
    if (motivo === null) return
    await cancelarDocumento(doc.id, motivo.trim())
    await cargarTodo()
}
async function borrarUnDocumento(doc) {
    const tarea = bitacoraPorDocumentoId.value[doc.id]
    await eliminarDocumento(doc.id)
    if (tarea) {
        // Borrar solo desaparece doc+tarea, sin rama que archive.
        await eliminarBitacora(tarea.id)
        delete bitacoraPorDocumentoId.value[doc.id]
    }
}

// Solo borra los documentos que ella tiene permiso de eliminar,
// mismo criterio que cada fila.
async function eliminarTodo() {
    const borrables = documentos.value.filter(d => puedeEliminar(d))
    if (borrables.length === 0) return
    if (!confirm(`¿Eliminar los ${borrables.length} documentos que puedes borrar? Esta acción no se puede deshacer.`)) return
    if (!confirm('Confirma una vez más: se borrarán, sin excepción. ¿Continuar?')) return
    cargando.value = true
    for (const doc of borrables) {
        await borrarUnDocumento(doc)
    }
    const idsBorrados = new Set(borrables.map(d => d.id))
    documentos.value = documentos.value.filter(d => !idsBorrados.has(d.id))
    cargando.value = false
}

// ── Tareas propias (recordatorios que ella misma se crea) ──
function irACrearDocumento(entrada) {
    const rutaTipo = TIPO_A_RUTA[entrada.tipo]
    if (!rutaTipo) {
        alert(`No se encontró a qué formulario corresponde el tipo "${entrada.tipo}".`)
        return
    }
    router.push(`/nuevo-documento/${rutaTipo}?bitacoraId=${entrada.id}`)
}

const nuevaEntrada = ref({ fecha: '', fechaCaducidad: '', descripcion: '', tipo: '' })
const editandoId = ref(null)
let modalInstancia = null

function abrirModal() {
    const modalEl = document.getElementById('modalNuevaEntradaBitacoraSecApo')
    modalInstancia = new Modal(modalEl)
    modalInstancia.show()
}
// Solo edita/borra la ENTRADA si ella misma la creó — si se la
// asignó el Admin, no se toca, solo se completa.
function esEntradaPropia(entrada) {
    return String(entrada.creadoPor) === String(usuario.id)
}
function editarTarea(entrada) {
    editandoId.value = entrada.id
    nuevaEntrada.value = {
        fecha: entrada.fecha,
        fechaCaducidad: entrada.fechaCaducidad === '—' ? '' : entrada.fechaCaducidad,
        descripcion: entrada.descripcion,
        tipo: entrada.tipo,
    }
    abrirModal()
}
function cerrarModal() {
    if (modalInstancia) modalInstancia.hide()
    nuevaEntrada.value = { fecha: '', fechaCaducidad: '', descripcion: '', tipo: '' }
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
        asignadoA: usuario.id,
    }
    if (editandoId.value) {
        await actualizarBitacora(editandoId.value, datos)
    } else {
        await agregarBitacora({ ...datos, creadoPor: usuario.id })
    }
    cerrarModal()
    await cargarTodo()
}
async function borrarTarea(entrada) {
    if (!confirm(`¿Eliminar la tarea "${entrada.descripcion}"? Esta acción no se puede deshacer.`)) return
    await eliminarBitacora(entrada.id)
    await cargarTodo()
}
</script>

<template>
    <AdminLayout>
        <!-- CHIPS -->
        <section class="panel mb-3 p-3">
            <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">
                <button type="button" class="btn btn-primary btn-sm" @click="abrirModal">
                    <i class="bi bi-plus-square-fill"></i> Nueva entrada
                </button>

                <div class="d-flex flex-wrap gap-1">
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'tareas' ? 'btn-warning' : 'btn-outline-warning'"
                        @click="toggleStage('tareas')">
                        Pendientes <span class="badge bg-white text-dark ms-1">{{ conteos.tareas }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'en_revision' ? 'btn-info' : 'btn-outline-info'"
                        @click="toggleStage('en_revision')">
                        En revisión <span class="badge bg-white text-dark ms-1">{{ conteos.enRevision }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'r' ? 'btn-danger' : 'btn-outline-danger'" @click="toggleStage('r')">
                        Rechazados <span class="badge bg-white text-dark ms-1">{{ conteos.r }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'c' ? 'btn-warning' : 'btn-outline-warning'" @click="toggleStage('c')">
                        Corrección solicitada <span class="badge bg-white text-dark ms-1">{{ conteos.c }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'autorizado' ? 'btn-success' : 'btn-outline-success'"
                        @click="toggleStage('autorizado')">
                        Autorizados <span class="badge bg-white text-dark ms-1">{{ conteos.autorizado }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="activeStage === 'x' ? 'btn-danger' : 'btn-outline-danger'" @click="toggleStage('x')">
                        Cancelados <span class="badge bg-white text-dark ms-1">{{ conteos.x }}</span>
                    </button>
                </div>
            </div>

            <div class="d-flex flex-wrap align-items-end gap-2 mt-3 pt-3 border-top">
                <div>
                    <label class="form-label small mb-1">Fecha inicio</label>
                    <input type="date" class="form-control form-control-sm" v-model="filtroFechaInicio">
                </div>
                <div>
                    <label class="form-label small mb-1">Fecha fin</label>
                    <input type="date" class="form-control form-control-sm" v-model="filtroFechaFin">
                </div>
                <div>
                    <label class="form-label small mb-1">Tipo de documento</label>
                    <select class="form-select form-select-sm" v-model="filtroTipo">
                        <option value="">Todos</option>
                        <option v-for="t in TIPOS_DOCUMENTO" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
                    </select>
                </div>
                <button type="button" class="btn btn-danger btn-sm" @click="limpiarFiltros">
                    <i class="bi bi-x-circle"></i> Limpiar filtros
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm ms-auto" @click="eliminarTodo">
                    <i class="bi bi-trash3"></i> Borrar todo lo mío
                </button>
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
                <span class="small text-muted fw-semibold text-uppercase">Creado por:</span>
                <button type="button" class="btn btn-sm"
                    :class="creadorFiltro === 'todos' ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="creadorFiltro = 'todos'">Todos</button>
                <button type="button" class="btn btn-sm"
                    :class="creadorFiltro === 'mi' ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="creadorFiltro = 'mi'">Yo</button>
                <button type="button" class="btn btn-sm"
                    :class="creadorFiltro === 'admin' ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="creadorFiltro = 'admin'">Compartido por Admin</button>
            </div>
        </section>

        <!-- TABLA -->
        <section class="panel">
            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>

            <div v-else-if="filasVisibles.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                <p class="mt-2 mb-0">No se encontraron resultados con estos filtros</p>
            </div>

            <div v-else class="table-responsive">
                <table class="table align-middle mb-0" style="table-layout: fixed; width: 100%;">
                    <thead>
                        <tr>
                            <th style="width: 9%;">Folio</th>
                            <th style="width: 9%;">Fecha</th>
                            <th style="width: 11%;">Tipo</th>
                            <th style="width: 15%;">Nombre</th>
                            <th style="width: 24%;">Descripción</th>
                            <th style="width: 13%;">Estado</th>
                            <th style="width: 19%;">Acciones</th>
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
                                <div v-if="fila.observacionJefeDepto" class="small text-muted mt-1">{{
                                    fila.observacionJefeDepto }}</div>
                                <div v-if="String(fila.asignadoA) === String(usuario.id) && !esEntradaPropia(fila)"
                                    class="small text-muted mt-1">
                                    Asignada por {{ nombreUsuario(fila.creadoPor) }}
                                </div>
                            </td>
                            <td>
                                <div class="d-inline-flex flex-wrap gap-1 justify-content-start">
                                    <button v-if="fila.estado !== 'eliminado'" type="button"
                                        class="btn btn-sm btn-success" title="Crear documento"
                                        @click="irACrearDocumento(fila)">
                                        <i class="bi bi-file-earmark-plus"></i>
                                    </button>
                                    <button v-if="esEntradaPropia(fila) && fila.estado !== 'eliminado'" type="button"
                                        class="btn btn-sm btn-outline-secondary" title="Editar"
                                        @click="editarTarea(fila)">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button v-if="esEntradaPropia(fila)" type="button" class="btn btn-sm btn-danger"
                                        title="Borrar" @click="borrarTarea(fila)">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>

                        <tr v-for="doc in filasVisibles.filter(f => !f.esTarea)" :key="'d' + doc.id">
                            <td class="text-muted small">{{ doc.folio }}</td>
                            <td>{{ doc.fecha }}</td>
                            <td>{{ etiquetaTipo(doc.tipo) }}</td>
                            <td>{{ personaRelevante(doc) || doc.asunto || '—' }}</td>
                            <td class="text-muted small">{{ doc.notaAlCompartir || bitacoraPorDocumentoId[doc.id]?.descripcion || '—' }}</td>
                            <td>
                                <span v-if="infoEstado(doc)" class="badge" :class="infoEstado(doc).clase"
                                    style="white-space: pre-line;">
                                    {{ infoEstado(doc).texto }}
                                </span>
                                <div v-if="doc.observaciones || doc.observacionJefeDepto || doc.motivoCancelacion"
                                    class="small text-muted mt-1">
                                    {{ doc.observaciones || doc.observacionJefeDepto || doc.motivoCancelacion }}
                                </div>
                            </td>
                            <td>
                                <div class="d-inline-flex flex-wrap gap-1 justify-content-start align-items-center">
                                    <span v-if="doc.compartido" class="badge bg-info-subtle text-info">
                                        <i class="bi bi-share-fill me-1"></i>Admin
                                    </span>
                                    <button type="button" class="btn btn-sm btn-primary" title="Ver"
                                        @click="verDocumento(doc)">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button v-if="puedeEditar(doc)" type="button"
                                        class="btn btn-sm btn-outline-secondary" title="Editar" @click="editar(doc)">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button
                                        v-if="doc.tipo !== 'comision-externa' && doc.estado !== 'cancelado' && !doc.solicitoRevision && doc.revisionJefeDepto !== 'aprobado' && doc.revisionJefeDepto !== 'corregir'"
                                        type="button" class="btn btn-sm btn-outline-warning" title="Enviar a revisión"
                                        @click="enviarARevision(doc)">
                                        <i class="bi bi-send"></i>
                                    </button>
                                    <button v-if="puedeCancelar(doc)" type="button"
                                        class="btn btn-sm btn-outline-danger" title="Cancelar"
                                        @click="cancelarDoc(doc)">
                                        <i class="bi bi-slash-circle"></i>
                                    </button>
                                    <button v-if="puedeEliminar(doc)" type="button" class="btn btn-sm btn-danger"
                                        title="Eliminar" @click="eliminar(doc)">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <div class="modal fade" id="modalNuevaEntradaBitacoraSecApo" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ editandoId ? 'Editar entrada' : 'Nueva entrada' }}</h5>
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
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción <span class="text-danger">*</span></label>
                            <textarea class="form-control" rows="3" placeholder="¿Qué necesitas recordar hacer?"
                                v-model="nuevaEntrada.descripcion" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Tipo de documento <span class="text-danger">*</span></label>
                            <select class="form-select" v-model="nuevaEntrada.tipo" required>
                                <option value="">Selecciona un tipo</option>
                                <option v-for="tipo in Object.keys(TIPO_A_RUTA)" :key="tipo" :value="tipo">{{ tipo }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cerrarModal">Cancelar</button>
                        <button type="button" class="btn btn-primary" @click="guardarTarea">
                            {{ editandoId ? 'Guardar cambios' : 'Guardar' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>