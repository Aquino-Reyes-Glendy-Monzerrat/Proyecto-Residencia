<script setup>
// Buscador de docente con sugerencias (Comisión y Memorándum).
defineProps({
    busquedaPersona: { type: String, default: '' },
    sugerencias: { type: Array, default: () => [] },
    mostrarSugerencias: { type: Boolean, default: false },
})

const emit = defineEmits(['update:busquedaPersona', 'buscar', 'seleccionar'])

function escribir(valor) {
    emit('update:busquedaPersona', valor)
    emit('buscar', valor)
}
</script>

<template>
    <div class="mb-3 position-relative">
        <label class="form-label">Nombre del docente <span class="text-danger">*</span></label>
        <input type="text" class="form-control" :value="busquedaPersona"
            placeholder="Escribe el nombre..." @input="escribir($event.target.value)"
            autocomplete="off">
        <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
            style="top:100%">
            <li v-for="p in sugerencias" :key="p.id"
                class="list-group-item list-group-item-action" @click="emit('seleccionar', p)"
                style="cursor:pointer">
                {{ p.nombre }} — {{ p.cargo || p.carrera }}
            </li>
        </ul>
    </div>
</template>
