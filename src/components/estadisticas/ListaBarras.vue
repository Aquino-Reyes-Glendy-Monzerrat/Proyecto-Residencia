<script setup>

import { ref, computed } from 'vue'

const props = defineProps({
    
    items: { type: Array, required: true },
    activo: { type: String, default: '' },
    limite: { type: Number, default: 0 },
    vacio: { type: String, default: 'Sin registros en este periodo.' },
})
const emit = defineEmits(['elegir'])

const verTodos = ref(false)
const maximo = computed(() => Math.max(1, ...props.items.map(i => i.n)))
const sobran = computed(() => props.limite > 0 && props.items.length > props.limite)
const visibles = computed(() => (!sobran.value || verTodos.value
    ? props.items
    : props.items.filter((i, k) => k < props.limite || i.clave === props.activo)))
</script>

<template>
    <div v-if="items.length" class="lista-barras">
        <button v-for="i in visibles" :key="i.clave" type="button" class="lista-barras-fila"
            :class="{ activa: i.clave === activo }" :aria-pressed="i.clave === activo" :title="i.etiqueta"
            @click="emit('elegir', i.clave === activo ? '' : i.clave)">
            <span class="lista-barras-nombre text-truncate">{{ i.etiqueta }}</span>
            <span class="lista-barras-numero fw-bold">{{ i.n }}</span>
            <span class="lista-barras-pista"><span :style="{ width: `${Math.round(i.n / maximo * 100)}%` }"></span></span>
        </button>
        <button v-if="sobran" type="button" class="btn btn-link btn-sm shadow-none text-decoration-none align-self-start px-1"
            @click="verTodos = !verTodos">
            {{ verTodos ? 'Ver menos' : `Ver los ${items.length}` }}
        </button>
    </div>
    <p v-else class="text-muted small mb-0">{{ vacio }}</p>
</template>
