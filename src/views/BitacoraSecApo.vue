<script setup>
import AdminLayout from '@/layout/AdminLayout.vue';
import { ref, computed, onMounted } from 'vue'
import Paginacion from '@/components/Paginacion.vue'
import { usePaginacion } from '@/composables/usePaginacion.js'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import {
    getDocumentos, getUsuarios, eliminarDocumento, getConfiguracion,
    getBitacora, agregarBitacora, actualizarBitacora, eliminarBitacora,
    actualizarDocumento, cancelarDocumento
} from '../services/api.js'
import { useSesion } from '../composables/UseSesion.js'

import { normalizarBusqueda, coincideBusqueda } from '@/utils/busquedaBitacora.js'
import { folioActual } from '@/utils/folio.js'
import { useImprimirCombinado } from '@/composables/useImprimirCombinado.js'
import ComboImpresion from '@/components/ComboImpresion.vue'
import ImpresionOficiosTutorias from '@/components/Documentos/tutorias/ImpresionOficiosTutorias.vue'
import {
    enCorreccion, esComisionConCadena, esOficioDeLote,
    esParaRH, esperaEnvioRH, enviadoARH, cicloCerrado, estadoRH,
} from '@/utils/estadoDocumento.js'
import { TIPOS_TAREA, esTareaAbierta } from '@/utils/tiposTarea.js'
import { useParejaMemo } from '@/composables/useParejaMemo.js'
import { useNavegacionBitacora } from '@/composables/useNavegacionBitacora.js'
import { TIPOS_DOCUMENTO, etiquetaTipo } from '@/utils/tiposDocumento.js'
import { useFiltrosGuardados } from '@/composables/useFiltrosGuardados.js'
import { aFechaISO, fechaHoy } from '@/utils/fechas.js'

const router = useRouter()
const { usuarioActivo: usuario } = useSesion()


const prefijoFolio = ref('P')
const anioFolio = ref(new Date().getFullYear())

const documentos = ref([])
const entradas = ref([])
const usuarios = ref([])
const cargando = ref(true)
// Liga inversa: documentoId → tarea que lo creó, para limpiarla
// si se borra el documento.
const bitacoraPorDocumentoId = ref({})

const {
    folioRealDe, textoVinculado, pareja, conPareja, nombreDe, avisoSeparacion, separarDePareja,
} = useParejaMemo({ documentos, prefijoFolio, anioFolio, bitacoraPorDocumentoId })
const { verDocumento, irACrearDocumento } = useNavegacionBitacora()

const filtroFechaInicio = ref('')
const filtroFechaFin = ref('')
const filtroTipo = ref('')
const busqueda = ref('')
// Fase activa y quién lo creó, combinados con fecha/tipo.
const activeStage = ref(null)
const creadorFiltro = ref('todos') // 'todos' | 'mi' | 'admin'





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

    const { prefijo, anio } = folioActual(await getConfiguracion())
    prefijoFolio.value = prefijo
    anioFolio.value = anio

    cargando.value = false
}
onMounted(cargarTodo)



// Alumno para SS/Residencia/Liberación, docente/destinatario para
// el resto. Documentos viejos sin "campos" quedan en "—".
function personaRelevante(doc) {
    const c = doc.campos || {}
    return c.nombre_estudiante || c.nombre_destinatario || c.nombre_solicitante || null
}



