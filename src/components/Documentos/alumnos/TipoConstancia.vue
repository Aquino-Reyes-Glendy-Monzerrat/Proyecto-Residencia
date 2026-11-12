<script setup>

import { SUBTIPO_TUTORIA, SUBTIPO_ACTIVIDAD } from '@/utils/constanciaCreditos.js'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

const OPCIONES = [
    { valor: SUBTIPO_TUTORIA, etiqueta: 'Tutoría', id: 'subtipoConstanciaTutoria' },
    { valor: SUBTIPO_ACTIVIDAD, etiqueta: 'Actividad complementaria', id: 'subtipoConstanciaActividad' },
]
</script>

<template>
    <div class="mb-4">
        <label class="form-label fw-semibold">Tipo de constancia <span class="text-danger">*</span></label>
        <div class="d-flex flex-column gap-2">
            <div v-for="o in OPCIONES" :key="o.valor" class="form-check">
                <input :id="o.id" class="form-check-input" type="radio" name="tipoConstancia" :value="o.valor"
                    :checked="modelValue === o.valor" @change="emit('update:modelValue', o.valor)">
                <label class="form-check-label" :for="o.id">{{ o.etiqueta }}</label>
            </div>
        </div>
    </div>
</template>