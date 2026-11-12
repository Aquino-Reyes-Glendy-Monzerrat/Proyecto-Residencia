// Memos de compactación para varios docentes a la vez 
import { ref, computed, watch } from 'vue'
import { formatearFolio, folioActual } from '@/utils/folio.js'


const DATOS_DOCENTE = ['fecha_inicio', 'fecha_fin', 'hora_entrada', 'hora_salida']

export function useLoteCompactacion({ campos, config, categoriaFolio, aplicarDocente, limpiarDocente, generarUno }) {
    const activo = ref(false)
    const filas = ref([])       
    const indiceVista = ref(0)   
    const generando = ref(false)
    const terminado = ref(false)

    const total = computed(() => filas.value.length)
    const procesados = computed(() => filas.value.filter(f => f.estado === 'listo' || f.estado === 'error').length)
    const listos = computed(() => filas.value.filter(f => f.estado === 'listo'))
    const fallidos = computed(() => filas.value.filter(f => f.estado === 'error'))

    
    const rangoFolios = computed(() => {
        const cat = config.value?.folio?.[categoriaFolio.value]
        if (!cat || total.value === 0) return ''
        const { prefijo, anio } = folioActual(config.value)
        const inicio = (cat.actual || 0) + 1
        const texto = (n) => formatearFolio(n, prefijo, anio)
        return total.value === 1 ? texto(inicio) : `${texto(inicio)} a ${texto(inicio + total.value - 1)}`
    })

    const seleccionado = (docente) => filas.value.some(f => String(f.docente.id) === String(docente.id))
    const incompleta = (fila) => DATOS_DOCENTE.some(c => !fila[c])

    function filaNueva(docente) {
        const vacios = Object.fromEntries(DATOS_DOCENTE.map(c => [c, '']))
        return { docente, ...vacios, estado: 'pendiente', folio: '', id: null, error: '' }
    }

    function alternar(docente) {
        if (seleccionado(docente)) {
            filas.value = filas.value.filter(f => String(f.docente.id) !== String(docente.id))
        } else {
            filas.value.push(filaNueva(docente))
            indiceVista.value = filas.value.length - 1
        }
        if (total.value === 0) limpiar()
        else mostrar(Math.min(indiceVista.value, total.value - 1))
    }

    function quitar(fila) {
        alternar(fila.docente)
    }

    function copiarDelAnterior(i) {
        const anterior = filas.value[i - 1]
        if (!anterior) return
        DATOS_DOCENTE.forEach(c => { filas.value[i][c] = anterior[c] })
    }

    
    
    function aplicar(fila) {
        aplicarDocente(fila.docente)
        DATOS_DOCENTE.forEach(c => { campos.value[c] = fila[c] })
    }

    function mostrar(i) {
        indiceVista.value = Math.max(0, i)
        const fila = filas.value[indiceVista.value]
        if (fila) aplicar(fila)
    }

    
    watch(() => filas.value.map(f => DATOS_DOCENTE.map(c => f[c]).join()), () => {
        if (!generando.value) mostrar(indiceVista.value)
    })

    function motivoNoGenerar() {
        if (total.value === 0) return 'Selecciona al menos un docente.'
        for (const f of filas.value) {
            const nombre = f.docente.nombre
            if (incompleta(f)) return `Faltan fechas u horario de ${nombre}.`
            if (f.fecha_fin < f.fecha_inicio) return `La fecha fin de ${nombre} es antes de la de inicio.`
            if (f.hora_salida <= f.hora_entrada) return `La hora de salida de ${nombre} debe ser después de la de entrada.`
        }
        return ''
    }

    
    async function generar(lista = filas.value.filter(f => f.estado !== 'listo')) {
        generando.value = true
        for (const fila of lista) {
            fila.estado = 'generando'
            fila.error = ''
            aplicar(fila)
            try {
                const { id, folio } = await generarUno()
                Object.assign(fila, { id, folio, estado: 'listo' })
            } catch (e) {
                Object.assign(fila, { estado: 'error', error: e?.message || 'No se pudo generar.' })
            }
        }
        generando.value = false
        terminado.value = true
    }

    function reintentarFallidos() {
        return generar(fallidos.value)
    }
    
    function limpiar() {
        limpiarDocente()
        DATOS_DOCENTE.forEach(c => { campos.value[c] = '' })
    }

    function reiniciar() {
        filas.value = []
        indiceVista.value = 0
        terminado.value = false
        limpiar()
    }

    function cambiarModo(varios) {
        if (varios === activo.value) return
        reiniciar()
        activo.value = varios
    }

    return {
        activo, filas, indiceVista, generando, terminado,
        total, procesados, listos, fallidos, rangoFolios,
        seleccionado, incompleta, alternar, quitar, copiarDelAnterior, mostrar,
        motivoNoGenerar, generar, reintentarFallidos, reiniciar, cambiarModo,
    }
}
