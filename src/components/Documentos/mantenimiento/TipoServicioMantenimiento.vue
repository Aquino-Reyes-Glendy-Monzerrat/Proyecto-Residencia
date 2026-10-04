<script setup>
defineProps({ campos: { type: Object, required: true } })
</script>

<template>
    <div class="mb-3">
        <label class="form-label fw-semibold">Tipo de servicio <span class="text-danger">*</span></label>
        <div class="form-check">
            <input class="form-check-input" type="radio" v-model="campos.tipo_servicio"
                value="interno" id="servInterno">
            <label class="form-check-label" for="servInterno">Servicio Interno</label>
        </div>
        <div class="form-check">
            <input class="form-check-input" type="radio" v-model="campos.tipo_servicio"
                value="externo" id="servExterno">
            <label class="form-check-label" for="servExterno">Servicio Externo</label>
        </div>
    </div>
    <div class="mb-3">
        <label class="form-label fw-semibold">Categoría <span class="text-danger">*</span></label>
        <div class="form-check">
            <input class="form-check-input" type="checkbox"
                v-model="campos.categoria_recursos_materiales" id="catRecursos">
            <label class="form-check-label" for="catRecursos">Recursos Materiales y
                Servicios</label>
        </div>
        <div class="form-check">
            <input class="form-check-input" type="checkbox"
                v-model="campos.categoria_mantenimiento_equipo" id="catEquipo">
            <label class="form-check-label" for="catEquipo">Mantenimiento de Equipo</label>
        </div>
        <div class="form-check">
            <input class="form-check-input" type="checkbox"
                v-model="campos.categoria_centro_computo" id="catComputo">
            <label class="form-check-label" for="catComputo">Centro de Cómputo</label>
        </div>
    </div>
</template>
