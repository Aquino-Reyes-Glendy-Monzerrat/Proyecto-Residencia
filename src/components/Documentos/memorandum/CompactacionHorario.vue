<script setup>
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Fecha inicio <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_inicio">
    </div>
    <div class="mb-3">
        <label class="form-label">Fecha fin <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_fin">
    </div>
    <div class="mb-3">
        <label class="form-label">Hora de entrada <span class="text-danger">*</span></label>
        <input type="time" class="form-control" v-model="campos.hora_entrada">
    </div>
    <div class="mb-3">
        <label class="form-label">Hora de salida <span class="text-danger">*</span></label>
        <input type="time" class="form-control" v-model="campos.hora_salida">
    </div>
</template>
