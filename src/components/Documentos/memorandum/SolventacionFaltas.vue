<script setup>
// Memorándum de Solventación de Faltas, con la opción de 2 incidencias
// (2 memos vinculados, ver useMemosJuntos.js).
import SelectorFolio from '@/components/SelectorFolio.vue'

defineProps({
    campos: { type: Object, required: true },
    combinarIncidencias: { type: Boolean, default: false },
    folioMostradoTexto2: { type: String, default: '' },
    folioSeleccionado2: { type: [String, Number], default: '' },
    reservadosConTexto2: { type: Array, default: () => [] },
    mostrarReservados2: { type: Boolean, default: false },
    fecha2: { type: String, default: '' },
    motivo2: { type: String, default: '' },
    // Al editar: la casilla de 2 incidencias no se muestra (al guardar
    // solo se actualiza este memo) y, si tiene pareja, se avisa con su folio.
    idEdicion: { type: [String, Number], default: null },
    textoParejaEdicion: { type: String, default: '' },
})

defineEmits([
    'update:combinarIncidencias', 'update:folioSeleccionado2', 'update:mostrarReservados2',
    'update:fecha2', 'update:motivo2',
])
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Motivo <span class="text-danger">*</span></label>
        <textarea class="form-control" rows="2" v-model="campos.motivo"
            placeholder="Ej: se encontraba en asesorías con sus alumnos de residencias"></textarea>
    </div>
    <div v-if="!idEdicion" class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="combinarIncidencias"
            :checked="combinarIncidencias" @change="$emit('update:combinarIncidencias', $event.target.checked)">
        <label class="form-check-label" for="combinarIncidencias">
            Más de una incidencia (2)
        </label>
    </div>
    <div v-else-if="textoParejaEdicion" class="alert alert-info small py-2 mb-3">
        <i class="bi bi-link-45deg"></i> Vinculado con <strong>{{ textoParejaEdicion }}</strong>.
        Cada uno se edita por separado; se imprimen juntos desde la Bitácora con "Imprimir combinado".
    </div>

    <template v-if="combinarIncidencias">
        <hr>
        <p class="small text-muted mb-2">2ª incidencia</p>
        <div class="mb-3">
            <label class="form-label">Folio del oficio (2ª incidencia) <span
                    class="text-danger">*</span></label>
            <SelectorFolio :folio-mostrado-texto="folioMostradoTexto2"
                :folio-seleccionado="folioSeleccionado2" :reservados="reservadosConTexto2"
                :mostrar-reservados="mostrarReservados2"
                @update:folio-seleccionado="$emit('update:folioSeleccionado2', $event)"
                @update:mostrar-reservados="$emit('update:mostrarReservados2', $event)" />
        </div>
        <div class="mb-3">
            <label class="form-label">Fecha del documento (2ª incidencia) <span
                    class="text-danger">*</span></label>
            <input type="date" class="form-control" :value="fecha2"
                @input="$emit('update:fecha2', $event.target.value)">
        </div>
        <div class="mb-3">
            <label class="form-label">Motivo (2ª incidencia) <span
                    class="text-danger">*</span></label>
            <textarea class="form-control" rows="2" :value="motivo2"
                @input="$emit('update:motivo2', $event.target.value)"
                placeholder="Ej: olvidó registrar su entrada"></textarea>
        </div>
    </template>
</template>
