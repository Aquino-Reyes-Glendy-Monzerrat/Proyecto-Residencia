import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getBitacora } from '@/services/api.js'
import { fechaHoy } from '@/utils/fechas.js'
import { esTareaAbierta } from '@/utils/tiposTarea.js'
export const DIAS_AVISO = 2                  

const CADA_MINUTO = 60 * 1000
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
const UN_DIA = 24 * 60 * 60 * 1000


export function diasParaVencer(tarea, hoy = fechaHoy()) {
    const fin = tarea?.fechaCaducidad
    if (!FECHA_ISO.test(fin || '')) return null
    return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / UN_DIA)
}


export function avisoVencimiento(dias) {
    if (dias === null || dias > DIAS_AVISO) return null
    if (dias < 0) return { texto: dias === -1 ? 'Venció ayer' : `Venció hace ${-dias} días`, color: 'danger' }
    if (dias === 0) return { texto: 'Vence hoy', color: 'warning' }
    return { texto: dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`, color: 'warning' }
}

const mismoId = (a, b) => String(a) === String(b)

function esMia(tarea, usuario) {
    if (tarea.asignadoA) return mismoId(tarea.asignadoA, usuario.id)
    return usuario.rol === 'admin' && mismoId(tarea.creadoPor, usuario.id)
}


const conocidas = new Map()

function leerVistas(clave) {
    try {
        return new Set(JSON.parse(localStorage.getItem(clave)) || [])
    } catch {
        return new Set()
    }
}

export function useMisTareas(usuario) {
    const tareas = ref([])
    const llegaron = ref([])     
    const cargado = ref(false)
    const claveVistas = `tareas-vistas-${usuario.id}`
    const vistas = ref(leerVistas(claveVistas))

    async function cargar() {
        try {
            const hoy = fechaHoy()
            const lista = (await getBitacora())
                .filter(t => esTareaAbierta(t) && esMia(t, usuario)) 
                .map(t => {
                    const dias = diasParaVencer(t, hoy)
                    return { ...t, dias, aviso: avisoVencimiento(dias) }
                })

                .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))

            const previas = conocidas.get(usuario.id)
            llegaron.value = previas ? lista.filter(t => !previas.has(String(t.id)) && esNueva(t)) : []
            conocidas.set(usuario.id, new Set(lista.map(t => String(t.id))))
            tareas.value = lista
        } catch {
            
        } finally {
            cargado.value = true
        }
    }

    const porVencer = computed(() => tareas.value.filter(t => t.aviso))

    
    const esNueva = (t) => !vistas.value.has(String(t.id)) && !mismoId(t.creadoPor, usuario.id)
    const nuevas = computed(() => tareas.value.filter(esNueva))

    function marcarVistas() {
        const ids = tareas.value.map(t => String(t.id))
        vistas.value = new Set(ids)
        try { localStorage.setItem(claveVistas, JSON.stringify(ids)) } catch { /* modo privado */ }
    }

    let reloj = null
    onMounted(() => {
        cargar()
        reloj = setInterval(cargar, CADA_MINUTO)
    })
    onUnmounted(() => clearInterval(reloj))

    return { tareas, porVencer, nuevas, llegaron, cargado, esNueva, marcarVistas }
}