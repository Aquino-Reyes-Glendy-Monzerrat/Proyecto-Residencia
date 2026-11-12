<script setup>
import { useRouter } from 'vue-router'
import { fechaConBarras } from '@/utils/fechas.js'
import { rutaOficioCompactacion } from '@/utils/oficioCompactacion.js'

const props = defineProps({
    lote: { type: Object, required: true },
    campos: { type: Object, required: true },
    rutaBitacora: { type: String, required: true },
    
    bitacoraId: { type: String, default: null },
})

const router = useRouter()


function armarOficio() {
    const ruta = rutaOficioCompactacion({
        lote: props.lote.listos.map(f => f.id).join(','),
        fecha: props.campos.fecha_documento,
        bitacoraId: props.bitacoraId,
    })
    window.location.assign(router.resolve(ruta).href)
}
</script>

<template>
    <div class="text-center mb-3">
        <i class="bi" :class="lote.fallidos.length ? 'bi-exclamation-triangle-fill text-warning' : 'bi-check-circle-fill text-success'"
            style="font-size: 2.5rem"></i>
        <h5 class="mt-2 mb-1">
            Se generaron {{ lote.listos.length }} memo{{ lote.listos.length === 1 ? '' : 's' }}
            <template v-if="lote.fallidos.length"> · {{ lote.fallidos.length }} con error</template>
        </h5>
    </div>

    <ul class="list-group mb-3">
        <li v-for="fila in lote.filas" :key="fila.docente.id"
            class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <span>
                <span v-if="fila.estado === 'listo'" class="folio-lote me-2">{{ fila.folio }}</span>
                <i v-else class="bi bi-x-circle-fill text-danger me-2"></i>{{ fila.docente.nombre }}
                <div v-if="fila.estado === 'error'" class="small text-danger">{{ fila.error }}</div>
            </span>
            <span class="small text-muted text-end text-nowrap">
                {{ fechaConBarras(fila.fecha_inicio) }} al {{ fechaConBarras(fila.fecha_fin) }}<br>
                {{ fila.hora_entrada }}–{{ fila.hora_salida }}
            </span>
        </li>
    </ul>

    <button v-if="lote.fallidos.length" type="button" class="btn btn-warning w-100 mb-2"
        @click="lote.reintentarFallidos()">
        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar los que fallaron
    </button>
    <button v-if="lote.listos.length" type="button" class="btn btn-primary w-100 mb-2" @click="armarOficio">
        Armar Oficio de compactación
    </button>
    <button type="button" class="btn btn-outline-secondary w-100 mb-2" @click="router.push(rutaBitacora)">
        Ir a la Bitácora
    </button>
    <button type="button" class="btn btn-link w-100" @click="lote.reiniciar()">Hacer otro lote</button>
</template>

<style scoped>
.folio-lote {
    color: #0d6efd;
    font-weight: 700;
}
</style>