<script setup>
import AdminLayout from '@/layout/AdminLayout.vue'
import Paginacion from '@/components/Paginacion.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getDocumentosEnviadosRH, getConfiguracion, aceptarEnRH, rechazarEnRH } from '@/services/api.js'
import { folioRealDe, folioActual } from '@/utils/folio.js'
import { TIPOS_DOCUMENTO, etiquetaTipo } from '@/utils/tiposDocumento.js'
import { esTipoParaRH } from '@/utils/estadoDocumento.js'
import { normalizarBusqueda, coincideBusqueda } from '@/utils/busquedaBitacora.js'
import { usePaginacion } from '@/composables/usePaginacion.js'
import { useFiltrosGuardados } from '@/composables/useFiltrosGuardados.js'
import { useSesion } from '@/composables/UseSesion.js'
import { fechaHoy, fechaConBarras } from '@/utils/fechas.js'

const POR_PAGINA = 10
const TIPOS_RH = TIPOS_DOCUMENTO.filter(t => esTipoParaRH(t.valor, true))


const SITUACIONES = {
    por_revisar: { texto: 'Por revisar', chip: 'Por revisar', color: 'warning' },
    aceptado: { texto: 'Aceptado', chip: 'Aceptados', color: 'success' },
    devuelto: { texto: 'Devuelto', chip: '⚠ Devueltos', color: 'danger' },
    cancelado: { texto: 'Cancelado', chip: '✕ Cancelados', color: 'secondary' },
}
const COLOR_TODOS = 'primary'

const claseChip = (activo, color) => (activo ? `btn-${color}` : `btn-outline-${color}`)
const claseEtiqueta = (color) => `bg-${color}-subtle text-${color}`

function situacionDe(doc) {
    if (doc.estado === 'enviado_rh') return 'por_revisar'
    if (doc.estado === 'aceptado_rh') return 'aceptado'
    if (doc.estado === 'cancelado') return 'cancelado'
    return 'devuelto'
}

const router = useRouter()
const documentos = ref([])
const config = ref(null)
const cargando = ref(true)
const procesando = ref(false)


const filtroSituacion = ref('todos') 
const filtroTipo = ref('')
const busqueda = ref('')
const fechaDesde = ref('')
const fechaHasta = ref('')

const { usuarioActivo } = useSesion()
const { limpiar: limpiarFiltros, hayFiltros } = useFiltrosGuardados(`filtros-bandeja-rh-${usuarioActivo?.id}`, {
    situacion: { valor: filtroSituacion, vacio: 'todos', permitidos: [...Object.keys(SITUACIONES), 'todos'] },
    tipo: { valor: filtroTipo, permitidos: TIPOS_RH.map(t => t.valor) },
    q: { valor: busqueda },
    desde: { valor: fechaDesde, esFecha: true },
    hasta: { valor: fechaHasta, esFecha: true },
})

const rechazandoId = ref(null)
const textoRechazo = ref('')

const folioVigente = computed(() => folioActual(config.value))

async function cargar() {
    cargando.value = true
    const [docs, cfg] = await Promise.all([getDocumentosEnviadosRH(), getConfiguracion()])
    documentos.value = docs.sort((a, b) => String(b.fechaEnvioRH || '').localeCompare(String(a.fechaEnvioRH || '')))
    config.value = cfg
    cargando.value = false
}

onMounted(cargar)

function personaDe(doc) {
    const c = doc.campos || {}
    return c.nombre_solicitante || c.nombre_destinatario || doc.asunto || '—'
}

function folioDe(doc) {
    return folioRealDe(doc, folioVigente.value.prefijo, folioVigente.value.anio) || doc.folio || '—'
}


function diaDe(iso) {
    return iso ? fechaHoy(new Date(iso)) : ''
}

function fechaCorta(iso) {
    return iso ? fechaConBarras(diaDe(iso)) : '—'
}

const conteos = computed(() => {
    const n = Object.fromEntries(Object.keys(SITUACIONES).map(s => [s, 0]))
    documentos.value.forEach(d => n[situacionDe(d)]++)
    return n
})

const filtrados = computed(() => {
    const q = normalizarBusqueda(busqueda.value)
    const desde = fechaDesde.value
    const hasta = fechaHasta.value
    return documentos.value.filter(d => {
        const dia = diaDe(d.fechaEnvioRH)
        return (filtroSituacion.value === 'todos' || situacionDe(d) === filtroSituacion.value)
            && (!filtroTipo.value || d.tipo === filtroTipo.value)
            && (!desde || dia >= desde)
            && (!hasta || dia <= hasta)
            && (!q || coincideBusqueda(d, q, { nombre: personaDe(d), ...folioVigente.value }))
    })
})

const { pagina, totalPaginas, visibles } = usePaginacion(filtrados, POR_PAGINA)

function ver(doc) {
    router.push({ name: 'ver-documento-rh', params: { id: doc.id } })
}

async function aceptar(doc) {
    if (!confirm(`¿Aceptar ${folioDe(doc)}? Quedará en sus documentos aceptados.`)) return
    procesando.value = true
    try {
        await aceptarEnRH(doc.id)
        await cargar()
    } finally {
        procesando.value = false
    }
}

function abrirRechazo(doc) {
    rechazandoId.value = doc.id
    textoRechazo.value = ''
}

function cerrarRechazo() {
    rechazandoId.value = null
    textoRechazo.value = ''
}

