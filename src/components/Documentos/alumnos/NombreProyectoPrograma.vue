<script setup>
// Residencia → nombre del proyecto · Servicio Social → nombre del programa.
defineProps({
    campos: { type: Object, required: true },
    subtipo: { type: String, required: true },
})
</script>

<template>
    <div class="mb-3">
        <label class="form-label">
            {{ subtipo.includes('residencia') ? 'Nombre del proyecto' : 'Nombre del programa' }}
            <span class="text-danger">*</span>
        </label>
        <input v-if="subtipo.includes('residencia')" type="text" class="form-control"
            v-model="campos.nombre_proyecto">
        <input v-else type="text" class="form-control" v-model="campos.nombre_programa">
    </div>
</template>
