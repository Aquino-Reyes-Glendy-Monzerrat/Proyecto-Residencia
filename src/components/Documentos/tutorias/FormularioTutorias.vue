<script setup>
// Al editar un oficio de Tutorías: solo fecha, nombre y grado. Los grupos
// se cambian en Tutorías y se vuelve a generar.
defineProps({
    campos: { type: Object, required: true },
    cargando: { type: Boolean, default: false },
})
defineEmits(['guardar'])
</script>

<template>
    <div class="alert alert-info small">
        Este documento se generó desde el módulo <strong>Tutorías</strong>. Aquí solo
        se completan o corrigen datos — para cambiar los grupos asignados, hazlo
        desde Tutorías y vuelve a generar.
    </div>
    <div class="mb-3">
        <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_documento">
    </div>
    <div class="mb-3">
        <label class="form-label">Nombre del docente</label>
        <input type="text" class="form-control" v-model="campos.nombre_destinatario">
    </div>
    <div class="mb-3">
        <label class="form-label">Grado / abreviatura</label>
        <input type="text" class="form-control" v-model="campos.grado_docente">
    </div>
    <div class="mb-4">
        <label class="form-label">Grupos (solo lectura)</label>
        <textarea class="form-control" rows="2" readonly :value="campos.lista_grupos"></textarea>
    </div>
    <button class="btn btn-primary w-100 mt-2" @click="$emit('guardar')" :disabled="cargando">
        <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
        <i v-else class="bi bi-file-earmark-check me-2"></i>
        {{ cargando ? 'Guardando...' : 'Guardar cambios' }}
    </button>
</template>
