<script setup>
// Firmantes y destinatarios: las personas fijas que salen en los oficios
// (quién firma / elabora y a quién va dirigido). Son puestos fijos de las
// plantillas, por eso solo se editan: no se agregan ni se borran. Para
// dirigir un oficio a alguien más está el documento "Otros".
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed } from 'vue'
import {
    getFirmantes, agregarFirmante, actualizarFirmante, eliminarFirmante,
    getDestinatarios, agregarDestinatario, actualizarDestinatario, eliminarDestinatario,
    getGrados,
} from '../services/api.js'
import { useCatalogo } from '@/composables/useCatalogo.js'

// Grados para el selector del formulario (catálogo compartido).
const grados = ref([])

// Dos colecciones distintas, cada una con su useCatalogo (cargar/editar/guardar).
const firmantes = useCatalogo({
    api: { listar: getFirmantes, agregar: agregarFirmante, actualizar: actualizarFirmante, eliminar: eliminarFirmante },
    vacio: () => ({ grado: '', nombre: '', puesto: '', iniciales: '', firma: true }),
    desdeRegistro: (f) => ({ grado: f.grado, nombre: f.nombre, puesto: f.puesto, iniciales: f.iniciales || '', firma: f.firma !== false }),
    validar: (f) => (!f.nombre || !f.puesto ? 'Nombre y puesto son obligatorios' : ''),
    errorGuardar: 'Error al guardar el firmante',
    alCargar: async () => { grados.value = await getGrados() },
})
const destinatarios = useCatalogo({
    api: { listar: getDestinatarios, agregar: agregarDestinatario, actualizar: actualizarDestinatario, eliminar: eliminarDestinatario },
    vacio: () => ({ grado: '', nombre: '', puesto: '' }),
    desdeRegistro: (d) => ({ grado: d.grado, nombre: d.nombre, puesto: d.puesto }),
    validar: (d) => (!d.nombre || !d.puesto ? 'Nombre y puesto son obligatorios' : ''),
    errorGuardar: 'Error al guardar el destinatario',
})

// El catálogo que se está editando ahora (o null si ninguno).
const activo = computed(() => {
    if (firmantes.editandoId.value) return { cat: firmantes, esFirmante: true, titulo: 'Editar firmante' }
    if (destinatarios.editandoId.value) return { cat: destinatarios, esFirmante: false, titulo: 'Editar destinatario' }
    return null
})

// Al editar en una lista se cierra la edición abierta en la otra.
function editar(cat, registro) {
    const otro = cat === firmantes ? destinatarios : firmantes
    if (otro.editandoId.value) otro.cancelarEdicion()
    cat.editar(registro)
}

// Dos columnas: Firmantes (los que firman + Elaboró) y Destinatarios.
// Todas las tablas comparten el mismo formato.
const columnas = computed(() => [
    [
        { titulo: 'Firman los documentos', cat: firmantes, filas: firmantes.lista.value.filter(f => f.firma !== false), conIniciales: true },
        { titulo: 'Elaboró (no firma el documento)', cat: firmantes, filas: firmantes.lista.value.filter(f => f.firma === false), conIniciales: true },
    ],
    [
        { titulo: 'Destinatarios', cat: destinatarios, filas: destinatarios.lista.value, conIniciales: false },
    ],
])
const cargando = computed(() => firmantes.cargando.value || destinatarios.cargando.value)
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">
            <div class="row g-4">
                <!-- FORMULARIO: solo aparece al dar editar en una lista -->
                <div v-if="activo" class="col-12">
                    <div class="panel p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="text-muted m-0">{{ activo.titulo }}: <strong>{{ activo.cat.form.value.nombre }}</strong></h6>
                            <button type="button" class="btn-close" @click="activo.cat.cancelarEdicion()" aria-label="Cancelar edición"></button>
                        </div>
                        <div class="row g-3">
                            <div class="col-12 col-md-2">
                                <label class="form-label">Grado</label>
                                <select class="form-select" v-model="activo.cat.form.value.grado">
                                    <option value="">Selecciona...</option>
                                    <option v-for="g in grados" :key="g.id" :value="g.valor">{{ g.valor }}</option>
                                </select>
                            </div>
                            <div class="col-12" :class="activo.esFirmante ? 'col-md-4' : 'col-md-5'">
                                <label class="form-label">Nombre completo</label>
                                <input type="text" class="form-control" v-model="activo.cat.form.value.nombre">
                            </div>
                            <div class="col-12" :class="activo.esFirmante ? 'col-md-4' : 'col-md-5'">
                                <label class="form-label">Puesto</label>
                                <input type="text" class="form-control" v-model="activo.cat.form.value.puesto">
                            </div>
                            <div v-if="activo.esFirmante" class="col-12 col-md-2">
                                <label class="form-label">Iniciales <span class="text-muted small">(opcional)</span></label>
                                <input type="text" class="form-control" v-model="activo.cat.form.value.iniciales" placeholder="Ej: MAZE">
                            </div>
                        </div>
                        <div class="d-flex flex-wrap align-items-center gap-3 mt-3">
                            <div v-if="activo.esFirmante" class="form-check m-0">
                                <input class="form-check-input" type="checkbox" v-model="activo.cat.form.value.firma" id="checkFirma">
                                <label class="form-check-label" for="checkFirma">
                                    Firma documentos <span class="text-muted small">(desmarca si solo elabora, ej. Elaboró)</span>
                                </label>
                            </div>
                            <div class="d-flex gap-2 ms-auto">
                                <button class="btn btn-outline-secondary" @click="activo.cat.cancelarEdicion()">Cancelar</button>
                                <button class="btn btn-primary" :disabled="activo.cat.guardando.value" @click="activo.cat.guardar()">
                                    Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="cargando" class="col-12">
                    <div class="panel p-4 text-center"><span class="spinner-border"></span></div>
                </div>

                <!-- LISTAS: izquierda Firmantes, derecha Destinatarios -->
                <template v-else>
                <div v-for="(secciones, i) in columnas" :key="i" class="col-12 col-xl-6">
                    <div v-for="s in secciones" :key="s.titulo" class="panel p-4 mb-4">
                        <h6 class="text-muted mb-3">{{ s.titulo }}</h6>

                        <div v-if="s.filas.length === 0" class="text-muted text-center py-3">
                            Todavía no hay nadie en esta lista.
                        </div>

                        <table v-else class="table align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th>Nombre</th>
                                    <th>Puesto</th>
                                    <th v-if="s.conIniciales">Iniciales</th>
                                    <th class="text-end">Editar</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in s.filas" :key="p.id"
                                    :class="{ 'table-active': s.cat.editandoId.value === p.id }">
                                    <td>{{ p.grado }}</td>
                                    <td>{{ p.nombre }}</td>
                                    <td>{{ p.puesto }}</td>
                                    <td v-if="s.conIniciales">{{ p.iniciales }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary" :aria-label="`Editar a ${p.nombre}`"
                                            @click="editar(s.cat, p)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                </template>
            </div>
        </div>
    </AdminLayout>
</template>