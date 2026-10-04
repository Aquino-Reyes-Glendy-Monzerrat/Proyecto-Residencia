<script setup>
// Botones "Compartir" y "Pedir corrección" para Secretaria/Apoyo.
// La lógica vive en Bitacora.vue, aquí solo se muestran los botones.
import { computed } from 'vue'

const props = defineProps({
    doc: { type: Object, required: true },
    puedeCompartir: { type: Boolean, default: false },
    puedeCorregir: { type: Boolean, default: false },
})
defineEmits(['compartir', 'corregir'])


// 
const tituloCompartir = computed(() => {
    const permiso = props.doc.estado === 'autorizado' ? 'ver e imprimir' : 'ver y editar'
    return props.doc.visibleParaSecretaria
        ? `Compartido con Secretaria (puede ${permiso}) — clic para ocultarlo`
        : `Compartir con Secretaria (podrá ${permiso})`
})

</script>

<template>
    <button v-if="puedeCompartir" class="btn btn-sm"
        :class="doc.visibleParaSecretaria ? 'btn-info' : 'btn-outline-info'" :title="tituloCompartir"
        @click="$emit('compartir')">
        <i class="bi bi-share"></i>
    </button>
    <button v-if="puedeCorregir" class="btn btn-sm btn-outline-warning"
        title="Pedir corrección — envía una nota explicando qué corregir" @click="$emit('corregir')">
        <i class="bi bi-chat-left-text"></i>
    </button>
</template>