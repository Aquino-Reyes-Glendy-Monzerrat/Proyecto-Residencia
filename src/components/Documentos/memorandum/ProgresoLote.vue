<script setup>

defineProps({
    lote: { type: Object, required: true },
})
</script>

<template>
    <div v-if="lote.generando" class="lote-progreso" role="status" aria-live="polite">
        <div class="lote-progreso-caja">
            <div class="fw-semibold mb-2">Generando y firmando memos… {{ lote.procesados }} de {{ lote.total }}</div>
            <div class="progress mb-3" style="height: 8px">
                <div class="progress-bar" :style="{ width: `${Math.round(lote.procesados / lote.total * 100)}%` }"></div>
            </div>
            <ul class="list-unstyled small mb-2">
                <li v-for="fila in lote.filas" :key="fila.docente.id" class="mb-1">
                    <i v-if="fila.estado === 'listo'" class="bi bi-check-circle-fill text-success me-2"></i>
                    <i v-else-if="fila.estado === 'error'" class="bi bi-x-circle-fill text-danger me-2"></i>
                    <span v-else-if="fila.estado === 'generando'" class="spinner-border spinner-border-sm text-primary me-2"></span>
                    <i v-else class="bi bi-circle text-muted me-2"></i>
                    <span :class="{ 'text-muted': fila.estado === 'pendiente' }">{{ fila.docente.nombre }}</span>
                </li>
            </ul>
            <div class="small text-muted">No cierres esta ventana.</div>
        </div>
    </div>
</template>

<style scoped>
.lote-progreso {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.45);
}

.lote-progreso-caja {
    min-width: 340px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    border-radius: 12px;
    background: var(--admin-surface);
    color: var(--admin-text);
    box-shadow: var(--admin-shadow-lg);
}
</style>
