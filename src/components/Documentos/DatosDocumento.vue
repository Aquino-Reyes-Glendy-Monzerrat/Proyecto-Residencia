<script setup>
// Fecha del documento + Folio del oficio, comunes a todos los tipos.
// Al editar, el folio no se muestra: ya se asignó al crear el documento
// y no se puede cambiar (se sigue viendo en la vista previa).
import SelectorFolio from '@/components/SelectorFolio.vue'

defineProps({
    campos: { type: Object, required: true },
    idEdicion: { type: [String, Number], default: null },
    folioMostradoTexto: { type: String, default: '' },
    folioSeleccionado: { type: [String, Number], default: '' },
    reservadosConTexto: { type: Array, default: () => [] },
    mostrarReservados: { type: Boolean, default: false },
    // Comisión, Memorándum y Liberación piden primero la fecha.
    fechaPrimero: { type: Boolean, default: false },
    // Mantenimiento no lleva "Fecha del documento" (usa su encabezado ISO).
    conFecha: { type: Boolean, default: true },
})

defineEmits(['update:folioSeleccionado', 'update:mostrarReservados'])
</script>

<template>
    <div v-if="conFecha && fechaPrimero" class="mb-3">
        <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_documento">
    </div>
    <div v-if="!idEdicion" class="mb-3">
        <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
        <SelectorFolio :folio-mostrado-texto="folioMostradoTexto"
            :folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
            :mostrar-reservados="mostrarReservados"
            @update:folio-seleccionado="$emit('update:folioSeleccionado', $event)"
            @update:mostrar-reservados="$emit('update:mostrarReservados', $event)" />
    </div>
    <div v-if="conFecha && !fechaPrimero" class="mb-3">
        <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_documento">
    </div>
</template>
