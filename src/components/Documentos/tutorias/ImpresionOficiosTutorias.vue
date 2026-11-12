<script setup>
// Ventana para ver / imprimir de golpe los oficios de Tutorías de un
// periodo (uno por hoja, en orden de folio). La usan:
//  - Tutorías (Admin): el periodo que está viendo, con "Borrar estos oficios".
//  - Bitácora de Secretaria/Apoyo: solo los oficios que le compartieron,
//    con selector de periodo, solo ver e imprimir.
// Los cancelados nunca salen.
import { ref, computed, onMounted } from 'vue'
import { getDocumentos, getConfiguracion, eliminarDocumento } from '@/services/api.js'
import { folioDelDocumento, imprimirConTitulo,folioActual } from '@/utils/folio.js'
import { estiloDe, variablesDeEstilo } from '@/utils/estiloDocumento.js'
import { esDelPeriodo, etiquetaPeriodo } from '@/utils/periodosTutoria.js'

const props = defineProps({
    // { periodo: 'AGO-DIC', anio: 2026 } — el que se abre primero.
    periodoInicial: { type: Object, default: null },
    // true = Secretaria/Apoyo: solo lo compartido y con selector de periodo.
    soloCompartidos: { type: Boolean, default: false },
    // true = Admin: muestra "Borrar estos oficios".
    puedeBorrar: { type: Boolean, default: false },
})
const emit = defineEmits(['cerrar'])

const cargando = ref(true)
const config = ref(null)
const todos = ref([])          // oficios de Tutorías que se pueden mostrar
const seleccion = ref(null)    // { periodo, anio }
const borrando = ref(false)

const anioSinDato = computed(() => folioActual(config.value).anio)

const periodoDe = (d) => ({ periodo: d.campos?.periodo, anio: Number(d.campos?.anio_periodo ?? anioSinDato.value) })
const claveDe = ({ periodo, anio }) => `${periodo}|${anio}`

// Periodos que tienen oficios (para el selector de Secretaria), el más reciente primero.
const periodos = computed(() => {
    const vistos = new Map()
    todos.value.forEach(d => {
        const p = periodoDe(d)
        if (p.periodo) vistos.set(claveDe(p), p)
    })
    return [...vistos.values()].sort((a, b) =>
        b.anio - a.anio || (b.periodo === 'AGO-DIC') - (a.periodo === 'AGO-DIC'))
})

const claveSeleccion = computed({
    get: () => (seleccion.value ? claveDe(seleccion.value) : ''),
    set: (v) => { seleccion.value = periodos.value.find(p => claveDe(p) === v) || null },
})

const documentos = computed(() => {
    if (!seleccion.value) return []
    return todos.value
        .filter(d => esDelPeriodo(d.campos?.periodo, d.campos?.anio_periodo, seleccion.value, anioSinDato.value))
        .sort((a, b) => Number(a.campos?.numero_oficio) - Number(b.campos?.numero_oficio))
})

const titulo = computed(() => seleccion.value ? etiquetaPeriodo(seleccion.value.periodo, seleccion.value.anio) : '')

async function cargar() {
    cargando.value = true
    config.value = await getConfiguracion()
    todos.value = (await getDocumentos()).filter(d => d.tipo === 'tutorias' && d.estado !== 'cancelado'
        && (!props.soloCompartidos || d.visibleParaSecretaria))
    seleccion.value = props.periodoInicial
        ? { periodo: props.periodoInicial.periodo, anio: Number(props.periodoInicial.anio) }
        : (periodos.value[0] || null)
    cargando.value = false
}
onMounted(cargar)

