<script setup>

import { ref, computed } from 'vue'

const props = defineProps({
    modelValue: { type: Number, required: true },
    maximo: { type: Number, default: () => new Date().getFullYear() },
    minimo: { type: Number, default: -Infinity },   
    etiqueta: { type: String, default: 'Año' },
})
const emit = defineEmits(['update:modelValue'])

const abierto = ref(false)
const decada = ref(0)
const anioActual = new Date().getFullYear()

function alternar() {
    decada.value = Math.floor(props.modelValue / 10) * 10
    abierto.value = !abierto.value
}


const anios = computed(() => Array.from({ length: 12 }, (_, i) => {
    const anio = decada.value - 1 + i
    return { anio, fuera: anio < decada.value || anio > decada.value + 9, desactivado: anio > props.maximo || anio < props.minimo }
}))

function elegir(anio) {
    emit('update:modelValue', anio)
    abierto.value = false
}
</script>

<template>
    <div class="selector-calendario">
        <span class="small fw-semibold">{{ etiqueta }}</span>
        <button type="button" class="btn btn-outline-secondary boton-calendario" aria-haspopup="dialog"
            :aria-expanded="abierto" @click="alternar">
            {{ modelValue }}
            <i class="bi bi-chevron-down small"></i>
        </button>

        <template v-if="abierto">
            <div class="calendario-fondo" @click="abierto = false"></div>
            <div class="calendario-popover" role="dialog" aria-label="Elegir año" @keydown.esc="abierto = false">
                <div class="calendario-encabezado">
                    <span class="fw-bold">{{ decada }}–{{ decada + 9 }}</span>
                    <span>
                        <button type="button" class="calendario-flecha" aria-label="Década anterior"
                            @click="decada -= 10"><i class="bi bi-chevron-up"></i></button>
                        <button type="button" class="calendario-flecha" aria-label="Década siguiente"
                            @click="decada += 10"><i class="bi bi-chevron-down"></i></button>
                    </span>
                </div>
                <div class="calendario-rejilla">
                    <button v-for="a in anios" :key="a.anio" type="button" class="calendario-celda"
                        :class="{ seleccionado: a.anio === modelValue, hoy: a.anio === anioActual, fuera: a.fuera }"
                        :disabled="a.desactivado" :aria-pressed="a.anio === modelValue" @click="elegir(a.anio)">
                        {{ a.anio }}
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>
