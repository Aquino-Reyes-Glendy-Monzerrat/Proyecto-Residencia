<script setup>
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Nombre del egresado</label>
        <input type="text" class="form-control" v-model="campos.nombre_estudiante" readonly>
    </div>
    <div class="mb-3">
        <label class="form-label">Detalle <span class="text-danger">*</span></label>
        <input type="text" class="form-control" v-model="campos.detalle_egresado"
            placeholder='Ej: es egresado del Instituto Tecnológico de Chetumal...'>
    </div>
</template>
