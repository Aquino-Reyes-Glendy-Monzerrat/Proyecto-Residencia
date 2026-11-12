// Logos de encabezado y pie de los documentos
//
// Cada documento conserva los logos con los que se crearon
import { computed } from 'vue'

export const LOGOS_DEFAULT = {
    encabezado: '/images/documentos/logo-encabezado-2026.png',
    pie: '/images/documentos/pie-2026.png',
}


const RUTA_VIEJA = /\/(src\/)?assets\/(images\/)?(logo-encabezado|pie)[\w-]*\.png$/

const SELECTOR = { encabezado: 'img.header-doc-img', pie: 'img.pie-doc-img' }


export function logosDelCuerpo(html) {
    if (!html) return {}
    const pagina = new DOMParser().parseFromString(html, 'text/html')
    const logos = {}
    for (const [clave, selector] of Object.entries(SELECTOR)) {
        const src = pagina.querySelector(selector)?.getAttribute('src')
        if (src) logos[clave] = RUTA_VIEJA.test(src) ? LOGOS_DEFAULT[clave] : src
    }
    return logos
}


export function useImagenesDocumento(config, doc = null) {
    const actuales = computed(() => ({
        encabezado: config.value?.estilo?.headerImgBase64 || LOGOS_DEFAULT.encabezado,
        pie: config.value?.estilo?.pieImgBase64 || LOGOS_DEFAULT.pie,
    }))
    const logos = computed(() => ({ ...actuales.value, ...logosDelCuerpo(doc?.value?.cuerpo) }))
    
    const logosDe = (documento) => ({ ...actuales.value, ...logosDelCuerpo(documento?.cuerpo) })

    return {
        headerImgActual: computed(() => logos.value.encabezado),
        pieImgActual: computed(() => logos.value.pie),
        logosDe,
    }
}