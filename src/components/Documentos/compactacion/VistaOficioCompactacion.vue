<script setup>
// Vista previa del Oficio de compactación en HOJAS

import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { fechaConBarras } from '@/utils/fechas.js'
import { CIUDAD_FECHA } from '@/utils/encabezadoOficio.js'
import { TEXTO_INTRO, PUNTOS, TEXTO_CIERRE, horarioTexto, apellidosPrimero, repartirEnHojas } from '@/utils/oficioCompactacion.js'

const props = defineProps({
    filas: { type: Array, default: () => [] },          
    fecha: { type: String, default: '' },               
    oficio: { type: String, default: '' },              
    destinatario: { type: Object, default: null },     
    jefe: { type: Object, default: null },              
    notaCcp: { type: String, default: '' },
    headerImg: { type: String, default: '' },
    pieImg: { type: String, default: '' },
    estilo: { type: Object, default: () => ({}) },      
})


const PX_POR_MM = 96 / 25.4
const ALTO_HOJA_MM = 279
// Margen de seguridad por hoja: al imprimir el ancho real puede variar
// un poco y una línea de más no debe empujar el pie a otra página.
const RESERVA_MM = 6

const fechaTexto = computed(() => props.fecha ? fechaConBarras(props.fecha) : 'DD/MM/AAAA')
const nombreCompleto = (p) => [p?.grado, p?.nombre].filter(Boolean).join(' ')

// ── Reparto en hojas ──
const medidor = ref(null)
const hojas = ref([])

// Mientras no se ha medido (o si cambió el número de filas y falta
// volver a medir) se muestra todo en una hoja.
const hojasVisibles = computed(() => {
    const total = hojas.value.reduce((n, h) => n + h.filas.length, 0)
    const lista = total === props.filas.length && hojas.value.length
        ? hojas.value
        : [{ filas: props.filas.map((_, i) => i), primera: true, ultima: true }]
    return lista.map(h => ({ ...h, filasDatos: h.filas.map(i => props.filas[i]) }))
})

function alto(parte) {
    return medidor.value?.querySelector(`[data-parte="${parte}"]`)?.offsetHeight || 0
}

function medir() {
    const raiz = medidor.value
    // Sin alto = oculto (p. ej. al imprimir): no hay nada que medir y se
    // conserva el último reparto.
    if (!raiz || !raiz.offsetHeight) return
    const estilo = getComputedStyle(raiz)
    const util = (ALTO_HOJA_MM - RESERVA_MM) * PX_POR_MM
        - parseFloat(estilo.paddingTop || 0) - parseFloat(estilo.paddingBottom || 0) - alto('pie')
    const nuevas = repartirEnHojas({
        util,
        encabezado: alto('encabezado'),
        inicio: alto('inicio'),
        thead: alto('thead'),
        filas: [...raiz.querySelectorAll('[data-parte="fila"]')].map(el => el.offsetHeight),
        cierre: alto('cierre'),
    })
    // Solo si cambió, para no repintar las hojas de más.
    if (JSON.stringify(nuevas) !== JSON.stringify(hojas.value)) hojas.value = nuevas
}

const medirDespues = () => nextTick(medir)

watch(() => [props.filas, props.notaCcp, props.estilo, props.destinatario, props.jefe, props.headerImg, props.pieImg],
    medirDespues, { deep: true })

// Escala en pantalla 

const marco = ref(null)
const contenedorHojas = ref(null)
const escala = ref(1)
const tamanoNatural = ref({ ancho: 0, alto: 0 })

function ajustarEscala() {
    const disponible = marco.value?.parentElement?.clientWidth || 0
    const ancho = contenedorHojas.value?.querySelector('.hoja-oficio')?.offsetWidth || 0
    if (!disponible || !ancho) return
    escala.value = Math.min(1, disponible / ancho)
    tamanoNatural.value = { ancho, alto: contenedorHojas.value.offsetHeight }
}


const estiloMarco = computed(() => escala.value < 1
    ? { width: `${tamanoNatural.value.ancho * escala.value}px`, height: `${tamanoNatural.value.alto * escala.value}px` }
    : {})
