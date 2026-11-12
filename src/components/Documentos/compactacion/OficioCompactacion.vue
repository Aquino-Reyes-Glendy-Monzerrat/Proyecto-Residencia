<script setup>
// Formulario del Oficio de compactación (concentrado para RH).
// rae los memos de compactación ya generados en un rango de fechas.
// Se elige a quién incluir y se escriben observaciones.
// Horario y fechas vienen del memo: si están mal, se corrige el memo y se
// vuelve a traer (lo  escrito aqui se conserva).  
// logica  en utils/oficioCompactacion.js.
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDocumentos } from '@/services/api.js'
import { folioDelDocumento,folioActual } from '@/utils/folio.js'
import { fechaConBarras } from '@/utils/fechas.js'
import {
    memosEnRango, filaDesdeMemo, combinarConPrevias, horarioTexto, apellidosPrimero, MAX_OBSERVACION,
} from '@/utils/oficioCompactacion.js'

const props = defineProps({
    campos: { type: Object, required: true },
    config: { type: Object, default: null },
})

const trayendo = ref(false)
const aviso = ref('')
const error = ref('')

const filas = computed(() => props.campos.filas_compactacion || [])

const folioDe = (memo) => {
    const { prefijo, anio } = folioActual(props.config)
    return folioDelDocumento(memo, prefijo, anio)
}

async function traerMemos() {
    aviso.value = ''
    error.value = ''
    const { compactacion_desde: desde, compactacion_hasta: hasta } = props.campos
    if (desde && hasta && desde > hasta) {
        error.value = 'La fecha "desde" no puede ser posterior a "hasta".'
        return
    }
    trayendo.value = true
    try {
        const memos = memosEnRango(await getDocumentos(), desde, hasta)
        const nuevas = combinarConPrevias(memos.map(m => filaDesdeMemo(m, folioDe(m))), filas.value)

        // Si al cambiar el rango se van docentes con observaciones ya
        // escritas, se pregunta antes de perderlas.
        const quedan = new Set(nuevas.map(f => f.memoId))
        const seVan = filas.value.filter(f => !quedan.has(f.memoId) && (f.observaciones || '').trim())
        if (seVan.length && !confirm(`${seVan.length} docente(s) con observaciones ya no están en este rango y se quitarán de la tabla:\n${seVan.map(f => '• ' + f.nombre).join('\n')}\n\n¿Continuar?`)) {
            return
        }

        props.campos.filas_compactacion = nuevas
        aviso.value = memos.length
            ? `Se trajeron ${memos.length} memos.`
            : 'No hay memos de compactación en ese rango.'
    } catch (e) {
        console.error('No se pudieron traer los memos de compactación', e)
        error.value = 'No se pudieron traer los memos. Revisa la conexión e inténtalo de nuevo.'
    } finally {
        trayendo.value = false
    }
}



const route = useRoute()
onMounted(async () => {
    const delLote = String(route.query.lote || '').split(',').filter(Boolean)
    const fecha = String(route.query.fecha || '')
    if (!delLote.length || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || filas.value.length) return 
    props.campos.compactacion_desde = fecha
    props.campos.compactacion_hasta = fecha
    await traerMemos()
    filas.value.forEach(f => { f.incluir = delLote.includes(String(f.memoId)) })
})

</script>

<template>
    <div class="border rounded p-3 mb-3">
        <p class="fw-semibold mb-2  text-center">Traer memos de compactación</p>
        <div class="row g-2 align-items-end">
            <div class="col-6">
                <label class="form-label small mb-1" for="compactacionDesde"> Desde</label>
                <input id="compactacionDesde" type="date" class="form-control form-control-sm"
                    v-model="campos.compactacion_desde">
            </div>
            <div class="col-6">
                <label class="form-label small mb-1" for="compactacionHasta">Hasta</label>
                <input id="compactacionHasta" type="date" class="form-control form-control-sm"
                    v-model="campos.compactacion_hasta">
            </div>
            <div class="col-12">
                <button type="button" class="btn btn-outline-primary btn-sm w-100" :disabled="trayendo"
                    @click="traerMemos">
                    <span v-if="trayendo" class="spinner-border spinner-border-sm me-1"></span>
                    {{ filas.length ? 'Volver a traer memos' : 'Traer memos' }}
                </button>
            </div>
        </div>
        <p v-if="error" class="text-danger small mt-2 mb-0" role="alert">{{ error }}</p>
<p v-else-if="aviso" class="text-muted fw-semibold small mt-2 mb-0" role="status">{{ aviso }}</p>
    </div>

    <div v-if="filas.length" class="border rounded p-3 mb-3">
        <div class="mb-2">
            <p class="fw-semibold mb-1  text-center">Seleccionar docentes</p>
        </div>

        <ul class="list-group list-group-flush">
            <li v-for="fila in filas" :key="fila.memoId" class="list-group-item px-0"
                :class="fila.incluir === false ? 'opacity-50' : 'fila-incluida'">
                <div class="form-check mb-1">
                    <input :id="`incluir-${fila.memoId}`" type="checkbox" class="form-check-input"
                        v-model="fila.incluir">
                        
                        <label class="form-check-label d-block" :for="`incluir-${fila.memoId}`">
                        <span class="d-flex justify-content-between align-items-baseline">
                            <span class="fw-semibold">{{ apellidosPrimero(fila.nombre) || '(sin nombre)' }}</span>
                            <span class="text-muted small text-nowrap ms-2">{{ fila.folio }}</span>
                        </span>
                        <span class="d-flex flex-wrap column-gap-4 small">
                            <span><span class="text-muted">Horario:</span>
                                {{ horarioTexto(fila.hora_entrada, fila.hora_salida) || 'Sin horario' }}</span>
                            <span><span class="text-muted">Fecha:</span>
                                {{ fechaConBarras(fila.fecha_inicio) || '—' }} a {{ fechaConBarras(fila.fecha_fin) || '—' }}</span>
                        </span>
                    </label>

                </div>
                <textarea class="form-control form-control-sm" rows="2" v-model="fila.observaciones"
                    :maxlength="MAX_OBSERVACION" :disabled="fila.incluir === false"
                    :aria-label="`Observaciones de ${fila.nombre}`" placeholder="Observaciones (opcional)"></textarea>
            </li>
        </ul>
    </div>
</template>


<style scoped>

.fila-incluida {
    margin: 0.25rem 0;
    padding-left: 0.75rem !important;
    padding-right: 0.5rem !important;
    border-left: 4px solid #0d6efd !important; 
    border-radius: 6px;
    background: rgba(13, 110, 253, 0.08);
}
</style>