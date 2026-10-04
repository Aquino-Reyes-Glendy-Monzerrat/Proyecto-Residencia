<script setup>
// Buscador de alumno/egresado por número de control, con sugerencias.
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
        <label class="form-label">Número de control <span class="text-danger">*</span></label>
        <input type="text" class="form-control" :value="busquedaPersona"
            placeholder="Escribe el número de control..." @input="escribir($event.target.value)"
            autocomplete="off">
        <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
            style="top:100%">
            <li v-for="p in sugerencias" :key="p.id" class="list-group-item list-group-item-action"
                @click="emit('seleccionar', p)" style="cursor:pointer">
                {{ p.numero_control }} — {{ p.nombre }}
            </li>
        </ul>
    </div>
</template>
