<script setup>

import { toRef } from 'vue'
import Paginacion from '@/components/Paginacion.vue'
import { usePaginacion } from '@/composables/usePaginacion.js'

const props = defineProps({
    titulo: { type: String, required: true },
    filas: { type: Array, required: true },   // [{ clave, titulo, detalle?, n? }]
    clicable: { type: Boolean, default: false },
    conVolver: { type: Boolean, default: false },
    vacio: { type: String, default: 'Sin registros en este periodo.' },
})
const emit = defineEmits(['elegir', 'volver'])

const POR_PAGINA = 5
const { pagina, totalPaginas, visibles } = usePaginacion(toRef(props, 'filas'), POR_PAGINA)
</script>

<template>
    <div class="d-flex justify-content-between align-items-baseline gap-2">
        <p class="titulo-seccion">{{ titulo }}</p>
        <button v-if="conVolver" type="button" class="btn btn-link btn-sm p-0 shadow-none text-decoration-none"
            @click="emit('volver')">Ver todos</button>
    </div>
    <slot />

    <template v-if="filas.length">
        <ul class="lista-conteo">
            <li v-for="f in visibles" :key="f.clave">
                <component :is="clicable ? 'button' : 'div'" :type="clicable ? 'button' : null"
                    class="lista-conteo-fila" :class="{ clicable }" @click="clicable && emit('elegir', f.clave)">
                    <span class="lista-conteo-texto">
                        <span class="lista-conteo-titulo">{{ f.titulo }}</span>
                        <span v-if="f.detalle" class="lista-conteo-detalle">{{ f.detalle }}</span>
                    </span>
                    <span v-if="f.n != null" class="lista-conteo-numero">{{ f.n }}</span>
                </component>
            </li>
        </ul>
        <Paginacion v-model:pagina="pagina" :total="totalPaginas" />
    </template>
    <p v-else class="text-muted small mb-0">{{ vacio }}</p>
</template>
