<script setup>
// Panel de contador de folio, dinamico por categoraa (general o
// memos), asi no repetimmsos el mismo bloque para cada una
import { computed } from 'vue'

const props = defineProps({
    categoria: { type: Object, required: true }, // { actual, reservados: [{numero, usado}] }
    titulo: { type: String, required: true },
    icono: { type: String, default: 'bi-folder' },
    prefijo: { type: String, required: true },
    anio: { type: [String, Number], required: true },
    cantidadReservar: { type: Number, required: true },
})
const emit = defineEmits(['update:cantidadReservar', 'reservar', 'reiniciar'])

function folioTexto(numero) {
    return `${props.prefijo}-${String(numero).padStart(3, '0')}/${props.anio}`
}
const siguienteTexto = computed(() => folioTexto((props.categoria.actual || 0) + 1))
const ultimoTexto = computed(() => props.categoria.actual > 0 ? folioTexto(props.categoria.actual) : '—')
const reservadosLibres = computed(() => (props.categoria.reservados || []).filter(f => !f.usado))
</script>

<template>
    <div class="panel p-4">
        <h6 class="mb-3"><i class="bi me-2" :class="icono"></i>{{ titulo }}</h6>

        <div class="p-3 rounded mb-3" style="background: rgba(255,255,255,.03);">
            <div class="row g-3">
                <div class="col-6">
                    <div class="small text-muted">Último creado</div>
                    <div class="fs-4 fw-bold">{{ ultimoTexto }}</div>
                </div>
                <div class="col-6 border-start">
                    <div class="small text-muted">Siguiente folio a generar</div>
                    <div class="fs-4 fw-bold text-primary">{{ siguienteTexto }}</div>
                </div>
            </div>
        </div>

        <div class="mb-3">
            <div class="small text-muted text-uppercase mb-2">Reservar espacio</div>
            <div class="d-flex gap-2">
                <label class="small align-self-center">Cuántos folios reservar:</label>
                <input type="number" min="1" class="form-control form-control-sm" style="width: 80px;"
                    :value="cantidadReservar" @input="$emit('update:cantidadReservar', Number($event.target.value))">
                <button class="btn btn-outline-warning btn-sm" @click="$emit('reservar')">
                    <i class="bi bi-bookmark-plus"></i> Reservar
                </button>
            </div>
        </div>

        <div class="mb-3">
            <div class="small text-muted text-uppercase mb-2">Folios reservados</div>
            <p v-if="reservadosLibres.length === 0" class="small text-muted mb-0">
                No hay folios reservados disponibles actualmente.
            </p>
            <div v-else class="d-flex flex-wrap gap-2">
                <span v-for="f in reservadosLibres" :key="f.numero"
                    class="badge bg-secondary-subtle text-secondary border">
                    {{ String(f.numero).padStart(3, '0') }}
                </span>
            </div>
        </div>

        <div class="pt-3 border-top d-flex justify-content-center align-items-center">
            <button class="btn btn-outline-danger btn-sm" @click="$emit('reiniciar')">
                Reiniciar Contador
            </button>
        </div>
    </div>
</template>