// Mismo concepto que faseDe en Bitácora.vue, para que los chips
// signifiquen lo mismo en ambas pantallas.
function faseDe(doc) {
    if (doc.estado === 'cancelado') return enCorreccion(doc) ? 'c' : 'x'
    if (esComisionConCadena(doc)) {
        if (doc.estado === 'pendiente_jefeDepto') {
            if (enCorreccion(doc)) return 'c'
            if (doc.rechazadoPor) return 'r'
            return 'en_revision'
        }
        return doc.estado // pendiente_subdirectora / pendiente_director / autorizado
        }
    if (enviadoARH(doc)) return 'rh'
    if (enCorreccion(doc)) return 'c'
    if (esperaEnvioRH(doc)) return doc.rechazadoPor ? 'r' : 'en_revision' // r: lo rechazó RH
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
    // "Corrección solicitada" va primero y aplica a cualquier tipo y
    // estado: es su turno de actuar, igual que el chip de arriba.
    if (enCorreccion(doc)) return REVISIONES.corregir
    if (esComisionConCadena(doc)) {
        // Mientras espera revisión del Jefe, no se muestra nada —
        // igual que "sin revisar" en documentos normales.
        if (doc.estado === 'pendiente_jefeDepto') {
            if (doc.rechazadoPor) return { texto: 'Rechazado', clase: 'text-bg-danger' }
            return { texto: 'En revisión\n(Jefe de Depto)', clase: 'text-bg-info' }
        }
        return ESTADOS[doc.estado] || null
    }

        if (enviadoARH(doc)) {
        const { texto, color } = estadoRH(doc)
        return { texto, clase: `text-bg-${color}` }
    }
    if (esperaEnvioRH(doc)) {
        if (doc.rechazadoPor) return { texto: 'Rechazado', clase: 'text-bg-danger' }
        return { texto: 'En revisión\n(Jefe de Depto)', clase: 'text-bg-info' }
    }

    // Para normales, "estado" casi siempre es "generado" — la única
    // excepción real es "cancelado".
    if (doc.estado === 'cancelado') return { texto: 'Cancelado', clase: 'text-bg-secondary' }
    if (doc.revisionJefeDepto === 'aprobado') return REVISIONES.aprobado
    if (doc.solicitoRevision) return { texto: 'Enviado a revision', clase: 'text-bg-info' }
    if (doc.editadoTrasEnvio) return { texto: 'Editado - falta reenviar', clase: 'text-bg-warning' }
    // Desde su vista, su parte ya está hecha — por eso "Finalizado",
    // no "Sin revisar" (que sonaría a que a ELLA le falta algo).
    return { texto: 'Finalizado', clase: 'text-bg-success' }
}

// Memo doble: se envían los 2 juntos, se presione en el que se
// presione. Enviar también da por terminada una corrección pendiente
// en la pareja.
async function enviarARevision(doc) {
    for (const d of conPareja(doc)) {
        const cambios = { solicitoRevision: true, editadoTrasEnvio: false }
        if (enCorreccion(d)) {
            Object.assign(cambios, { revisionJefeDepto: 'sin_revisar', esperandoCorreccionSecretaria: false, notaAlCompartir: '' })
        }
        await actualizarDocumento(d.id, cambios)
    }
    alert(conPareja(doc).length > 1
        ? 'Los 2 memorándums se enviaron a revisión con el Jefe de Depto'
        : 'Documento enviado a revisión con el Jefe de Depto')
    await cargarTodo()
}



// ── Tareas de Bitácora asignadas a ella (sin importar quién las creó)

const tareasAbiertas = computed(() =>
        entradas.value.filter(e => String(e.asignadoA) === String(usuario.id) && esTareaAbierta(e))
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

// Lo que aparece en su tabla: los contadores deben contar lo mismo,
// si no un compartido sale en la lista pero no suma arriba.
function loVeo(doc) {
    return esMio(doc) || esCompartido(doc)
}



// La nota que le toca ver según la fase: antes salía la primera que
// hubiera, y el rechazo de la Sub le ganaba a la instrucción del Jefe.
function notaDe(doc) {
    const fase = faseDe(doc)
    if (fase === 'c') return doc.observacionJefeDepto || doc.notaAlCompartir || ''
    if (fase === 'r') return doc.observaciones ? `${doc.rechazadoPor || 'Rechazado'}: ${doc.observaciones}` : ''
    if (fase === 'x') return doc.motivoCancelacion || ''
    return ''
}

const conteos = computed(() => ({
    tareas: tareasAbiertas.value.length,
    enRevision: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'en_revision').length,
    r: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'r').length,
    c: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'c').length,
    autorizado: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'autorizado').length,
    rh: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'rh').length,
    x: documentos.value.filter(d => loVeo(d) && faseDe(d) === 'x').length,
    eliminado: tareasEliminadas.value.length,
}))

function toggleStage(valor) {
    activeStage.value = activeStage.value === valor ? null : valor
}

