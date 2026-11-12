<script setup>
import { ref, computed } from 'vue'
import SelectorPeriodo from './SelectorPeriodo.vue'
import FiltroSelect from './FiltroSelect.vue'
import ResumenDatos from './ResumenDatos.vue'
import GraficaBarras from './GraficaBarras.vue'
import LeyendaColores from './LeyendaColores.vue'
import ListaConteo from './ListaConteo.vue'
import { hoyDia, partesDe, periodoDe, SEMESTRES } from '@/utils/periodosEstadistica.js'
import {
    ACTIVIDAD_TUTORIA, claveDeTipo, etiquetaDeTipo, opcionesDeCatalogo, agruparPor, conteoOrdenado, alumnosDistintos,
    juntarNombres, resumenPorMaestro, nombreConGrado, etiquetaDeOpcion,
} from '@/utils/estadisticas.js'

const props = defineProps({
    constancias: { type: Array, required: true },
    actividadesCatalogo: { type: Array, required: true },
    opcionesMaestros: { type: Array, required: true },
    totalDocentes: { type: Number, required: true },
})

const VISTAS = ['anio', 'semestre']
const LEYENDA = [{ clase: 'parte-fuerte', etiqueta: 'Alumnos' }, { clase: 'parte-clara', etiqueta: 'Constancias' }]
const hoy = hoyDia()

const periodo = ref({ vista: 'anio', dia: hoy })
const actividad = ref('')
const maestro = ref('')
const busqueda = ref('')

const per = computed(() => periodoDe(periodo.value.vista, periodo.value.dia))
const opcionesActividad = computed(() => opcionesDeCatalogo(
    props.actividadesCatalogo, props.constancias.map(c => c.actividad), { primeros: [ACTIVIDAD_TUTORIA] }))

const actividadDe = (c) => claveDeTipo(c.actividad)
const esDelSemestre = (c, s) => c.periodo === s.periodo && c.anio === s.anio
const enPeriodo = (c) => per.value.semestres.some(s => esDelSemestre(c, s))
const deActividad = (c) => !actividad.value || actividadDe(c) === actividad.value
const delMaestro = (c) => !maestro.value || c.docente.clave === maestro.value

const filtradas = computed(() => props.constancias.filter(c => enPeriodo(c) && delMaestro(c) && deActividad(c)))
const totalAlumnos = computed(() => alumnosDistintos(filtradas.value))

const deActividadYMaestro = computed(() => props.constancias.filter(c => deActividad(c) && delMaestro(c)))
const porSemestre = computed(() => {
    const anio = partesDe(periodo.value.dia).anio
    return [anio - 1, anio]
        .flatMap(a => SEMESTRES.map(s => ({ periodo: s.clave, anio: a, etiqueta: `${s.etiqueta} ${a}`, inicio: Date.UTC(a, s.meses[0], 1) })))
        .filter(s => s.inicio <= hoy)
        .map(s => {
            const lista = deActividadYMaestro.value.filter(c => esDelSemestre(c, s))
            const alumnos = alumnosDistintos(lista)
            return {
                etiqueta: s.etiqueta,
                valor: alumnos,
                destacada: per.value.semestres.some(p => p.periodo === s.periodo && p.anio === s.anio),
                grupo: [{ valor: alumnos, clase: LEYENDA[0].clase }, { valor: lista.length, clase: LEYENDA[1].clase }],
            }
        })
})


const actividadesDe = (lista) => juntarNombres(
    conteoOrdenado(agruparPor(lista, actividadDe), { etiquetaDe: etiquetaDeTipo }).map(a => a.etiqueta))


const porMaestro = computed(() => resumenPorMaestro(filtradas.value, alumnosDistintos))
const filasMaestros = computed(() => porMaestro.value.map(m => ({
    clave: m.clave, titulo: nombreConGrado(m), detalle: actividadesDe(m.lista), n: m.total,
})))

const filasAlumnos = computed(() => {
    const q = busqueda.value.trim().toLowerCase()
    return [...agruparPor(filtradas.value, c => c.alumno.clave).values()]
        .map(lista => ({ alumno: lista[0].alumno, lista }))
        .filter(({ alumno }) => !q || alumno.nombre.toLowerCase().includes(q) || alumno.numeroControl.includes(q))
        .map(({ alumno, lista }) => ({
            clave: alumno.clave,
            titulo: alumno.nombre,
            detalle: `${alumno.numeroControl} · ${actividadesDe(lista)}`,
            n: lista.length,
        }))
        .sort((a, b) => b.n - a.n || a.titulo.localeCompare(b.titulo, 'es'))
})


const resumen = computed(() => [
    { valor: totalAlumnos.value, etiqueta: 'Alumnos' },
    { valor: filtradas.value.length, etiqueta: 'Constancias' },
    !maestro.value && { valor: porMaestro.value.length, etiqueta: `Maestros que firman (de ${props.totalDocentes})` },
].filter(Boolean))

const hayFiltros = computed(() => !!(actividad.value || maestro.value || busqueda.value))
function limpiar() {
    actividad.value = ''
    maestro.value = ''
    busqueda.value = ''
}
</script>

<template>
    <div class="mb-3">
        <SelectorPeriodo v-model="periodo" :vistas="VISTAS">
            <FiltroSelect v-model="actividad" :opciones="opcionesActividad" todos="Todas las actividades"
                etiqueta="Actividad" />
            <FiltroSelect v-model="maestro" :opciones="opcionesMaestros" todos="Todos los maestros"
                etiqueta="Maestro" />
            <button v-if="hayFiltros" type="button" class="btn btn-link btn-sm shadow-none text-decoration-none"
                @click="limpiar">Quitar filtros</button>
        </SelectorPeriodo>
    </div>

    <section class="panel p-3 p-lg-4 mb-3">
        <ResumenDatos :datos="resumen" />
        <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mt-4">
            <p class="titulo-seccion">Alumnos y constancias por semestre</p>
            <LeyendaColores :items="LEYENDA" />
        </div>
        <GraficaBarras :barras="porSemestre" :alto="120" />
    </section>

    <div class="row g-3">
        <div v-if="!maestro" class="col-12 col-xl-6">
            <section class="panel p-3 p-lg-4 h-100">
                <ListaConteo titulo="Maestros" :filas="filasMaestros" clicable
                    vacio="No hay constancias en este periodo." @elegir="maestro = $event" />
            </section>
        </div>
        <div class="col-12" :class="{ 'col-xl-6': !maestro }">
            <section class="panel p-3 p-lg-4 h-100">
                <ListaConteo :titulo="maestro ? `Alumnos de ${etiquetaDeOpcion(opcionesMaestros, maestro)}` : 'Alumnos'"
                    :filas="filasAlumnos" :con-volver="!!maestro" vacio="No hay alumnos con estos filtros."
                    @volver="maestro = ''">
                    <input v-model="busqueda" type="search" class="form-control form-control-sm mb-2"
                        :class="{ 'filtro-activo': busqueda }" placeholder="Buscar nombre o núm. de control"
                        aria-label="Buscar alumno">
                </ListaConteo>
            </section>
        </div>
    </div>
</template>
