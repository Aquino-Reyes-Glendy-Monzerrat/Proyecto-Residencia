// Estado y cálculos de un selector de folio (automático vs reservado)
// para una categoría de config.folio dada — reutilizable entre todos
// los tipos de documento que consumen folio compartido.
import { ref, computed } from 'vue'

// categoriaRef: qué categoría de config.folio aplica.
// configRef: la configuración institucional completa.
export function useFolio(categoriaRef, configRef) {
    const folioSeleccionado = ref('automatico') // 'automatico' | numero de un folio reservado
    const mostrarReservados = ref(false) // despliega/oculta la lista de folios reservados

    const siguienteFolioTexto = computed(() => {
        if (!configRef.value || !categoriaRef.value) return ''
        const cat = configRef.value.folio[categoriaRef.value]
        const siguiente = (cat?.actual || 0) + 1
        return `${configRef.value.folio.prefijo_default}-${String(siguiente).padStart(3, '0')}/${configRef.value.folio.anio}`
    })

    const reservadosLibres = computed(() => {
        if (!configRef.value || !categoriaRef.value) return []
        return (configRef.value.folio[categoriaRef.value]?.reservados || []).filter(f => !f.usado)
    })

    function folioTextoReservado(numero) {
        return `${configRef.value.folio.prefijo_default}-${String(numero).padStart(3, '0')}/${configRef.value.folio.anio}`
    }

    // Reservados ya con su texto armado — así el componente de
    // presentación (SelectorFolio.vue) no necesita recibir la función
    // folioTextoReservado como prop, solo datos planos.
    const reservadosConTexto = computed(() =>
        reservadosLibres.value.map(f => ({ numero: f.numero, texto: folioTextoReservado(f.numero) }))
    )

    // El folio que se ve grande en la tarjeta — el automático o el
    // reservado que se haya elegido.
    const folioMostradoTexto = computed(() => {
        return folioSeleccionado.value === 'automatico'
            ? siguienteFolioTexto.value
            : folioTextoReservado(folioSeleccionado.value)
    })

    return {
        folioSeleccionado,
        mostrarReservados,
        folioMostradoTexto,
        reservadosConTexto,
    }
}