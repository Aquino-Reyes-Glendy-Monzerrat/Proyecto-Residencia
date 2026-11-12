<script setup>
import { ref, computed } from 'vue'
import SelectorAnio from './SelectorAnio.vue'
import {
    VISTAS, SEMESTRES, MESES_CORTOS, hoyDia, partesDe, periodoDe, moverPeriodo, empiezaEnElFuturo,
    limitarDia, mismoDiaEnAnio, semestreDe, semanasDelCalendario, nombreDelDia, nombreDelMes,
} from '@/utils/periodosEstadistica.js'

const props = defineProps({
    modelValue: { type: Object, required: true },
    vistas: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])

const hoy = hoyDia()
const deHoy = partesDe(hoy)
const vista = computed(() => props.modelValue.vista)
const dia = computed(() => props.modelValue.dia)
const fecha = computed(() => partesDe(dia.value))

function cambiar(cambios) {
    abierto.value = false
    emit('update:modelValue', { ...props.modelValue, ...cambios })
}

const anio = computed({
    get: () => fecha.value.anio,
    set: (nuevo) => cambiar({ dia: mismoDiaEnAnio(dia.value, nuevo, vista.value, hoy) }),
})

function elegirVista(v) {
    cambiar({ vista: v, dia: limitarDia(dia.value, v, hoy) })
}

const semestreActual = computed(() => semestreDe(dia.value).semestre.clave)
function elegirSemestre(s) {
    cambiar({ dia: limitarDia(Date.UTC(fecha.value.anio, s.meses[0], 1), vista.value, hoy) })
}


const conCalendario = computed(() => ['mes', 'semana', 'dia'].includes(vista.value))
const etiquetaPeriodo = computed(() => periodoDe(vista.value, dia.value).sub)
const siguienteDesactivado = computed(() =>
    empiezaEnElFuturo(vista.value, moverPeriodo(vista.value, dia.value, 1), hoy))

function mover(paso) {
    if (paso > 0 && siguienteDesactivado.value) return
    cambiar({ dia: moverPeriodo(vista.value, dia.value, paso) })
}

const abierto = ref(false)
const mesVisible = ref({ anio: 0, mes: 0 }) 

function alternarCalendario() {
    mesVisible.value = { anio: fecha.value.anio, mes: fecha.value.mes }
    abierto.value = !abierto.value
}

function moverMesVisible(paso) {
    const p = partesDe(Date.UTC(mesVisible.value.anio, mesVisible.value.mes + paso, 1))
    mesVisible.value = { anio: p.anio, mes: p.mes }
}

const meses = computed(() => MESES_CORTOS.map((corto, m) => {
    const inicio = Date.UTC(fecha.value.anio, m, 1)
    return { m, corto: corto.toLowerCase(), inicio, desactivado: inicio > hoy, esHoy: fecha.value.anio === deHoy.anio && m === deHoy.mes }
}))

const tituloCalendario = computed(() => nombreDelMes(mesVisible.value.mes)
    + (mesVisible.value.anio !== fecha.value.anio ? ` ${mesVisible.value.anio}` : ''))


const elegido = computed(() => {
    const p = periodoDe(vista.value, dia.value)
    return vista.value === 'semana' ? { ini: p.ini, fin: p.fin } : { ini: dia.value, fin: dia.value + 1 }
})

const semanas = computed(() => semanasDelCalendario(mesVisible.value.anio, mesVisible.value.mes).map(semana =>
    semana.map(d => ({
        d,
        numero: partesDe(d).dia,
        etiqueta: `${nombreDelDia(d)} de ${partesDe(d).anio}`,
        fuera: partesDe(d).mes !== mesVisible.value.mes,
        seleccionado: d >= elegido.value.ini && d < elegido.value.fin,
        desactivado: d > hoy,
    }))))

function elegirDia(d) {
    cambiar({ dia: limitarDia(d, vista.value, hoy) })
}

function irAHoy() {
    cambiar({ dia: limitarDia(hoy, vista.value, hoy) })
}
</script>

