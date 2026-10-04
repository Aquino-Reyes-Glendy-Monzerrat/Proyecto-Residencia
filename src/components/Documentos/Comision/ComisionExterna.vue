<script setup>
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Destino <span class="text-danger">*</span></label>
        <input type="text" class="form-control" v-model="campos.ciudad_destino">
    </div>
    <div class="mb-3">
        <label class="form-label">Actividad <span class="text-danger">*</span></label>
        <input type="text" class="form-control" v-model="campos.tipo_actividad"
            placeholder='Ej: Curso-Taller : "Nombre del curso"...'>
    </div>
    <div class="mb-3">
        <label class="form-label">Instalaciones / lugar específico <span
                class="text-muted small">(opcional)</span></label>
        <input type="text" class="form-control" v-model="campos.lugar_especifico"
            placeholder="Ej: Instituto Tecnológico de Orizaba">
    </div>
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
