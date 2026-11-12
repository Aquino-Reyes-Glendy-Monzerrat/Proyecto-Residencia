//para que amntenimiento solo ocupe una hoja 
//y no s ecorra leyenda y firma en otra pag
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const PX_POR_MM = 96 / 25.4
const ALTO_HOJA_MM = 279
const ANCHO_IMPRESION_MM = 207

const RESERVA_FIRMA_MM = 32

export function useMantenimientoUnaHoja({ hoja, activo, observar }) {
    const cabe = ref(true)
    let espera = null

    function medir() {
        const original = hoja.value
        if (!activo() || !original) {
            cabe.value = true
            return
        }


        const copia = original.cloneNode(true)
        copia.querySelectorAll('.firma-electronica-pdf').forEach(el => el.remove())


        Object.assign(copia.style, {
            position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden',
            width: `${ANCHO_IMPRESION_MM}mm`, minHeight: '0', height: 'auto', display: 'block',
        })

        document.body.appendChild(copia)
        const alto = copia.scrollHeight
        copia.remove()


        cabe.value = alto <= (ALTO_HOJA_MM - RESERVA_FIRMA_MM) * PX_POR_MM
    }


    watch(observar, () => {
        clearTimeout(espera)
        espera = setTimeout(() => nextTick(medir), 200)
    }, { deep: true, immediate: true })

    onBeforeUnmount(() => clearTimeout(espera))

    return { cabe, medir }
}