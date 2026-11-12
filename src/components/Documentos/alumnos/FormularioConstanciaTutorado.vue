<script setup>

import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { PERIODOS, periodoDeFecha } from '@/utils/periodosTutoria.js'
import { fechaEnLetras } from '@/utils/fechas.js'
import { getActividadesComplementarias } from '@/services/api.js'
import {
    CREDITOS_PERMITIDOS, NIVELES_DESEMPENO, MAX_DESCRIPCION,
    creditosTexto, actividadTexto, desempenoTexto, valorNumericoTexto,
} from '@/utils/constanciaCreditos.js'

const props = defineProps({
    campos: { type: Object, required: true },
    listaDocentes: { type: Array, default: () => [] },
    jefe: { type: Object, default: null },
    esActividad: { type: Boolean, default: false },
})

const anioActual = new Date().getFullYear()

// orden docentes 
const docentesOrdenados = computed(() =>
    [...props.listaDocentes].sort((a, b) => a.nombre.localeCompare(b.nombre)))

// catalogo de actividades
const actividades = ref([])
onMounted(async () => {
    try {
        actividades.value = (await getActividadesComplementarias())
            .map(a => a.valor)
            .sort((a, b) => a.localeCompare(b, 'es'))
    } catch (e) {
        console.error('No se pudo cargar el catálogo de actividades complementarias', e)
    }
})

// por si se edita un documento viejo cuya actividad ya no esta en el catalogo 
const opcionesActividad = computed(() => {
    const actual = props.campos.actividad_tipo
    return actual && !actividades.value.includes(actual) ? [actual, ...actividades.value] : actividades.value
})


const nombreNivel = (n) => n.charAt(0) + n.slice(1).toLowerCase()


watch(() => props.campos, (c) => {
    if (!c.periodo_escolar) c.periodo_escolar = periodoDeFecha().periodo
    if (!c.anio_escolar) c.anio_escolar = anioActual
    if (c.docente_tutor_id === undefined) c.docente_tutor_id = ''
    if (c.creditos === undefined) c.creditos = 1
    if (c.actividad_tipo === undefined) c.actividad_tipo = ''
    if (c.descripcion_actividad === undefined) c.descripcion_actividad = ''
    if (c.desempeno === undefined) c.desempeno = 'BUENO'
    if (c.valor_numerico === undefined) c.valor_numerico = ''
}, { immediate: true })


watchEffect(() => {
    const c = props.campos
    const periodo = PERIODOS[c.periodo_escolar]?.label || ''
    c.periodo_escolar_texto = periodo
        ? `${periodo.toLowerCase().replaceAll(' ', '')} ${c.anio_escolar || ''}`.trim()
        : ''
    c.fecha_letras = fechaEnLetras(c.fecha_documento)
    c.nombre_jefe_depto = props.jefe ? [props.jefe.grado, props.jefe.nombre].filter(Boolean).join(' ') : ''
    c.creditos_texto = creditosTexto(c.creditos)
    c.actividad_texto = actividadTexto(c.actividad_tipo, c.descripcion_actividad)
    c.desempeno_texto = desempenoTexto(c.desempeno)
    c.valor_numerico_texto = valorNumericoTexto(c.valor_numerico)
    
    const docente = props.listaDocentes.find(d => String(d.id) === String(c.docente_tutor_id))
    if (docente) {
        c.nombre_tutor = docente.nombre
        c.grado_tutor = docente.abreviatura || ''
    } else if (!c.docente_tutor_id) {
        c.nombre_tutor = ''
        c.grado_tutor = ''
    }
    
    c.nombre_docente_constancia = [c.grado_tutor, c.nombre_tutor].filter(Boolean).join(' ').toUpperCase()
})
</script>

<template>
    <template v-if="esActividad">
        <div class="mb-3">
            <label class="form-label" for="actividadTipo">Tipo de actividad</label>
            <select id="actividadTipo" class="form-select" v-model="campos.actividad_tipo">
                <option value="">Sin tipo (solo descripción)</option>
                <option v-for="a in opcionesActividad" :key="a" :value="a">{{ a }}</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label" for="descripcionActividad">Descripción <span class="text-danger">*</span></label>
            <textarea id="descripcionActividad" class="form-control" rows="2" v-model="campos.descripcion_actividad"
                :maxlength="MAX_DESCRIPCION" placeholder="Ej: Fundamentos de Estructura de Datos"></textarea>
        </div>
        <div class="row g-2 mb-3">
            <div class="col-7">
                <label class="form-label" for="desempeno">Nivel de desempeño</label>
                <select id="desempeno" class="form-select" v-model="campos.desempeno">
                    <option v-for="n in NIVELES_DESEMPENO" :key="n" :value="n">{{ nombreNivel(n) }}</option>
                </select>
            </div>
            <div class="col-5">
                <label class="form-label" for="valorNumerico">Valor numérico</label>
                <input id="valorNumerico" type="number" class="form-control" v-model.number="campos.valor_numerico"
                    min="0" step="any">
            </div>
        </div>
    </template>

    <div class="row g-2 mb-3">
        <div class="col-7">
            <label class="form-label">Periodo escolar <span class="text-danger">*</span></label>
            <select class="form-select" v-model="campos.periodo_escolar">
                <option v-for="(p, clave) in PERIODOS" :key="clave" :value="clave">{{ p.label }}</option>
            </select>
        </div>
        <div class="col-5">
            <label class="form-label">Año <span class="text-danger">*</span></label>
            <input type="number" class="form-control" v-model.number="campos.anio_escolar"
                min="2000" :max="anioActual + 1">
        </div>
    </div>

    <div class="mb-3">
        <span class="form-label d-block">Valor curricular <span class="text-danger">*</span></span>
        <div class="btn-group w-100" role="group" aria-label="Créditos">
            <template v-for="n in CREDITOS_PERMITIDOS" :key="n">
                <input :id="`creditos-${n}`" type="radio" class="btn-check" name="creditosConstancia" :value="n"
                    v-model="campos.creditos">
                <label class="btn btn-outline-primary" :for="`creditos-${n}`">{{ creditosTexto(n) }}</label>
            </template>
        </div>
    </div>

    <div class="mb-3">
        <label class="form-label" for="docenteConstancia">
            {{ esActividad ? 'Docente responsable de la actividad' : 'Docente tutor' }}<span class="text-danger">*</span>
        </label>
        <select id="docenteConstancia" class="form-select" v-model="campos.docente_tutor_id">
            <option value="">Selecciona un docente...</option>
            <option v-for="d in docentesOrdenados" :key="d.id" :value="d.id">
                {{ d.abreviatura ? d.abreviatura + ' ' : '' }}{{ d.nombre }}
            </option>
        </select>
    </div>
</template>