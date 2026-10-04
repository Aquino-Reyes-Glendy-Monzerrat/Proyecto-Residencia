<script setup>
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
    <div class="mb-4">
        <label class="form-label fw-semibold">Tipo de memorándum <span
                class="text-danger">*</span></label>
        <div class="d-flex flex-column gap-2">
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === 'memorandum-solventacion-faltas'"
                    @change="emit('update:modelValue', 'memorandum-solventacion-faltas')"
                    value="memorandum-solventacion-faltas" id="subtipoSolventacion">
                <label class="form-check-label" for="subtipoSolventacion">Solventación de
                    Faltas</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === 'memorandum-compactacion-horario'"
                    @change="emit('update:modelValue', 'memorandum-compactacion-horario')"
                    value="memorandum-compactacion-horario" id="subtipoCompactacion">
                <label class="form-check-label" for="subtipoCompactacion">Compactación de
                    horario</label>
            </div>
        </div>
    </div>
</template>
