<script setup>
import {ref,onBeforeUnmount} from 'vue'

const props = defineProps({
    campos: {
        type: Object,
        required: true
    },
    sugerenciasFirmantes: {
        type: Array,
        default: () => []
    },
    campoFirmanteActivo: {
        type: String,
        default: ''
    },
    buscarFirmantesLiberacion: {
        type: Function,
        default: () => {}
    },
    seleccionarFirmanteLiberacion: {
        type: Function,
        default: () => {}
    }
})

const campos = props.campos
const temporizador = ref(null)

function buscar(query,campo) {
    clearTimeout(temporizador.value)

    temporizador.value = setTimeout(() => {
        props.buscarFirmantesLiberacion(query,campo)
    },150)
}

function seleccionar(persona,campo) {
    props.seleccionarFirmanteLiberacion(persona,campo)
}

function mostrarSugerencias(campo) {
    return props.campoFirmanteActivo === campo &&
        props.sugerenciasFirmantes.length > 0
}

onBeforeUnmount(() => {
    clearTimeout(temporizador.value)
})
</script>

<template>
    <div class="mb-3">
        <label class="form-label">
            Nombre del proyecto
            <span class="text-danger">*</span>
        </label>

        <input
            type="text"
            class="form-control"
            v-model="campos.nombre_proyecto"
        >
    </div>

    <div class="mb-3">
        <label class="form-label">
            Producto
            <span class="text-danger">*</span>
        </label>

        <input
            type="text"
            class="form-control"
            v-model="campos.producto"
            placeholder="Ej: Proyecto de Residencia Profesional"
        >
    </div>

    <!-- Asesor -->

    <div class="mb-3 position-relative">
        <label class="form-label">
            Nombre del asesor
            <span class="text-muted small">(opcional)</span>
        </label>

        <input
            type="text"
            class="form-control"
            v-model="campos.nombre_asesor"
            placeholder="Escribe el nombre del asesor..."
            autocomplete="off"
             style="font-weight: normal !important;"
            @input="buscar(campos.nombre_asesor,'nombre_asesor')"
        >

        <div
            v-if="mostrarSugerencias('nombre_asesor')"
            class="list-group position-absolute w-100 shadow-sm"
            style="z-index: 1050;"
        >
            <button
                v-for="persona in sugerenciasFirmantes"
                :key="persona.id"
                type="button"
                class="list-group-item list-group-item-action"
                @mousedown.prevent="seleccionar(persona,'nombre_asesor')"
            >
                {{ persona.abreviatura }} {{ persona.nombre }}
            </button>
        </div>
    </div>

    <!-- Revisor 1 -->

    <div class="mb-3 position-relative">
        <label class="form-label">
            Nombre del revisor 1
            <span class="text-muted small">(opcional)</span>
        </label>

        <input
            type="text"
            class="form-control"
            v-model="campos.nombre_revisor"
            placeholder="Escribe el nombre del revisor..."
            autocomplete="off"
            @input="buscar(campos.nombre_revisor,'nombre_revisor')"
        >

        <div
            v-if="mostrarSugerencias('nombre_revisor')"
            class="list-group position-absolute w-100 shadow-sm"
            style="z-index: 1050;"
        >
            <button
                v-for="persona in sugerenciasFirmantes"
                :key="persona.id"
                type="button"
                class="list-group-item list-group-item-action"
                @mousedown.prevent="seleccionar(persona,'nombre_revisor')"
            >
                {{ persona.abreviatura }} {{ persona.nombre }}
            </button>
        </div>
    </div>

    <!-- Revisor 2 -->

    <div class="mb-3 position-relative">
        <label class="form-label">
            Nombre del revisor 2
            <span class="text-muted small">(opcional)</span>
        </label>

        <input
            type="text"
            class="form-control"
            v-model="campos.nombre_revisor2"
            placeholder="Escribe el nombre del revisor..."
            autocomplete="off"
            @input="buscar(campos.nombre_revisor2,'nombre_revisor2')"
        >

        <div
            v-if="mostrarSugerencias('nombre_revisor2')"
            class="list-group position-absolute w-100 shadow-sm"
            style="z-index: 1050;"
        >
            <button
                v-for="persona in sugerenciasFirmantes"
                :key="persona.id"
                type="button"
                class="list-group-item list-group-item-action"
                @mousedown.prevent="seleccionar(persona,'nombre_revisor2')"
            >
                {{ persona.abreviatura }} {{ persona.nombre }}
            </button>
        </div>
    </div>
</template>