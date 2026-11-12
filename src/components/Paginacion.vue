<script setup>
import { computed } from 'vue'

const props = defineProps({
    pagina: { type: Number, required: true },
    total: { type: Number, required: true },

    elementos: { type: Number, default: 0 },
    porPagina: { type: Number, default: 0 },
})
const emit = defineEmits(['update:pagina'])

const VECINAS = 1 

const numeros = computed(() => {
    const { pagina, total } = props
    const lista = []
    for (let n = 1; n <= total; n++) {
        const cerca = Math.abs(n - pagina) <= VECINAS
        if (n === 1 || n === total || cerca) lista.push(n)
        else if (lista[lista.length - 1] !== '…') lista.push('…')
    }
    return lista
})

function ir(n) {
    const destino = Math.min(Math.max(1, n), props.total)
    if (destino !== props.pagina) emit('update:pagina', destino)
}
</script>

<template>
    <nav v-if="total > 1" class="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-2" aria-label="Paginación">
        <span v-if="elementos && porPagina" class="small text-muted me-auto">
            Mostrando {{ (pagina - 1) * porPagina + 1 }}–{{ Math.min(pagina * porPagina, elementos) }} de {{ elementos }}
        </span>
        <div class="d-flex align-items-center gap-1">
            <button type="button" class="btn btn-outline-secondary btn-sm" title="Primera página" aria-label="Primera página"
                :disabled="pagina <= 1" @click="ir(1)">
                <i class="bi bi-chevron-double-left"></i>
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" title="Anterior" aria-label="Página anterior"
                :disabled="pagina <= 1" @click="ir(pagina - 1)">
                <i class="bi bi-chevron-left"></i>
            </button>
            <template v-for="(n, i) in numeros" :key="n === '…' ? `e${i}` : n">
                <span v-if="n === '…'" class="px-1 text-muted">…</span>
                <button v-else type="button" class="btn btn-sm num-pagina"
                    :class="n === pagina ? 'btn-primary' : 'btn-outline-secondary'"
                    :aria-current="n === pagina ? 'page' : null" :aria-label="`Página ${n}`" @click="ir(n)">
                    {{ n }}
                </button>
            </template>
            <button type="button" class="btn btn-outline-secondary btn-sm" title="Siguiente" aria-label="Página siguiente"
                :disabled="pagina >= total" @click="ir(pagina + 1)">
                <i class="bi bi-chevron-right"></i>
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" title="Última página" aria-label="Última página"
                :disabled="pagina >= total" @click="ir(total)">
                <i class="bi bi-chevron-double-right"></i>
            </button>
        </div>
    </nav>
</template>

<style scoped>
.num-pagina {
    min-width: 2rem;
}
</style>