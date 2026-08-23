<script setup>
// Botones "Compartir" y "Pedir corrección" para Secretaria/Apoyo.
// La lógica vive en Bitacora.vue, aquí solo se muestran los botones.
defineProps({
    doc: { type: Object, required: true },
    puedeCompartir: { type: Boolean, default: false },
    puedeCorregir: { type: Boolean, default: false },
})
defineEmits(['compartir', 'corregir'])
</script>

<template>
    <button v-if="puedeCompartir" class="btn btn-sm"
        :class="doc.visibleParaSecretaria ? 'btn-info' : 'btn-outline-info'"
        :title="doc.visibleParaSecretaria ? 'Compartido con Secretaria (puede ver y editar) — clic para ocultarlo' : 'Compartir con Secretaria (podrá ver y editar)'"
        @click="$emit('compartir')">
        <i class="bi bi-share"></i>
    </button>
    <button v-if="puedeCorregir" class="btn btn-sm btn-outline-warning"
        title="Pedir corrección — envía una nota explicando qué corregir"
        @click="$emit('corregir')">
        <i class="bi bi-chat-left-text"></i>
    </button>
</template>