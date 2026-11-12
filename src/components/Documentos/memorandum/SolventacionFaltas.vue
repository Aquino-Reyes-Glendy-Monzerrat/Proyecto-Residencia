<script setup>
// Memorándum de Solventación de Faltas, con la opción de 2 incidencias
// (2 memos vinculados, ver useMemosJuntos.js).

import { ref, onMounted } from 'vue'
import SelectorFolio from '@/components/SelectorFolio.vue'
import { getTiposIncidencia } from '@/services/api.js'

defineProps({
    campos: { type: Object, required: true },
    combinarIncidencias: { type: Boolean, default: false },
    folioMostradoTexto2: { type: String, default: '' },
    folioSeleccionado2: { type: [String, Number], default: '' },
    reservadosConTexto2: { type: Array, default: () => [] },
    mostrarReservados2: { type: Boolean, default: false },
    fecha2: { type: String, default: '' },
    motivo2: { type: String, default: '' },
    tipo2: { type: String, default: '' },
    fechaIncidencia2: { type: String, default: '' },
    // Al editar: la casilla de 2 incidencias no se muestra (al guardar
    // solo se actualiza este memo) y, si tiene pareja, se avisa con su folio.
    idEdicion: { type: [String, Number], default: null },
    textoParejaEdicion: { type: String, default: '' },
})

defineEmits([
    'update:combinarIncidencias', 'update:folioSeleccionado2', 'update:mostrarReservados2',
    'update:fecha2', 'update:motivo2', 'update:tipo2', 'update:fechaIncidencia2',
])

// Catálogo de tipos de incidencia. Si no carga, el formulario sigue
// funcionando con redacción libre.
const tiposIncidencia = ref([])
onMounted(async () => {
    try {
        tiposIncidencia.value = (await getTiposIncidencia())
            .map(t => t.valor)
            .sort((a, b) => a.localeCompare(b, 'es'))
    } catch (e) {
        console.error('No se pudo cargar el catálogo de tipos de incidencia', e)
    }
})

// Si el memo trae un tipo que ya no está en el catálogo (lo editaron o
// borraron), se sigue mostrando para no perderlo al editar.
const opcionesTipo = (actual) =>
    actual && !tiposIncidencia.value.includes(actual) ? [actual, ...tiposIncidencia.value] : tiposIncidencia.value

</script>

<template>
    <div class="row g-3 mb-3">
        <div class="col-12">
            <label class="form-label" for="fechaIncidencia">Fecha de la incidencia</label>
            <input id="fechaIncidencia" type="date" class="form-control" v-model="campos.fecha_incidencia">
        </div>
        <div class="col-12">
            <label class="form-label" for="tipoIncidencia">Tipo de incidencia <span class="text-muted small">(opcional)</span></label>
            <select id="tipoIncidencia" class="form-select" v-model="campos.tipo_incidencia">
                <option value="">Sin tipo (redacción libre)</option>
                <option v-for="t in opcionesTipo(campos.tipo_incidencia)" :key="t" :value="t">{{ t }}</option>
            </select>
        </div>
    </div>
    <div class="mb-3">
        <label class="form-label" for="motivoIncidencia">Motivo <span class="text-danger">*</span></label>
        <textarea id="motivoIncidencia" class="form-control" rows="3" v-model="campos.motivo"
            placeholder="Ej: debido a olvido de su tarjeta..."></textarea>
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
        <div class="row g-3 mb-3">
            <div class="col-12">
                <label class="form-label" for="fechaIncidencia2">Fecha de la incidencia (2ª)</label>
                <input id="fechaIncidencia2" type="date" class="form-control" :value="fechaIncidencia2"
                    @input="$emit('update:fechaIncidencia2', $event.target.value)">
            </div>
            <div class="col-12">
                <label class="form-label" for="tipoIncidencia2">Tipo de incidencia (2ª) <span class="text-muted small">(opcional)</span></label>
                <select id="tipoIncidencia2" class="form-select" :value="tipo2"
                    @change="$emit('update:tipo2', $event.target.value)">
                    <option value="">Sin tipo (redacción libre)</option>
                    <option v-for="t in opcionesTipo(tipo2)" :key="t" :value="t">{{ t }}</option>
                </select>
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label" for="motivoIncidencia2">Motivo (2ª incidencia) <span
                    class="text-danger">*</span></label>
            <textarea id="motivoIncidencia2" class="form-control" rows="3" :value="motivo2"
                @input="$emit('update:motivo2', $event.target.value)"
                placeholder="Ej: debido a que participó en la reunión de academia del departamento."></textarea>
            
        </div>
    </template>
</template>