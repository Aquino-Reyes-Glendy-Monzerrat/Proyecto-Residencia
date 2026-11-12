<script setup>
import { ref, computed } from 'vue'
import SelectorPeriodo from './SelectorPeriodo.vue'
import FiltroSelect from './FiltroSelect.vue'
import ResumenDatos from './ResumenDatos.vue'
import GraficaBarras from './GraficaBarras.vue'
import ListaBarras from './ListaBarras.vue'
import ListaConteo from './ListaConteo.vue'
import { hoyDia, periodoDe } from '@/utils/periodosEstadistica.js'
import {
    claveDeTipo, etiquetaDeTipo, opcionesDeCatalogo, enPeriodo, agruparPor, conteoOrdenado, barrasPorColumna,
    masFrecuente, resumenPorMaestro, filasPorFecha, nombreConGrado, etiquetaDeOpcion,
} from '@/utils/estadisticas.js'

const props = defineProps({
    inasistencias: { type: Array, required: true },   
    tiposCatalogo: { type: Array, required: true },   
    opcionesMaestros: { type: Array, required: true },
    totalDocentes: { type: Number, required: true },
})

const VISTAS = ['anio', 'semestre', 'mes', 'semana', 'dia']
const UNIDAD = { anio: 'mes', semestre: 'mes', mes: 'semana', semana: 'día' }

const periodo = ref({ vista: 'anio', dia: hoyDia() })
const maestro = ref('')
const tipo = ref('')

const per = computed(() => periodoDe(periodo.value.vista, periodo.value.dia))
const unidad = computed(() => UNIDAD[periodo.value.vista])
const opcionesTipo = computed(() => opcionesDeCatalogo(props.tiposCatalogo, props.inasistencias.map(e => e.tipo)))
const tipoDe = (e) => claveDeTipo(e.tipo)
const contarTipos = (lista) => conteoOrdenado(agruparPor(lista, tipoDe), { etiquetaDe: etiquetaDeTipo })

const delMaestroEnPeriodo = computed(() => props.inasistencias.filter(e =>
    (!maestro.value || e.docente.clave === maestro.value) && enPeriodo(e.fecha, per.value)))
const filtradas = computed(() => delMaestroEnPeriodo.value.filter(e => !tipo.value || tipoDe(e) === tipo.value))


const porTipo = computed(() => contarTipos(delMaestroEnPeriodo.value))
const barras = computed(() => barrasPorColumna(filtradas.value, per.value.cols))
const porMaestro = computed(() => resumenPorMaestro(filtradas.value))


const resumen = computed(() => [
    { valor: filtradas.value.length, etiqueta: 'Inasistencias' },
    !maestro.value && { valor: porMaestro.value.length, etiqueta: `Maestros (de ${props.totalDocentes})` },
    !tipo.value && porTipo.value.length && { valor: masFrecuente(porTipo.value), etiqueta: 'Tipo más frecuente' },
].filter(Boolean))


const filasMaestros = computed(() => porMaestro.value.map(m => ({
    clave: m.clave,
    titulo: nombreConGrado(m),
    detalle: tipo.value ? '' : `Más frecuente: ${masFrecuente(contarTipos(m.lista))}`,
    n: m.total,
})))
const filasFechas = computed(() => filasPorFecha(filtradas.value, e => etiquetaDeTipo(tipoDe(e))))

const hayFiltros = computed(() => !!(maestro.value || tipo.value))
function limpiar() {
    maestro.value = ''
    tipo.value = ''
}
</script>

<template>
    <div class="mb-3">
        <SelectorPeriodo v-model="periodo" :vistas="VISTAS">
            <FiltroSelect v-model="maestro" :opciones="opcionesMaestros" todos="Todos los maestros" etiqueta="Maestro" />
            <FiltroSelect v-model="tipo" :opciones="opcionesTipo" todos="Todos los tipos" etiqueta="Tipo de incidencia" />
            <button v-if="hayFiltros" type="button" class="btn btn-link btn-sm shadow-none text-decoration-none"
                @click="limpiar">Quitar filtros</button>
        </SelectorPeriodo>
    </div>

    <section class="panel p-3 p-lg-4 mb-3">
        <ResumenDatos :datos="resumen" />
        <template v-if="unidad">
            <p class="titulo-seccion mt-4">Por {{ unidad }}</p>
            <GraficaBarras :barras="barras" />
        </template>
    </section>

    <div class="row g-3">
        <div class="col-12 col-xl-7">
            <section class="panel p-3 p-lg-4 h-100">
                <ListaConteo v-if="maestro" :titulo="`Fechas de ${etiquetaDeOpcion(opcionesMaestros, maestro)}`"
                    :filas="filasFechas" con-volver @volver="maestro = ''" />
                <ListaConteo v-else titulo="Maestros" :filas="filasMaestros" clicable @elegir="maestro = $event" />
            </section>
        </div>
        <div class="col-12 col-xl-5">
            <section class="panel p-3 p-lg-4 h-100">
                <p class="titulo-seccion">Tipos de incidencia</p>
                <ListaBarras :items="porTipo" :activo="tipo" :limite="6" @elegir="tipo = $event" />
            </section>
        </div>
    </div>
</template>
