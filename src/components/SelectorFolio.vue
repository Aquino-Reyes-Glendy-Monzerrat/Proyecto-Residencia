<script setup>
// Tarjeta folio del oficio: siguiente automatico o uno reservado.
// estado y calculos en useFolio.js, aqui solo se muestra.
defineProps({
    folioMostradoTexto: { type: String, default: '' },
    folioSeleccionado: { type: [String, Number], default: 'automatico' },
    reservados: { type: Array, default: () => [] }, // [{ numero, texto }]
    mostrarReservados: { type: Boolean, default: false },
})
defineEmits(['update:folioSeleccionado', 'update:mostrarReservados'])
</script>

<template>
    <div class="panel p-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
                <div class="fs-4 fw-bold text-primary">{{ folioMostradoTexto }}</div>
                <span class="badge"
                    :class="folioSeleccionado === 'automatico' ? 'bg-primary-subtle text-primary' : 'bg-warning-subtle text-warning'">
                    {{ folioSeleccionado === 'automatico' ? 'Automático' : 'Reservado' }}
                </span>
            </div>
            <button v-if="reservados.length > 0" type="button" class="btn btn-outline-secondary btn-sm"
                @click="$emit('update:mostrarReservados', !mostrarReservados)">
                <i class="bi bi-bookmark"></i> Usar folio reservado
                <span class="badge bg-warning text-dark ms-1">{{ reservados.length }}</span>
            </button>
        </div>

        <template v-if="mostrarReservados && reservados.length > 0">
            <hr class="my-2">
            <p class="small text-muted mb-2">
                Hay folios reservados disponibles. Elige uno si este oficio corresponde a un
                día anterior:
            </p>
            <div class="d-flex flex-wrap gap-2">
                <button v-for="f in reservados" :key="f.numero" type="button" class="btn btn-sm"
                    :class="folioSeleccionado === f.numero ? 'btn-warning' : 'btn-outline-warning'"
                    @click="$emit('update:folioSeleccionado', f.numero)">
                    {{ f.texto }}
                </button>
            </div>
            <a v-if="folioSeleccionado !== 'automatico'" href="#" class="small d-inline-block mt-2"
                @click.prevent="$emit('update:folioSeleccionado', 'automatico')">
                <i class="bi bi-x"></i> Quitar selección y volver al folio automático
            </a>
        </template>
    </div>
</template>