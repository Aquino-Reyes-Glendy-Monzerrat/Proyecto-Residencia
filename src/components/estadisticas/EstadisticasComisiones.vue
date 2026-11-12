<script setup>
import { ref, computed } from 'vue'
import SelectorPeriodo from './SelectorPeriodo.vue'
import FiltroSelect from './FiltroSelect.vue'
import ResumenDatos from './ResumenDatos.vue'
import GraficaBarras from './GraficaBarras.vue'
import LeyendaColores from './LeyendaColores.vue'
import ListaConteo from './ListaConteo.vue'
import { hoyDia, periodoDe, nombreDelDia } from '@/utils/periodosEstadistica.js'
import {
    TIPO_COMISION_EXTERNA, enPeriodo, barrasPorColumna, resumenPorMaestro, filasPorFecha, nombreConGrado,
    etiquetaDeOpcion,
} from '@/utils/estadisticas.js'

const props = defineProps({
    externas: { type: Array, required: true },  
    internas: { type: Array, required: true },   
    opcionesMaestros: { type: Array, required: true },
    totalDocentes: { type: Number, required: true },
})

const VISTAS = ['anio', 'semestre', 'mes']
const UNIDAD = { anio: 'mes', semestre: 'mes', mes: 'semana' }
const LEYENDA = [{ clase: 'parte-fuerte', etiqueta: 'Externas' }, { clase: 'parte-clara', etiqueta: 'Internas' }]
const TIPOS = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'externa', etiqueta: 'Externas', title: 'Las firma el Director' },
    { valor: 'interna', etiqueta: 'Internas', title: 'Las firma el Jefe del Depto.' },
]

const tipo = ref('')
const periodo = ref({ vista: 'anio', dia: hoyDia() })
const maestro = ref('')

const per = computed(() => periodoDe(periodo.value.vista, periodo.value.dia))
const esExterna = (e) => e.tipo === TIPO_COMISION_EXTERNA
const externasDe = (lista) => lista.filter(esExterna).length
const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? '' : 's'}`

const delTipo = computed(() => ({ '': [...props.externas, ...props.internas], externa: props.externas, interna: props.internas })[tipo.value])
const filtradas = computed(() => delTipo.value.filter(e =>
    (!maestro.value || e.docente.clave === maestro.value) && enPeriodo(e.fecha, per.value)))


const barras = computed(() => {
    const total = barrasPorColumna(filtradas.value, per.value.cols)
    if (tipo.value) return total
    const ext = barrasPorColumna(filtradas.value.filter(esExterna), per.value.cols)
    return total.map((b, k) => ({
        ...b,
        partes: [{ clase: LEYENDA[0].clase, valor: ext[k].valor }, { clase: LEYENDA[1].clase, valor: b.valor - ext[k].valor }],
    }))
})

const porMaestro = computed(() => resumenPorMaestro(filtradas.value))

const resumen = computed(() => {
    const ext = externasDe(filtradas.value)
    return [
        { valor: filtradas.value.length, etiqueta: `${tipo.value ? TIPOS.find(t => t.valor === tipo.value).etiqueta : 'Comisiones'} firmadas` },
        !tipo.value && { valor: ext, etiqueta: 'Externas' },
        !tipo.value && { valor: filtradas.value.length - ext, etiqueta: 'Internas' },
        !maestro.value && { valor: porMaestro.value.length, etiqueta: `Maestros (de ${props.totalDocentes})` },
    ].filter(Boolean)
})


function detalleMaestro(lista) {
    if (tipo.value) return `Última: ${nombreDelDia(Math.max(...lista.map(e => e.fecha)))}`
    const ext = externasDe(lista)
    return [ext && plural(ext, 'externa'), lista.length - ext && plural(lista.length - ext, 'interna')]
        .filter(Boolean).join(' · ')
}
const filasMaestros = computed(() => porMaestro.value.map(m => ({
    clave: m.clave, titulo: nombreConGrado(m), detalle: detalleMaestro(m.lista), n: m.total,
})))
const filasComisiones = computed(() => filasPorFecha(filtradas.value, e =>
    [esExterna(e) ? 'Externa' : 'Interna', e.actividad, e.destino].filter(Boolean).join(' · ')))
</script>

<template>
    <div class="d-flex flex-wrap align-items-center gap-2 column-gap-3 mb-3">
        <div class="btn-group btn-group-sm" role="group" aria-label="Tipo de comisión">
            <button v-for="t in TIPOS" :key="t.valor" type="button" class="btn" :title="t.title"
                :class="t.valor === tipo ? 'btn-primary' : 'btn-outline-primary'" :aria-pressed="t.valor === tipo"
                @click="tipo = t.valor">{{ t.etiqueta }}</button>
        </div>
        <SelectorPeriodo v-model="periodo" :vistas="VISTAS">
            <FiltroSelect v-model="maestro" :opciones="opcionesMaestros" todos="Todos los maestros" etiqueta="Maestro" />
            <button v-if="maestro" type="button" class="btn btn-link btn-sm shadow-none text-decoration-none"
                @click="maestro = ''">Quitar filtros</button>
        </SelectorPeriodo>
    </div>

    <section class="panel p-3 p-lg-4 mb-3">
        <ResumenDatos :datos="resumen" />
        <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mt-4">
            <p class="titulo-seccion">Por {{ UNIDAD[periodo.vista] }}</p>
            <LeyendaColores v-if="!tipo" :items="LEYENDA" />
        </div>
        <GraficaBarras :barras="barras" />
    </section>

    <section class="panel p-3 p-lg-4">
        <ListaConteo v-if="maestro" :titulo="`Comisiones de ${etiquetaDeOpcion(opcionesMaestros, maestro)}`"
            :filas="filasComisiones" con-volver @volver="maestro = ''" />
        <ListaConteo v-else titulo="Maestros" :filas="filasMaestros" clicable @elegir="maestro = $event" />
    </section>
</template>
