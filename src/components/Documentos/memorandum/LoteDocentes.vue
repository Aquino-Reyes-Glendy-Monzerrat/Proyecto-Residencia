<script setup>
import { ref, computed } from 'vue'
import { normalizarBusqueda } from '@/utils/busquedaBitacora.js'

const props = defineProps({
    lote: { type: Object, required: true },      
    docentes: { type: Array, default: () => [] },
})

const busqueda = ref('')
const sinAcentos = (t) => normalizarBusqueda(t).normalize('NFD').replace(/[̀-ͯ]/g, '')

const docentesVisibles = computed(() => {
    const q = sinAcentos(busqueda.value)
    return [...props.docentes]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .filter(d => !q || sinAcentos(d.nombre).includes(q))
})

const CAMPOS = [
    { clave: 'fecha_inicio', etiqueta: 'Fecha inicio', tipo: 'date' },
    { clave: 'fecha_fin', etiqueta: 'Fecha fin', tipo: 'date' },
    { clave: 'hora_entrada', etiqueta: 'Entrada', tipo: 'time' },
    { clave: 'hora_salida', etiqueta: 'Salida', tipo: 'time' },
]
</script>

<template>
    <label class="form-label d-flex justify-content-between">
        <span>Docentes <span class="text-danger">*</span></span>
        <span class="small text-muted">{{ lote.total }} seleccionado{{ lote.total === 1 ? '' : 's' }}</span>
    </label>
    <input type="text" class="form-control form-control-sm mb-2" placeholder="Buscar docente…" v-model="busqueda">
    <div class="border rounded p-2 mb-3" style="max-height: 200px; overflow-y: auto;">
        <div v-for="d in docentesVisibles" :key="d.id" class="form-check">
            <input :id="`lote-docente-${d.id}`" class="form-check-input" type="checkbox"
                :checked="lote.seleccionado(d)" @change="lote.alternar(d)">
            <label class="form-check-label" :for="`lote-docente-${d.id}`">{{ d.nombre }}</label>
        </div>
        <p v-if="!docentesVisibles.length" class="small text-muted mb-0">Ningún docente coincide.</p>
    </div>

    <template v-if="lote.total">
        <label class="form-label">Fechas y horario de cada docente ({{ lote.total }})</label>
        <div v-for="(fila, i) in lote.filas" :key="fila.docente.id" class="border rounded p-2 mb-2 lote-fila"
            :class="{ 'lote-fila-vista': i === lote.indiceVista, 'border-warning': lote.incompleta(fila) }"
            @click="lote.mostrar(i)">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                <span class="small fw-semibold">{{ i + 1 }}. {{ fila.docente.nombre }}</span>
                <button type="button" class="btn btn-sm btn-link text-danger p-0" title="Quitar"
                    @click.stop="lote.quitar(fila)"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="row g-2">
                <div v-for="c in CAMPOS" :key="c.clave" class="col-6">
                    <label class="form-label small mb-0">{{ c.etiqueta }}</label>
                    <input :type="c.tipo" class="form-control form-control-sm" v-model="fila[c.clave]"
                        @focus="lote.mostrar(i)">
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1">
                <span v-if="lote.incompleta(fila)" class="text-warning" style="font-size: .75rem">
                    <i class="bi bi-exclamation-circle"></i> Faltan datos
                </span>
                <span v-else></span>
                <button v-if="i > 0" type="button" class="btn btn-sm btn-link p-0 text-decoration-none"
                    style="font-size: .8rem" @click.stop="lote.copiarDelAnterior(i)">
                    <i class="bi bi-copy me-1"></i>Copiar del anterior
                </button>
            </div>
        </div>
    </template>
</template>

<style scoped>
.lote-fila {
    cursor: pointer;
}


.lote-fila-vista {
    border-color: var(--bs-primary) !important;
    box-shadow: 0 0 0 1px var(--bs-primary);
}
</style>
