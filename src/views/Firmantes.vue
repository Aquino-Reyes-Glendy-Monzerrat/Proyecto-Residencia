<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed } from 'vue'
import { getFirmantes, agregarFirmante, actualizarFirmante, eliminarFirmante, getGrados } from '../services/api.js'
import { useCatalogo } from '@/composables/useCatalogo.js'

// Grados para el selector del formulario (catálogo compartido).
const grados = ref([])

// Lista + formulario de agregar/editar (ver useCatalogo.js).
const {
    lista: firmantes, cargando, guardando, form, editandoId, editar, cancelarEdicion, guardar, eliminar,
} = useCatalogo({
    api: { listar: getFirmantes, agregar: agregarFirmante, actualizar: actualizarFirmante, eliminar: eliminarFirmante },
    vacio: () => ({ grado: '', nombre: '', puesto: '', iniciales: '', firma: true }),
    desdeRegistro: (f) => ({ grado: f.grado, nombre: f.nombre, puesto: f.puesto, iniciales: f.iniciales || '', firma: f.firma !== false }),
    validar: (f) => (!f.nombre || !f.puesto ? 'Nombre y puesto son obligatorios' : ''),
    textoEliminar: (f) => `¿Eliminar a ${f.nombre} de la lista de firmantes?`,
    errorGuardar: 'Error al guardar el firmante',
    alCargar: async () => { grados.value = await getGrados() },
})

// Quienes sí firman los documentos, vs quienes solo elaboran/capturan
// (misma colección, mismo formulario — se distingue por el checkbox)
const soloFirmantes = computed(() => firmantes.value.filter(f => f.firma !== false))
const soloElaboran = computed(() => firmantes.value.filter(f => f.firma === false))
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">

            <div class="row g-4">
                <!-- FORMULARIO -->
                <div class="col-12 col-lg-5">
                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">
                            {{ editandoId ? 'Editar firmante' : 'Agregar nuevo firmante' }}
                        </h6>

                        <div v-if="editandoId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando a <strong>{{ form.nombre }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicion" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Grado</label>
                            <select class="form-select" v-model="form.grado">
                                <option value="">Selecciona...</option>
                                <option v-for="g in grados" :key="g.id" :value="g.valor">{{ g.valor }}</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre completo</label>
                            <input type="text" class="form-control" v-model="form.nombre" placeholder="Ej: MANUEL ABRAHAM ZAPATA ENCALADA">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Puesto</label>
                            <input type="text" class="form-control" v-model="form.puesto" placeholder="Ej: JEFE DEL DEPTO. DE SISTEMAS Y COMPUTACIÓN">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Iniciales <span class="text-muted small">(opcional)</span></label>
                            <input type="text" class="form-control" v-model="form.iniciales" placeholder="Ej: MAZE">
                        </div>
                        <div class="mb-3 form-check">
                            <input class="form-check-input" type="checkbox" v-model="form.firma" id="checkFirma">
                            <label class="form-check-label" for="checkFirma">
                                Firma documentos
                                <span class="text-muted small d-block">Desmarca si solo elabora/captura, sin firmar (ej. Elaboró)</span>
                            </label>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" :disabled="guardando" @click="guardar">
                                {{ editandoId ? 'Guardar cambios' : 'Agregar firmante' }}
                            </button>
                            <button v-if="editandoId" class="btn btn-outline-secondary" @click="cancelarEdicion">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- LISTA -->
                <div class="col-12 col-lg-7">
                    <div class="panel p-4 mb-4">
                        <h6 class="text-muted mb-3">Firmantes registrados</h6>

                        <div v-if="cargando" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="soloFirmantes.length === 0" class="text-muted text-center py-4">
                            Todavía no hay firmantes registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th>Nombre</th>
                                    <th>Puesto</th>
                                    <th>Iniciales</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in soloFirmantes" :key="f.id" :class="{ 'table-active': editandoId === f.id }">
                                    <td>{{ f.grado }}</td>
                                    <td>{{ f.nombre }}</td>
                                    <td>{{ f.puesto }}</td>
                                    <td>{{ f.iniciales }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editar(f)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminar(f)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Elaboró (no firma el documento)</h6>

                        <div v-if="!cargando && soloElaboran.length === 0" class="text-muted text-center py-4">
                            Todavía no hay nadie en esta lista.
                        </div>

                        <table v-if="!cargando && soloElaboran.length > 0" class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th>Nombre</th>
                                    <th>Puesto</th>
                                    <th>Iniciales</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in soloElaboran" :key="f.id" :class="{ 'table-active': editandoId === f.id }">
                                    <td>{{ f.grado }}</td>
                                    <td>{{ f.nombre }}</td>
                                    <td>{{ f.puesto }}</td>
                                    <td>{{ f.iniciales }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editar(f)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminar(f)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>