// Los filtros siguen puestos al volver de Ver/Editar/Generar o al recargar
const pagina = ref(1)
const { limpiar: limpiarFiltros, hayFiltros } = useFiltrosGuardados(`filtros-bitacora-${usuario?.id}`, {
    fase: { valor: activeStage, vacio: null, permitidos: ['tareas', 'en_revision', 'r', 'autorizado','rh', 'c', 'x'] },
    tipo: { valor: filtroTipo, permitidos: TIPOS_DOCUMENTO.map(t => t.valor) },
    creador: { valor: creadorFiltro, vacio: 'todos', permitidos: ['todos', 'mi', 'admin'] },
    q: { valor: busqueda },
    desde: { valor: filtroFechaInicio, esFecha: true },
    hasta: { valor: filtroFechaFin, esFecha: true },
    pagina: { valor: pagina, vacio: 1, esNumero: true },
})

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
        
    const q = normalizarBusqueda(busqueda.value)
    if (q) {
        filas = filas.filter(f => coincideBusqueda(f, q, {
            nombre: personaRelevante(f),
            prefijo: prefijoFolio.value,
            anio: anioFolio.value,
        }))
    }
    if (filtroFechaInicio.value || filtroFechaFin.value) {
        filas = filas.filter(f => {
            const fecha = aFechaISO(f.fecha)
            if (filtroFechaInicio.value && fecha < filtroFechaInicio.value) return false
            if (filtroFechaFin.value && fecha > filtroFechaFin.value) return false
            return true
        })
    }
    // Ya llega ordenado desde cargarTodo() — filter()/map()
      // preservan el orden, no hace falta ordenar de nuevo.
    return filas
})


const POR_PAGINA = 15
const { totalPaginas, visibles: filasPagina } = usePaginacion(filasVisibles, POR_PAGINA, {
    pagina,
    reiniciarCon: () => [activeStage.value, filtroTipo.value, creadorFiltro.value, busqueda.value, filtroFechaInicio.value, filtroFechaFin.value],
})



const { comboImprimir, imprimirCombinado } = useImprimirCombinado()


// Oficios de Tutorías que el Admin le compartió (lote del periodo o
// uno suelto): se imprimen todos juntos desde "Oficios Tutorías".
const oficiosTutoriasCompartidos = computed(() =>
    documentos.value.filter(d => esOficioDeLote(d) && d.visibleParaSecretaria && d.estado !== 'cancelado'))
const mostrarOficiosTutorias = ref(false)

// Editar aplica a lo que ella creó y a lo compartido por Admin —
// al editar un compartido se manda a revisión del Jefe de Depto
// (ver destinoAlGuardarEdicion en NuevoDocumento.vue).
// Cancelar/Eliminar siguen exclusivos del Admin/Jefe de Depto.

function puedeEditar(doc) {
    if (!doc.tipoRuta) return false
    // Tutorías: solo se corrige desde el módulo Tutorías (ver esOficioDeLote).
    if (esOficioDeLote(doc)) return false
    // Autorizado ya cerró su ciclo — tampoco lo edita el Admin.
        if (cicloCerrado(doc)) return false
        if (usuario.rol === 'admin') return true
    return esMio(doc) || esCompartido(doc)
}

function editar(doc) {
    router.push(`/nuevo-documento/${doc.tipoRuta}/editar/${doc.id}`)
}



function puedeEliminar(doc) {
    if (doc.tipo === 'comision-externa' || (doc.tipo === 'comision-interna' && doc.campos?.para_jefe_depto)) return false
    if (esCompartido(doc)) return false
    if (usuario.rol === 'admin') return true
    if (doc.enviadoRH) return false
    if (!esMio(doc)) return false
    // Si la tarea es de ella misma, no hay instrucción del Admin que
    // proteger — solo se bloquea si la tarea es de alguien más.
       // Memo doble: mientras sigan juntos, la tarea es de los 2 aunque
    // esté ligada solo a uno.
    const tarea = bitacoraPorDocumentoId.value[doc.id] || bitacoraPorDocumentoId.value[pareja(doc)?.id]
    // tareaAsignadaPor: memo que se separó de su pareja y le cedió la tarea.
    const asignadaPor = tarea ? tarea.creadoPor : doc.tareaAsignadaPor
    if (asignadaPor == null) return true
    return String(asignadaPor) === String(usuario.id)
}

async function eliminar(doc) {
    if (!confirm(`¿Eliminar ${nombreDe(doc)}?${avisoSeparacion(doc)} Esta acción no se puede deshacer.`)) return
    await borrarUnDocumento(doc)
    await cargarTodo()
}


