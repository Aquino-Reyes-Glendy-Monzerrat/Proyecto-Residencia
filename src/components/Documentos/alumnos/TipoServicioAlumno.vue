<script setup>
// Residencia o Servicio Social (para Aceptación y Terminación).
const props = defineProps({
    modelValue: { type: String, default: '' },
    tipo: { type: String, required: true }, // 'aceptacion' | 'terminacion'
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
    <div class="mb-4">
        <label class="form-label fw-semibold">Tipo <span class="text-danger">*</span></label>
        <div class="d-flex flex-column gap-2">
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === `${tipo}-residencia`"
                    @change="emit('update:modelValue', `${tipo}-residencia`)"
                    :value="`${tipo}-residencia`" id="subtipoResidencia">
                <label class="form-check-label" for="subtipoResidencia">Residencia
                    Profesional</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === `${tipo}-servicio-social`"
                    @change="emit('update:modelValue', `${tipo}-servicio-social`)"
                    :value="`${tipo}-servicio-social`" id="subtipoServicioSocial">
                <label class="form-check-label" for="subtipoServicioSocial">Servicio
                    Social</label>
            </div>
        </div>
    </div>
</template>
