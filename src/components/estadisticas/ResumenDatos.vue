<script setup>

defineProps({
    datos: { type: Array, required: true },   
})
</script>

<template>
    <div class="resumen-datos">
        <div v-for="d in datos" :key="d.etiqueta">
            <strong :class="{ 'dato-texto': typeof d.valor === 'string' }">{{ d.valor }}</strong>
            <span>{{ d.etiqueta }}</span>
        </div>
    </div>
</template>