const estiloEscala = computed(() => escala.value < 1
    ? { width: `${tamanoNatural.value.ancho}px`, transform: `scale(${escala.value})`, transformOrigin: 'top left' }
    : {})

let observador = null
let observadorEscala = null
onMounted(() => {
    medirDespues()
    if (typeof ResizeObserver !== 'undefined') {
        if (medidor.value) {
            observador = new ResizeObserver(() => medir())
            observador.observe(medidor.value)
        }
        observadorEscala = new ResizeObserver(() => ajustarEscala())
        if (marco.value?.parentElement) observadorEscala.observe(marco.value.parentElement)
        if (contenedorHojas.value) observadorEscala.observe(contenedorHojas.value)
    }
    nextTick(ajustarEscala)
    document.fonts?.ready?.then(medir).catch(() => { })
})
onBeforeUnmount(() => {
    observador?.disconnect()
    observadorEscala?.disconnect()
})

</script>

<template>
      
    <div ref="marco" class="marco-hojas" :style="estiloMarco">
    <div ref="contenedorHojas" class="hojas-oficio" :style="[estilo, estiloEscala]">
        <div v-for="(hoja, h) in hojasVisibles" :key="h" class="bg-white border rounded documento-carta hoja-oficio">
            <div class="bloque-oficio">
                <div class="w-100 mb-3 pb-2 encabezado-doc">
                    <img :src="headerImg" class="header-doc-img" alt="Encabezado Institucional SEP TecNM">
                </div>
            </div>

            <div v-if="hoja.primera" class="bloque-oficio">
                <div class="text-end mb-3 texto-encabezado">
                    {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{ fechaTexto }}</span><br>
                    Oficio No. {{ oficio }}
                </div>
                <div class="mb-3 texto-destinatario">
                    <strong>{{ nombreCompleto(destinatario) }}</strong><br>
                    <strong>{{ destinatario?.puesto }}</strong><br>
                    <strong>P R E S E N T E</strong>
                </div>
                <div class="texto-cuerpo">
                    <p class="mb-2">{{ TEXTO_INTRO }}</p>
                    <ol class="mb-3">
                        <li v-for="punto in PUNTOS" :key="punto">{{ punto }}</li>
                    </ol>
                </div>
            </div>

            <table v-if="hoja.primera || hoja.filasDatos.length" class="tabla-compactacion texto-cuerpo">
                <colgroup>
                    <col class="col-nombre"><col class="col-horario"><col class="col-fecha"><col class="col-fecha"><col>
                </colgroup>
                <thead v-if="hoja.primera">
                    <tr>
                        <th class="doc-celda">Nombre</th>
                        <th class="doc-celda">Horario</th>
                        <th class="doc-celda">Fecha inicio</th>
                        <th class="doc-celda">Fecha final</th>
                        <th class="doc-celda">Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="fila in hoja.filasDatos" :key="fila.memoId">
                        <td class="doc-celda">{{ apellidosPrimero(fila.nombre) }}</td>
                        <td class="doc-celda text-center">{{ horarioTexto(fila.hora_entrada, fila.hora_salida) }}</td>
                        <td class="doc-celda text-center">{{ fechaConBarras(fila.fecha_inicio) }}</td>
                        <td class="doc-celda text-center">{{ fechaConBarras(fila.fecha_fin) }}</td>
                        <td class="doc-celda">{{ fila.observaciones }}</td>
                    </tr>
                    <tr v-if="hoja.primera && !filas.length">
                        <td class="doc-celda text-center text-muted" colspan="5">Trae los memos para llenar la tabla</td>
                    </tr>
                </tbody>
            </table>

            <div v-if="hoja.ultima" class="bloque-oficio">
                <p class="texto-cuerpo mt-3 mb-0">{{ TEXTO_CIERRE }}</p>
                <div class="mt-4 texto-firma">
                    <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
                    <div class="texto-lema">Excelencia en Educación Tecnológica®</div>
                    <div class="texto-lema-secundario">Cultura, Ciencia y Tecnología para la Superación de México®</div>
                    <strong>{{ nombreCompleto(jefe) }}</strong><br>
                    <strong>{{ jefe?.puesto }}</strong>
                </div>
                <div v-if="notaCcp" class="mt-4">
                    <span class="texto-ccp" v-html="notaCcp"></span>
                </div>
            </div>

            <div class="w-100 text-center pie-fijo" style="font-size: 10px; line-height: 1.3;">
                <img :src="pieImg" alt="Pie de página" class="pie-doc-img">
            </div>
        </div>
    </div>
    </div>

    <!-- Copia oculta para medir: mismo formato, todo en una sola tira. -->
    <div ref="medidor" class="documento-carta hoja-medidor no-print" :style="estilo" aria-hidden="true">
        <div class="bloque-oficio" data-parte="encabezado">
            <div class="w-100 mb-3 pb-2 encabezado-doc">
                <img :src="headerImg" class="header-doc-img" alt="" @load="medir">
            </div>
        </div>
        <div class="bloque-oficio" data-parte="inicio">
            <div class="text-end mb-3 texto-encabezado">
                {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{ fechaTexto }}</span><br>
                Oficio No. {{ oficio }}
            </div>
            <div class="mb-3 texto-destinatario">
                <strong>{{ nombreCompleto(destinatario) }}</strong><br>
                <strong>{{ destinatario?.puesto }}</strong><br>
                <strong>P R E S E N T E</strong>
            </div>
            <div class="texto-cuerpo">
                <p class="mb-2">{{ TEXTO_INTRO }}</p>
                <ol class="mb-3">
                    <li v-for="punto in PUNTOS" :key="punto">{{ punto }}</li>
                </ol>
            </div>
        </div>
        <table class="tabla-compactacion texto-cuerpo">
            <colgroup>
                <col class="col-nombre"><col class="col-horario"><col class="col-fecha"><col class="col-fecha"><col>
            </colgroup>
            <thead data-parte="thead">
                <tr>
                    <th class="doc-celda">Nombre</th>
                    <th class="doc-celda">Horario</th>
                    <th class="doc-celda">Fecha inicio</th>
                    <th class="doc-celda">Fecha final</th>
                    <th class="doc-celda">Observaciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="fila in filas" :key="fila.memoId" data-parte="fila">
                    <td class="doc-celda">{{ apellidosPrimero(fila.nombre) }}</td>
                    <td class="doc-celda text-center">{{ horarioTexto(fila.hora_entrada, fila.hora_salida) }}</td>
                    <td class="doc-celda text-center">{{ fechaConBarras(fila.fecha_inicio) }}</td>
                    <td class="doc-celda text-center">{{ fechaConBarras(fila.fecha_fin) }}</td>
                    <td class="doc-celda">{{ fila.observaciones }}</td>
                </tr>
            </tbody>
        </table>
        <div class="bloque-oficio" data-parte="cierre">
            <p class="texto-cuerpo mt-3 mb-0">{{ TEXTO_CIERRE }}</p>
            <div class="mt-4 texto-firma">
                <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
                <div class="texto-lema">Excelencia en Educación Tecnológica®</div>
                <div class="texto-lema-secundario">Cultura, Ciencia y Tecnología para la Superación de México®</div>
                <strong>{{ nombreCompleto(jefe) }}</strong><br>
                <strong>{{ jefe?.puesto }}</strong>
            </div>
            <div v-if="notaCcp" class="mt-4">
                <span class="texto-ccp" v-html="notaCcp"></span>
            </div>
        </div>
        <div class="bloque-oficio w-100 text-center" data-parte="pie" style="font-size: 10px; line-height: 1.3;">
            <img :src="pieImg" alt="" class="pie-doc-img" @load="medir">
        </div>
    </div>
</template>

<style scoped>

.hoja-medidor {
    position: fixed;
    left: -10000px;
    top: 0;
    visibility: hidden;
    pointer-events: none;
    display: block !important;
    min-height: 0 !important;
}

@media print {
    .hoja-medidor {
        display: none !important;
    }
    
    .marco-hojas {
        width: auto !important;
        height: auto !important;
    }
    .hojas-oficio {
        width: auto !important;
        transform: none !important;
    }
}

</style>