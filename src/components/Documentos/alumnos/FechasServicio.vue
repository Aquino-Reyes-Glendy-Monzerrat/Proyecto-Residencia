<script setup>
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="row g-2 mb-3">
        <div class="col">
            <label class="form-label">Fecha inicio <span class="text-danger">*</span></label>
            <input type="date" class="form-control" v-model="campos.fecha_inicio">
        </div>
        <div class="col">
            <label class="form-label">Fecha fin <span class="text-danger">*</span></label>
            <input type="date" class="form-control" v-model="campos.fecha_fin">
        </div>
    </div>
</template>
