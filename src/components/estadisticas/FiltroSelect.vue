<script setup>

const modelo = defineModel({ type: String, required: true })
defineProps({
    opciones: { type: Array, required: true },   
    todos: { type: String, required: true },    
    etiqueta: { type: String, required: true },  
})
</script>

<template>
    <select v-model="modelo" class="form-select form-select-sm filtro-compacto" :class="{ 'filtro-activo': modelo }"
        :aria-label="etiqueta">
        <option value="">{{ todos }}</option>
        <option v-for="o in opciones" :key="o.valor" :value="o.valor">{{ o.etiqueta }}</option>
    </select>
</template>
