<script setup>

defineProps({
    items: { type: Array, required: true },   
})
</script>

<template>
    <p class="small text-muted mb-2 d-flex flex-wrap gap-3">
        <span v-for="i in items" :key="i.clase"><span class="leyenda-color" :class="i.clase"></span>{{ i.etiqueta }}</span>
    </p>
</template>