async function confirmarRechazo(doc) {
    const observacion = textoRechazo.value.trim()
    if (!observacion) {
        alert('Escribe la observación antes de continuar')
        return
    }
    procesando.value = true
    try {
        await rechazarEnRH(doc.id, observacion)
        cerrarRechazo()
        await cargar()
    } finally {
        procesando.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="panel p-3 my-0">
            <div class="d-flex flex-wrap align-items-center gap-2 justify-content-between">
                <h5 class="m-0">Documentos recibidos</h5>

                <div class="d-flex flex-wrap gap-1">
                    <button v-for="(s, clave) in SITUACIONES" :key="clave" type="button" class="btn btn-sm"
                        :class="claseChip(filtroSituacion === clave, s.color)"
                        @click="filtroSituacion = clave">
                        {{ s.chip }} <span class="badge bg-white text-dark ms-1">{{ conteos[clave] }}</span>
                    </button>
                    <button type="button" class="btn btn-sm"
                        :class="claseChip(filtroSituacion === 'todos', COLOR_TODOS)" @click="filtroSituacion = 'todos'">
                        Todos <span class="badge bg-white text-dark ms-1">{{ documentos.length }}</span>
                    </button>
                </div>
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
                <input type="text" class="form-control form-control-sm" style="max-width:280px;"
                    :class="{ 'filtro-activo': busqueda }" placeholder="Folio, No. de oficio o maestro…" v-model="busqueda">

                <select class="form-select form-select-sm" style="width:auto; max-width:100%;" v-model="filtroTipo"
                    :class="{ 'filtro-activo': filtroTipo }">
                    <option value="">Tipo de documento: todos</option>
                    <option v-for="t in TIPOS_RH" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
                </select>

                <div class="d-flex align-items-center gap-1">
                    <label class="small text-muted mb-0 text-nowrap">Recibido desde</label>
                    <input type="date" class="form-control form-control-sm" v-model="fechaDesde"
                        :class="{ 'filtro-activo': fechaDesde }">
                    <label class="small text-muted mb-0">hasta</label>
                    <input type="date" class="form-control form-control-sm" v-model="fechaHasta"
                        :class="{ 'filtro-activo': fechaHasta }">
                </div>

                <button type="button" class="btn btn-danger btn-sm" :disabled="!hayFiltros" @click="limpiarFiltros">
                    <i class="bi bi-x-circle"></i> Limpiar filtros
                </button>
            </div>
        </div>

        <div v-if="cargando" class="text-center py-5"><span class="spinner-border"></span></div>

        <div v-else-if="filtrados.length === 0" class="text-muted text-center py-5">
            <i class="bi bi-inbox" style="font-size:2rem;"></i>
            <p class="mt-2 mb-0">{{ hayFiltros ? 'Ningún documento coincide con los filtros.' : 'Aún no se ha recibido ningún documento.' }}</p>
        </div>

        <section v-else class="panel">
            <div class="table-responsive">
                <table class="table align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Recibido</th>
                            <th>Tipo</th>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="doc in visibles" :key="doc.id">
                            <td><span class="folio-text">{{ folioDe(doc) }}</span></td>
                            <td class="small">{{ fechaCorta(doc.fechaEnvioRH) }}</td>
                            <td>{{ etiquetaTipo(doc.tipo) }}</td>
                            <td>{{ personaDe(doc) }}</td>
                            <td>
                                <span class="badge" :class="claseEtiqueta(SITUACIONES[situacionDe(doc)].color)">
                                    {{ SITUACIONES[situacionDe(doc)].texto }}
                                </span>
                                <div v-if="situacionDe(doc) === 'aceptado'" class="small text-muted mt-1">
                                    {{ fechaCorta(doc.fechaAceptadoRH) }}
                                </div>
                                <div v-if="situacionDe(doc) === 'devuelto' && doc.observacionRH" class="small text-muted mt-1">
                                    Su observación: {{ doc.observacionRH }}
                                </div>
                                <div v-if="situacionDe(doc) === 'cancelado' && doc.motivoCancelacion" class="small text-muted mt-1">
                                    Motivo: {{ doc.motivoCancelacion }}
                                </div>
                            </td>
                            <td>
                                <div v-if="rechazandoId === doc.id" style="min-width:240px;">
                                    <textarea class="form-control form-control-sm mb-1" rows="2" v-model="textoRechazo"
                                        placeholder="¿Por qué no se acepta? (regresa al Jefe de Depto.)"></textarea>
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-sm btn-outline-secondary flex-fill" :disabled="procesando"
                                            @click="cerrarRechazo">Cancelar</button>
                                        <button class="btn btn-sm btn-danger flex-fill" :disabled="procesando"
                                            @click="confirmarRechazo(doc)">Rechazar</button>
                                    </div>
                                </div>

                                <div v-else class="d-flex flex-wrap gap-1">
                                    <button class="btn btn-sm btn-outline-secondary" title="Ver / imprimir" @click="ver(doc)">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <template v-if="situacionDe(doc) === 'por_revisar'">
                                        <button class="btn btn-sm btn-success" title="Aceptar" :disabled="procesando"
                                            @click="aceptar(doc)"><i class="bi bi-check-lg"></i></button>
                                        <button class="btn btn-sm btn-danger" title="Rechazar con observación"
                                            :disabled="procesando" @click="abrirRechazo(doc)"><i class="bi bi-x-lg"></i></button>
                                    </template>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="px-3 pb-2">
                <Paginacion v-model:pagina="pagina" :total="totalPaginas" />
            </div>
        </section>
    </AdminLayout>
</template>