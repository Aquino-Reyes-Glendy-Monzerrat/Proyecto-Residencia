// recordar los filtros de bitacoras para que sigan puestos
// al regresar de ver, editar, generar o al recargar
// y tambien limpiador de filtros

import { watch , computed  } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

function aceptable(texto, def) {
    if (typeof texto !== 'string' || texto.length > 100) return false
    if (def.esFecha && !FECHA_ISO.test(texto)) return false
    if (def.esNumero && !/^[1-9]\d{0,3}$/.test(texto)) return false
    if (def.permitidos && !def.permitidos.includes(texto)) return false
    return true
}

function leerSesion(clave) {
    try {
        return JSON.parse(sessionStorage.getItem(clave) || '{}') || {}
    } catch {
        return {}
    }
}

function guardarSesion(clave, datos) {
    try {
        sessionStorage.setItem(clave, JSON.stringify(datos))
    } catch {

    }
}

export function useFiltrosGuardados(clave, filtros) {
    const route = useRoute()
    const router = useRouter()
    const nombres = Object.keys(filtros)

    const vacioDe = (n) => ('vacio' in filtros[n] ? filtros[n].vacio : '')


    const enUrl = nombres.some(n => route.query[n] !== undefined)
    const origen = enUrl ? route.query : leerSesion(clave)
    for (const n of nombres) {
        const texto = origen[n]
        if (aceptable(texto, filtros[n])) filtros[n].valor.value = filtros[n].esNumero ? Number(texto) : texto
        }


    watch(() => nombres.map(n => filtros[n].valor.value), () => {
        const activos = {}
        for (const n of nombres) {
            const v = filtros[n].valor.value
            if (v !== null && v !== undefined && v !== '' && v !== vacioDe(n)) activos[n] = String(v)
        }
        const otros = Object.fromEntries(Object.entries(route.query).filter(([k]) => !nombres.includes(k)))
        router.replace({ query: { ...otros, ...activos } })
        guardarSesion(clave, activos)
    }, { immediate: true })

    function limpiar() {
        for (const n of nombres) filtros[n].valor.value = vacioDe(n)
    }

    
    const hayFiltros = computed(() => nombres.some(n => {
        const v = filtros[n].valor.value
        return v !== null && v !== undefined && v !== '' && v !== vacioDe(n)
    }))

    return { limpiar, hayFiltros }
}