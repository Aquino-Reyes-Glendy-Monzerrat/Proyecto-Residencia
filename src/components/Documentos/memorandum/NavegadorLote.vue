<script setup>
defineProps({
    lote: { type: Object, required: true },
})
</script>

<template>
    <div v-if="lote.total > 1" class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" title="Anterior"
            :disabled="lote.indiceVista === 0" @click="lote.mostrar(lote.indiceVista - 1)">
            <i class="bi bi-chevron-left"></i>
        </button>
        <span class="small">
            <strong>{{ lote.indiceVista + 1 }} de {{ lote.total }}</strong>
            · {{ lote.filas[lote.indiceVista]?.docente.nombre }}
        </span>
        <button type="button" class="btn btn-sm btn-outline-secondary" title="Siguiente"
            :disabled="lote.indiceVista >= lote.total - 1" @click="lote.mostrar(lote.indiceVista + 1)">
            <i class="bi bi-chevron-right"></i>
        </button>
    </div>
</template>