<template>
    <div class="d-flex flex-wrap align-items-center gap-2 column-gap-3">
        <SelectorAnio v-model="anio" :maximo="deHoy.anio" />

        <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="small fw-semibold">Ver por</span>
            <div class="btn-group btn-group-sm" role="group" aria-label="Ver por">
                <button v-for="v in vistas" :key="v" type="button" class="btn"
                    :class="v === vista ? 'btn-primary' : 'btn-outline-primary'" :aria-pressed="v === vista"
                    @click="elegirVista(v)">{{ VISTAS[v] }}</button>
            </div>
        </div>

        <div v-if="vista === 'semestre'" class="btn-group btn-group-sm" role="group" aria-label="Semestre">
            <button v-for="s in SEMESTRES" :key="s.clave" type="button" class="btn"
                :class="s.clave === semestreActual ? 'btn-primary' : 'btn-outline-primary'"
                :aria-pressed="s.clave === semestreActual" @click="elegirSemestre(s)">{{ s.etiqueta }}</button>
        </div>

        <div v-else-if="conCalendario" class="selector-calendario">
            <button type="button" class="btn btn-outline-secondary btn-sm" aria-label="Periodo anterior"
                @click="mover(-1)"><i class="bi bi-chevron-left"></i></button>
            <button type="button" class="btn btn-outline-secondary boton-calendario boton-periodo"
                aria-haspopup="dialog" :aria-expanded="abierto" @click="alternarCalendario">
                {{ etiquetaPeriodo }}
                <i class="bi bi-chevron-down small"></i>
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" aria-label="Periodo siguiente"
                :disabled="siguienteDesactivado" @click="mover(1)"><i class="bi bi-chevron-right"></i></button>

            <template v-if="abierto">
                <div class="calendario-fondo" @click="abierto = false"></div>
                <div class="calendario-popover calendario-popover-dias" role="dialog" aria-label="Elegir periodo"
                    @keydown.esc="abierto = false">

                    <div v-if="vista === 'mes'" class="calendario-rejilla">
                        <button v-for="m in meses" :key="m.m" type="button" class="calendario-celda"
                            :class="{ seleccionado: m.m === fecha.mes, hoy: m.esHoy }"
                            :disabled="m.desactivado" :aria-pressed="m.m === fecha.mes"
                            @click="elegirDia(m.inicio)">{{ m.corto }}</button>
                    </div>

                    <template v-else>
                        <div class="calendario-encabezado">
                            <span class="fw-bold">{{ tituloCalendario }}</span>
                            <span>
                                <button type="button" class="calendario-flecha" aria-label="Mes anterior"
                                    @click="moverMesVisible(-1)"><i class="bi bi-chevron-up"></i></button>
                                <button type="button" class="calendario-flecha" aria-label="Mes siguiente"
                                    @click="moverMesVisible(1)"><i class="bi bi-chevron-down"></i></button>
                            </span>
                        </div>
                        <div class="calendario-dias-semana">
                            <span>lu</span><span>ma</span><span>mi</span><span>ju</span><span>vi</span><span>sá</span><span>do</span>
                        </div>
                        <div v-for="(semana, i) in semanas" :key="i" class="calendario-semana"
                            :class="{ 'por-semana': vista === 'semana' }">
                            <button v-for="c in semana" :key="c.d" type="button" class="calendario-celda calendario-dia"
                                :class="{ seleccionado: c.seleccionado, hoy: c.d === hoy, fuera: c.fuera, banda: vista === 'semana' }"
                                :disabled="c.desactivado" :aria-pressed="c.seleccionado" :aria-label="c.etiqueta"
                                @click="elegirDia(c.d)">{{ c.numero }}</button>
                        </div>
                    </template>

                    <div class="calendario-pie">
                        <span class="small text-muted">
                            {{ vista === 'mes' ? 'Elige un mes.' : vista === 'semana' ? 'Clic en un día para elegir su semana.' : 'Elige un día.' }}
                        </span>
                        <button type="button" class="btn btn-outline-primary btn-sm" @click="irAHoy">Hoy</button>
                    </div>
                </div>
            </template>
        </div>
        
        <slot />
    </div>
</template>
