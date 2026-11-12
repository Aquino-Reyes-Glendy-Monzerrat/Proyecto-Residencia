
import { ref, computed, watch } from 'vue'


export function usePaginacion(lista, porPagina = 10, { pagina = ref(1), reiniciarCon } = {}) {
    const totalPaginas = computed(() => Math.max(1, Math.ceil(lista.value.length / porPagina)))
    const visibles = computed(() => lista.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina))

    if (reiniciarCon) watch(reiniciarCon, () => { pagina.value = 1 })
    else watch(lista, () => { pagina.value = 1 })

    watch(totalPaginas, (total) => {
        if (lista.value.length && pagina.value > total) pagina.value = total
    })

    return { pagina, totalPaginas, visibles }
}