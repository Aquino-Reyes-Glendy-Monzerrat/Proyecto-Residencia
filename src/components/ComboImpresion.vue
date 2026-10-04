<script setup>
// Las 2 mitades del memo combinado, solo para imprimir.
// Los estilos .combo-wrapper viven en style.css (globales).
import { variablesDeEstilo } from '@/utils/estiloDocumento.js'

defineProps({
    htmlPrimero: { type: String, default: '' },
    htmlSegundo: { type: String, default: '' },
    // Formato guardado de cada memo (ver utils/estiloDocumento.js).
    estiloPrimero: { type: Object, default: null },
    estiloSegundo: { type: Object, default: null },
})
</script>

<template>
    <div class="combo-wrapper">
        <div class="bg-white border rounded documento-carta" :style="variablesDeEstilo(estiloPrimero)"
            v-html="htmlPrimero"></div>
        <div class="bg-white border rounded documento-carta combo-segunda-incidencia"
            :style="variablesDeEstilo(estiloSegundo)" v-html="htmlSegundo"></div>
    </div>
</template>