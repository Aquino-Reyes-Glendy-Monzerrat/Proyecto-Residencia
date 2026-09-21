// Resuelve qué logo usar (el subido por el Admin, o el de siempre si
// no se ha reemplazado ninguno),se ve en nuevodoc y formato
import { computed } from 'vue'
import headerImgDefault from '@/assets/images/logo-encabezado.png'
import pieImgDefault from '@/assets/images/pie.png'

export function useImagenesDocumento(config) {
    const headerImgActual = computed(() => config.value?.estilo?.headerImgBase64 || headerImgDefault)
    const pieImgActual = computed(() => config.value?.estilo?.pieImgBase64 || pieImgDefault)
    return { headerImgActual, pieImgActual }
}