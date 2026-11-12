<script setup>

import { watch } from 'vue'

const props = defineProps({
    campos: { type: Object, required: true },
    cabeEnHoja: { type: Boolean, default: true },
})


watch(() => props.cabeEnHoja, (cabe, cabia) => {
    if (cabia && !cabe) {
        alert('El texto ya no cabe en una hoja junto con la firma, la nota de copia y la leyenda. Acórtalo para poder generar.')
    }
})



</script>

<template>
    <div class="mb-3">
        <label class="form-label">Área Solicitante</label>
        <input type="text" class="form-control" v-model="campos.area_solicitante">
    </div>
    <div class="mb-3">
        <label class="form-label">Nombre del Solicitante</label>
        <input type="text" class="form-control" v-model="campos.nombre_solicitante_mant"  disabled>
    </div>
    <div class="mb-3">
        <label class="form-label">Fecha de solicitud <span class="text-danger">*</span></label>
        <input type="date" class="form-control" v-model="campos.fecha_solicitud_mant">
    </div>
    <div class="mb-3">
        <label class="form-label">Descripción del servicio solicitado <span
                class="text-danger">*</span></label>
        <textarea class="form-control" rows="4" v-model="campos.descripcion_servicio"
            placeholder="Ej: Equipo de aire acondicionado marca Lennox 1450400002-12-00036"></textarea>
    </div>
    <div class="mb-3" v-if="campos.tipo_servicio === 'externo'">
        <label class="form-label">Motivo por el cual se solicita proveedor externo</label>
        <textarea class="form-control" rows="2" v-model="campos.motivo_proveedor_externo"></textarea>
    </div>

</template>
