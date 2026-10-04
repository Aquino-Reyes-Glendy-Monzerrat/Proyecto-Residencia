<script setup>
// Datos del alumno que se llenan solos al elegirlo (solo lectura).
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Nombre del estudiante</label>
        <input type="text" class="form-control" v-model="campos.nombre_estudiante" readonly>
    </div>
    <div class="mb-3">
        <label class="form-label">Carrera</label>
        <input type="text" class="form-control" v-model="campos.carrera" readonly>
    </div>
</template>
