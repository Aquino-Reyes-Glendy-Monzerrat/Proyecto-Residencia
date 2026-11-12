<script setup>
import { computed } from 'vue'

const props = defineProps({

    barras: { type: Array, required: true },
    alto: { type: Number, default: 160 },
})

const valoresDe = (b) => (b.grupo ? b.grupo.map(g => g.valor) : [b.valor])
const maximo = computed(() => Math.max(1, ...props.barras.flatMap(valoresDe)))
const hayDestacadas = computed(() => props.barras.some(b => b.destacada))
const altura = (valor) => (valor ? Math.max(6, Math.round(valor / maximo.value * props.alto)) : 3)

const columnas = computed(() => props.barras.map(b => ({
    ...b,
    altura: altura(b.valor),
    fuerte: hayDestacadas.value ? b.destacada : b.valor > 0 && b.valor === maximo.value,
    grupo: b.grupo?.map(g => ({ ...g, altura: altura(g.valor) })),
})))
</script>

<template>
    <div class="grafica-barras" role="list" :style="{ height: `${alto + 64}px` }">
        <div v-for="c in columnas" :key="c.etiqueta" class="grafica-columna" role="listitem"
            :aria-label="`${c.etiqueta}: ${valoresDe(c).join(', ')}`">
            <div v-if="c.grupo" class="grafica-grupo" :class="{ atenuada: hayDestacadas && !c.destacada }">
                <div v-for="g in c.grupo" :key="g.clase" class="grafica-subcolumna">
                    <span class="grafica-valor" :class="{ 'text-muted': !g.valor }">{{ g.valor }}</span>
                    <div class="grafica-barra" :class="[g.clase, { vacia: !g.valor }]" :style="{ height: `${g.altura}px` }">
                    </div>
                </div>
            </div>
            <template v-else>
                <span class="grafica-valor" :class="{ 'text-muted': !c.valor }">{{ c.valor }}</span>
                <div class="grafica-barra" :class="{ fuerte: c.fuerte, vacia: !c.valor, apilada: c.partes && c.valor }"
                    :style="{ height: `${c.altura}px` }">
                    <template v-if="c.partes && c.valor">
                        <span v-for="p in c.partes" :key="p.clase" :class="p.clase" :style="{ flexGrow: p.valor }"></span>
                    </template>
                </div>
            </template>
            <span class="grafica-etiqueta">{{ c.etiqueta }}</span>
        </div>
    </div>
</template>