<script setup>
// Constancia de tutorado (créditos de actividad complementaria).

import { computed, watch, watchEffect } from 'vue'
import { PERIODOS, periodoDeFecha } from '@/utils/periodosTutoria.js'
import { fechaEnLetras } from '@/utils/fechas.js'

const props = defineProps({
    campos: { type: Object, required: true },
    listaDocentes: { type: Array, default: () => [] },
    jefe: { type: Object, default: null },
})

const anioActual = new Date().getFullYear()

const docentesOrdenados = computed(() =>
    [...props.listaDocentes].sort((a, b) => a.nombre.localeCompare(b.nombre)))

// Valores iniciales: solo si el campo no existe (al editar se respetan
// los guardados). También corre al "Limpiar formulario".
watch(() => props.campos, (c) => {
    if (!c.periodo_escolar) c.periodo_escolar = periodoDeFecha().periodo
    if (!c.anio_escolar) c.anio_escolar = anioActual
    if (c.docente_tutor_id === undefined) c.docente_tutor_id = ''
}, { immediate: true })

// Textos que usa la plantilla, calculados a partir de lo elegido.
watchEffect(() => {
    const c = props.campos
    const periodo = PERIODOS[c.periodo_escolar]?.label || ''
    c.periodo_escolar_texto = periodo
        ? `${periodo.toLowerCase().replaceAll(' ', '')} ${c.anio_escolar || ''}`.trim()
        : ''
    c.fecha_letras = fechaEnLetras(c.fecha_documento)
    c.nombre_jefe_depto = props.jefe ? [props.jefe.grado, props.jefe.nombre].filter(Boolean).join(' ') : ''

    const docente = props.listaDocentes.find(d => String(d.id) === String(c.docente_tutor_id))
    if (docente) {
        c.nombre_tutor = docente.nombre
        c.grado_tutor = docente.abreviatura || ''
    } else if (!c.docente_tutor_id) {
        c.nombre_tutor = ''
        c.grado_tutor = ''
    }
})
</script>

<template>
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
        <label class="form-label">Docente tutor<span class="text-danger">*</span></label>
        <select class="form-select" v-model="campos.docente_tutor_id">
            <option value="">Selecciona un docente...</option>
            <option v-for="d in docentesOrdenados" :key="d.id" :value="d.id">
                {{ d.abreviatura ? d.abreviatura + ' ' : '' }}{{ d.nombre }}
            </option>
        </select>
    </div>

    
</template>