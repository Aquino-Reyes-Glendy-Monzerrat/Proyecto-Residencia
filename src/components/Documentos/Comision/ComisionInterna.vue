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
    <div class="mb-3">
        <label class="form-label">Lugar del evento <span class="text-danger">*</span></label>
        <input type="text" class="form-control" v-model="campos.lugar_evento" placeholder="Ej: a X lugar">
    </div>
    <div class="mb-3">
        <label class="form-label">Motivo / finalidad <span class="text-danger">*</span></label>
        <textarea class="form-control" rows="3" v-model="campos.motivo"
            placeholder="Describe el motivo de la comisión..."></textarea>
    </div>
    <!-- Comisión para el propio Jefe de Depto.: pasa por Subdirectora/Director. -->
    <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="paraJefeDepto" v-model="campos.para_jefe_depto">
        <label class="form-check-label" for="paraJefeDepto">
            Comisión para el Jefe de Depto.
        </label>
    </div>
</template>