// Mismo criterio que puedeEditar — cancelar no es más grave que
// editar, y editar ya lo tiene permitido.
function puedeCancelar(doc) {
    if (doc.estado === 'cancelado') return false
    if (esCompartido(doc)) return false
    if (usuario.rol === 'admin') return true
    if (enviadoARH(doc)) return false
    return esMio(doc)
}
async function cancelarDoc(doc) {
    const motivo = prompt(`¿Por qué se cancela ${nombreDe(doc)}?${avisoSeparacion(doc)} (opcional)`)
    if (motivo === null) return
       // La tarea pasa al que sigue activo (ver puedeEliminar y useParejaMemo.js).
    await separarDePareja(doc)
    await cancelarDocumento(doc.id, motivo.trim())
    await cargarTodo()
}
async function borrarUnDocumento(doc) {
    const tarea = bitacoraPorDocumentoId.value[doc.id]
    const p = pareja(doc)
    if (p) {
        // Memo doble: el otro se queda como individual; la tarea (que
        // era de los 2) pasa al que sigue existiendo. También se ajusta
        // aquí mismo por si "Borrar todo lo mío" borra el otro después.
        await actualizarDocumento(p.id, { vinculadoCon: null })
        p.vinculadoCon = null
        if (tarea) {
            await actualizarBitacora(tarea.id, { documentoId: p.id })
            bitacoraPorDocumentoId.value[p.id] = tarea
        }
    }
    await eliminarDocumento(doc.id)
    if (tarea && !p) {
        // Borrar solo desaparece doc+tarea, sin rama que archive.
        await eliminarBitacora(tarea.id)
    }
    delete bitacoraPorDocumentoId.value[doc.id]
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



const nuevaEntrada = ref({ fecha: fechaHoy(), fechaCaducidad: '', descripcion: '', tipo: '' })
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
    nuevaEntrada.value = { fecha: fechaHoy(), fechaCaducidad: '', descripcion: '', tipo: '' }
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
    <div :class="{ 'oculto-al-imprimir': comboImprimir.mostrando || mostrarOficiosTutorias }">
        <AdminLayout>
            <!-- CHIPS -->
            <section class="panel mb-3 p-3">
                <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">
                    <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-primary btn-sm" @click="abrirModal">
                        <i class="bi bi-plus-square-fill"></i> Nueva entrada
                    </button>
                    <button v-if="oficiosTutoriasCompartidos.length" type="button" class="btn btn-outline-primary btn-sm"
                        @click="mostrarOficiosTutorias = true" title="Ver e imprimir juntos los oficios de Tutorías que te compartieron">
                        <i class="bi bi-printer me-1"></i> Oficios Tutorías
                       
                    </button>
                    </div>

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
                            :class="activeStage === 'r' ? 'btn-danger' : 'btn-outline-danger'"
                            @click="toggleStage('r')">
                            Rechazados <span class="badge bg-white text-dark ms-1">{{ conteos.r }}</span>
                        </button>
                        <button type="button" class="btn btn-sm"
                            :class="activeStage === 'c' ? 'btn-warning' : 'btn-outline-warning'"
                            @click="toggleStage('c')">
                            Corrección solicitada <span class="badge bg-white text-dark ms-1">{{ conteos.c }}</span>
                        </button>
                        <button type="button" class="btn btn-sm"
                            :class="activeStage === 'autorizado' ? 'btn-success' : 'btn-outline-success'"
                            @click="toggleStage('autorizado')">
                            Autorizados <span class="badge bg-white text-dark ms-1">{{ conteos.autorizado }}</span>
                        </button>
                        <button type="button" class="btn btn-sm"
                            :class="activeStage === 'rh' ? 'btn-primary' : 'btn-outline-primary'"
                            @click="toggleStage('rh')" title="Enviados a Recursos Humanos">
                            RH <span class="badge bg-white text-dark ms-1">{{ conteos.rh }}</span>
                        </button>
                        <button type="button" class="btn btn-sm"
                            :class="activeStage === 'x' ? 'btn-danger' : 'btn-outline-danger'"
                            @click="toggleStage('x')">
                            Cancelados <span class="badge bg-white text-dark ms-1">{{ conteos.x }}</span>
                        </button>
                    </div>
                </div>

                <div class="d-flex flex-wrap align-items-end gap-2 mt-3 pt-3 border-top">
                    <div>
                        <label class="form-label small mb-1" style="min-width: 220px;">Buscar</label>
                        
                        <!--  resalta lo  filtrando -->
                        <input type="text" class="form-control form-control-sm" placeholder="Folio, Nombre, No. Control…"
                            v-model="busqueda" :class="{ 'filtro-activo': busqueda }">
                    </div>
                    <div>
                        <label class="form-label small mb-1">Fecha inicio</label>
                        
                        <input type="date" class="form-control form-control-sm" v-model="filtroFechaInicio"
                            :class="{ 'filtro-activo': filtroFechaInicio }">
                    </div>
                    <div>
                        <label class="form-label small mb-1">Fecha fin</label>
                        
                        <input type="date" class="form-control form-control-sm" v-model="filtroFechaFin"
                            :class="{ 'filtro-activo': filtroFechaFin }">
                    </div>

                    <div>
                        <label class="form-label small mb-1">Tipo de documento</label>
                        
                        <select class="form-select form-select-sm" v-model="filtroTipo"
                            :class="{ 'filtro-activo': filtroTipo }">

                            <option value="">Todos</option>
                            <option v-for="t in TIPOS_DOCUMENTO" :key="t.valor" :value="t.valor">{{ t.etiqueta }}
                            </option>
                        </select>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm" :disabled="!hayFiltros" @click="limpiarFiltros">
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
                            <tr v-for="fila in filasPagina.filter(f => f.esTarea)" :key="'t' + fila.id">
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
                                    <span v-else class="badge bg-secondary-subtle text-secondary">{{ fila.estado
                                        }}</span>
                                    <div v-if="fila.observacionJefeDepto" class="small text-muted mt-1">{{
                                        fila.observacionJefeDepto }}</div>

                                </td>
                                <td>
                                    <div class="d-inline-flex flex-wrap gap-1 justify-content-start">
                                        <button v-if="fila.estado !== 'eliminado'" type="button"
                                            class="btn btn-sm btn-success" title="Crear documento"
                                            @click="irACrearDocumento(fila)">
                                            <i class="bi bi-file-earmark-plus"></i>
                                        </button>
                                        <button v-if="esEntradaPropia(fila) && fila.estado !== 'eliminado'"
                                            type="button" class="btn btn-sm btn-outline-secondary" title="Editar"
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

                            <tr v-for="doc in filasPagina.filter(f => !f.esTarea)" :key="'d' + doc.id">
                                <td class="text-muted small">{{ folioRealDe(doc) || doc.folio }}
                                    <template v-if="textoVinculado(doc)"><br><span class="text-info">Vinculado con {{
                                        textoVinculado(doc) }}</span></template>
                                </td>
                                <td>{{ doc.fecha }}</td>
                                <td>{{ etiquetaTipo(doc.tipo) }}</td>
                                <td>{{ personaRelevante(doc) || doc.asunto || '—' }}</td>
                                <td class="text-muted small">{{
                                    bitacoraPorDocumentoId[doc.id]?.descripcion || '—' }}</td>
                                <td>
                                    <span v-if="infoEstado(doc)" class="badge" :class="infoEstado(doc).clase"
                                        style="white-space: pre-line;">
                                        {{ infoEstado(doc).texto }}
                                    </span>
                                    <div v-if="notaDe(doc)" class="small text-muted mt-1">{{ notaDe(doc) }}</div>
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
                                            class="btn btn-sm btn-outline-secondary" title="Editar"
                                            @click="editar(doc)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            v-if="doc.tipo !== 'comision-externa' && !(doc.tipo === 'comision-interna' && doc.campos?.para_jefe_depto) && doc.estado !== 'cancelado' && !doc.solicitoRevision && doc.revisionJefeDepto !== 'aprobado' && !enCorreccion(doc) && !esOficioDeLote(doc) && !esParaRH(doc)"
                                            type="button" class="btn btn-sm btn-outline-warning"
                                            title="Enviar a revisión" @click="enviarARevision(doc)">
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
                                        <button v-if="pareja(doc)" type="button" class="btn btn-sm btn-outline-info"
                                            title="Imprimir combinado (con su pareja)" @click="imprimirCombinado(doc)">
                                            <i class="bi bi-files"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="!cargando && filasVisibles.length" class="px-3 pb-2">
                    <Paginacion v-model:pagina="pagina" :total="totalPaginas" :elementos="filasVisibles.length" :por-pagina="POR_PAGINA" />
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
                                    <option v-for="tipo in Object.keys(TIPOS_TAREA)" :key="tipo" :value="tipo">{{ tipo
                                        }}
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
    </div>

       <ComboImpresion v-if="comboImprimir.mostrando" :html-primero="comboImprimir.htmlPrimero"
        :html-segundo="comboImprimir.htmlSegundo" :estilo-primero="comboImprimir.estiloPrimero"
                :estilo-segundo="comboImprimir.estiloSegundo" />

    <ImpresionOficiosTutorias v-if="mostrarOficiosTutorias" solo-compartidos
        @cerrar="mostrarOficiosTutorias = false" />
</template>