// Borra de una vez los oficios que se ven (por si se generaron por error).
// Grupos y tutores no se tocan; los folios usados no se reutilizan.
async function borrarOficios() {
    const lista = documentos.value
    if (lista.length === 0) return
    const prefijo = config.value?.folio?.prefijo_default || 'P'
    const anioFolio = config.value?.folio?.anio || new Date().getFullYear()
    const conFolio = lista.filter(d => Number(d.campos?.numero_oficio) > 0)
        .sort((a, b) => Number(a.campos.numero_oficio) - Number(b.campos.numero_oficio))
    const folio = (d) => folioDelDocumento(d, prefijo, anioFolio)
    const rango = conFolio.length
        ? `Folios: ${folio(conFolio[0])}${conFolio.length > 1 ? ` a ${folio(conFolio[conFolio.length - 1])}` : ''}\n`
        : ''
    if (!confirm(`¿Borrar los ${lista.length} oficio(s) de tutoría de ${titulo.value}?\n${rango}\nLos grupos y tutores NO se tocan.\nLos números de folio ya usados no se reutilizan.\n\nEsta acción no se puede deshacer.`)) return
    borrando.value = true
    for (const d of lista) {
        await eliminarDocumento(d.id)
    }
    const borrados = new Set(lista.map(d => d.id))
    todos.value = todos.value.filter(d => !borrados.has(d.id))
    borrando.value = false
}

function imprimirTodos() {
    imprimirConTitulo(`tutorias_${seleccion.value?.periodo}_${seleccion.value?.anio}`)
}
</script>

<template>
    <div class="modal-impresion">
        <div class="no-print d-flex flex-wrap gap-2 justify-content-between align-items-center p-3 border-bottom bg-dark">
            <div class="d-flex flex-wrap align-items-center gap-2">
                <h6 class="text-white m-0">
                    Tutorías <template v-if="!soloCompartidos">  {{ titulo }}</template>
                    <span class="text-white-50 small">
                        ({{ documentos.length }} documento{{ documentos.length === 1 ? '' : 's' }})
                    </span>
                </h6>
                <select v-if="soloCompartidos && periodos.length" v-model="claveSeleccion"
                    class="form-select form-select-sm w-auto" aria-label="Periodo">
                    <option v-for="p in periodos" :key="claveDe(p)" :value="claveDe(p)">
                        {{ etiquetaPeriodo(p.periodo, p.anio) }}
                    </option>
                </select>
                <span v-if="soloCompartidos" class="badge text-bg-secondary">
                    
                </span>
            </div>

            <!-- Separado de Cerrar/Imprimir para no presionarlo por error. -->
            <button v-if="puedeBorrar" class="btn btn-danger btn-sm" :disabled="documentos.length === 0 || borrando"
                @click="borrarOficios" title="Por si se generaron por error. Los grupos y tutores no se tocan.">
                <span v-if="borrando" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-trash me-1"></i> Borrar estos oficios
            </button>

            <div class="d-flex gap-2">
                <button class="btn btn-danger btn-sm" @click="emit('cerrar')">
                    <i class="bi bi-x-lg"></i> Cerrar
                </button>
                <button class="btn btn-primary btn-sm" :disabled="documentos.length === 0" @click="imprimirTodos">
                    <i class="bi bi-printer me-1"></i> Imprimir / Guardar PDF 
                </button>
            </div>
        </div>

        <div v-if="cargando" class="text-center py-5"><span class="spinner-border text-light"></span></div>
        <div v-else class="p-4">
            <p v-if="documentos.length === 0" class="text-white-50 text-center py-5 no-print">
                {{ soloCompartidos ? 'No tienes oficios de Tutorías compartidos.' : 'No hay documentos de Tutorías generados para este periodo todavía.' }}
            </p>
            <template v-for="(doc, i) in documentos" :key="doc.id">
                <!-- Cada oficio con SU formato guardado + salto de página entre ellos. -->
                <div class="bg-white border rounded p-4 documento-carta"
                    :style="[variablesDeEstilo(estiloDe(doc, config)), i < documentos.length - 1 ? { pageBreakAfter: 'always' } : {}]"
                    style="color:#333;" v-html="doc.cuerpo"></div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.modal-impresion {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .85);
    z-index: 1050;
    overflow-y: auto;
}

@media print {
    .modal-impresion {
        position: static !important;
        background: none !important;
        overflow: visible !important;
    }
}
</style>