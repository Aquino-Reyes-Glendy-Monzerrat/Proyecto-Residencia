<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMisTareas } from '@/composables/useMisTareas.js'
import { useNavegacionBitacora } from '@/composables/useNavegacionBitacora.js'
import { fechaConBarras } from '@/utils/fechas.js'

const props = defineProps({
    usuario: { type: Object, required: true },
})

const router = useRouter()
const { tareas, porVencer, nuevas, llegaron, cargado, esNueva, marcarVistas } = useMisTareas(props.usuario)
const { irACrearDocumento } = useNavegacionBitacora()

const abierta = ref(false)


function cerrar() {
    abierta.value = false
    marcarVistas()
}

function alternar() {
    if (abierta.value) cerrar()
    else abierta.value = true
}

function abrirTarea(tarea) {
    cerrar()
    irACrearDocumento(tarea)
}


function verTodas() {
    cerrar()
    const destino = { path: props.usuario.rol === 'admin' ? '/bitacora' : '/bitacorasecapo', query: { fase: 'tareas' } }
    if (router.currentRoute.value.path === destino.path) window.location.assign(router.resolve(destino).href)
    else router.push(destino)
}


const aviso = ref(null)
let quitarAviso = null

function mostrarAviso(lineas) {
    if (!lineas.length) return
    aviso.value = lineas
    clearTimeout(quitarAviso)
    quitarAviso = setTimeout(() => { aviso.value = null }, 10000)
}

const tareasNuevas = (n) => n === 1 ? '1 tarea nueva' : `${n} tareas nuevas`
const contar = (n, una, varias) => n === 1 ? `1 ${una}` : `${n} ${varias}`

const CLAVE_AVISO = `aviso-tareas-${props.usuario.id}`

function yaSeAviso() {
    try {
        if (sessionStorage.getItem(CLAVE_AVISO)) return true
        sessionStorage.setItem(CLAVE_AVISO, '1')
    } catch { /* sin sessionStorage: se avisa igual */ }
    return false
}

const unaVez = watch(cargado, (listo) => {
    if (!listo) return
    unaVez()
    const lineas = []
    if (nuevas.value.length) lineas.push(`Tienes ${tareasNuevas(nuevas.value.length)}`)
    const vencidas = porVencer.value.filter(t => t.dias < 0).length
    const proximas = porVencer.value.length - vencidas
    if (vencidas) lineas.push(contar(vencidas, 'tarea vencida', 'tareas vencidas'))
    if (proximas) lineas.push(contar(proximas, 'tarea por vencer', 'tareas por vencer'))
    if (lineas.length && !yaSeAviso()) mostrarAviso(lineas)
})

watch(llegaron, (lista) => {
    if (lista.length) mostrarAviso([`Te asignaron ${tareasNuevas(lista.length)}`])
})

function verDesdeAviso() {
    aviso.value = null
    abierta.value = true
}
</script>

<template>
    <div class="campana">
        <button class="icon-button" type="button" title="Mis tareas pendientes" aria-label="Mis tareas pendientes"
            aria-haspopup="dialog" :aria-expanded="abierta" @click="alternar">
            <i class="bi bi-bell" aria-hidden="true"></i>
            <span v-if="tareas.length" class="campana-contador" :class="porVencer.length ? 'bg-danger' : 'bg-primary'">
                {{ tareas.length > 9 ? '9+' : tareas.length }}
            </span>
        </button>

        <template v-if="abierta">
            <div class="campana-fondo" @click="cerrar"></div>
            <div class="campana-panel" role="dialog" aria-label="Mis tareas pendientes" @keydown.esc="cerrar">
                <div class="campana-titulo">
                    Mis tareas pendientes <span class="text-muted fw-normal">({{ tareas.length }})</span>
                </div>
                <p v-if="!tareas.length" class="small text-muted px-3 py-3 mb-0">No tienes tareas pendientes.</p>
                <ul v-else class="list-unstyled mb-0 campana-lista">
                    <li v-for="t in tareas" :key="t.id">
                        <button type="button" class="campana-tarea" @click="abrirTarea(t)">
                            <span class="d-flex justify-content-between align-items-start gap-2">
                                <span class="fw-semibold small">{{ t.tipo }}</span>
                                <span class="text-nowrap">
                                    <span v-if="esNueva(t)" class="badge text-bg-primary">Nueva</span>
                                    <span v-if="t.aviso" class="badge ms-1" :class="`text-bg-${t.aviso.color}`">
                                        {{ t.aviso.texto }}
                                    </span>
                                </span>
                            </span>
                            <span class="small text-muted d-block text-truncate">{{ t.descripcion }}</span>
                            <span v-if="t.dias !== null" class="small text-muted">
                                Vence: {{ fechaConBarras(t.fechaCaducidad) }}
                            </span>
                        </button>
                    </li>
                </ul>
                <button type="button" class="btn btn-link btn-sm w-100 campana-pie" @click="verTodas">
                    Ver todas en la Bitácora
                </button>
            </div>
        </template>

        
        <Teleport to="body">
            <div v-if="aviso" class="campana-aviso" role="status" aria-live="polite">
                <i class="bi bi-bell-fill text-primary fs-5" aria-hidden="true"></i>
                <div class="flex-grow-1">
                    <div v-for="linea in aviso" :key="linea" class="fw-semibold">{{ linea }}</div>
                    <button type="button" class="btn btn-link btn-sm p-0" @click="verDesdeAviso">Ver mis tareas</button>
                </div>
                <button type="button" class="btn-close" aria-label="Cerrar aviso" @click="aviso = null"></button>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.campana {
    position: relative;
}

.campana-contador {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    color: #fff;
    font-size: 0.7rem;
    line-height: 20px;
    text-align: center;
}

.campana-fondo {
    position: fixed;
    inset: 0;
    z-index: 1050;
}

.campana-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1051;
    width: min(360px, calc(100vw - 32px));
    border: 1px solid var(--admin-border);
    border-radius: 12px;
    background: var(--admin-surface);
    box-shadow: var(--admin-shadow-lg);
    color: var(--admin-text);
    overflow: hidden;
}

.campana-titulo {
    padding: 0.75rem 1rem;
    font-weight: 700;
    border-bottom: 1px solid var(--admin-border);
}

.campana-lista {
    max-height: 360px;
    overflow-y: auto;
}

.campana-tarea {
    display: block;
    width: 100%;
    padding: 0.6rem 1rem;
    border: 0;
    border-bottom: 1px solid var(--admin-border);
    background: transparent;
    color: inherit;
    text-align: left;
}

.campana-tarea:hover,
.campana-tarea:focus-visible {
    background: var(--admin-surface-soft);
}

.campana-aviso {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 1060;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: min(340px, calc(100vw - 32px));
    padding: 0.85rem 1rem;
    border: 1px solid var(--admin-border);
    border-left: 4px solid var(--admin-primary);
    border-radius: 10px;
    background: var(--admin-surface);
    box-shadow: var(--admin-shadow-lg);
    color: var(--admin-text);
}
</style>