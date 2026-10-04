<script setup>
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
    <div class="mb-4">
        <label class="form-label fw-semibold">Tipo de comisión <span
                class="text-danger">*</span></label>
        <div class="d-flex flex-column gap-2">
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === 'comision-externa'"
                    @change="emit('update:modelValue', 'comision-externa')" value="comision-externa" id="subtipoExterna">
                <label class="form-check-label" for="subtipoExterna">Comisión Externa</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" :checked="props.modelValue === 'comision-interna'"
                    @change="emit('update:modelValue', 'comision-interna')" value="comision-interna" id="subtipoInterna">
                <label class="form-check-label" for="subtipoInterna">Comisión Interna</label>
            </div>
        </div>
    </div>
</template>
