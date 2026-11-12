<script setup>
// Final común del formulario: Nota de copia (C.c.p.) + botón Generar.
import NotaCcp from '@/components/NotaCcp.vue'

defineProps({
    campos: { type: Object, required: true },
    personas: { type: Array, default: () => [] },
    cargando: { type: Boolean, default: false },
    texto: { type: String, default: 'Generar Documento' },
})

defineEmits(['generar'])
</script>

<template>
    <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
        :personas="personas" />

    <button class="btn btn-primary w-100 mt-2" @click="$emit('generar')" :disabled="cargando">
        <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
        <i v-else class="bi bi-file-earmark-check me-2"></i>
        {{ cargando ? 'Generando...' : texto }}
    </button>
</template>
