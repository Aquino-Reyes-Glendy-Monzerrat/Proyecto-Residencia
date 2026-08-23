<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { getGrados, agregarGrado, actualizarGrado, eliminarGrado, getCcpOpciones, agregarCcpOpcion, actualizarCcpOpcion, eliminarCcpOpcion } from '../services/api.js'

const grados = ref([])
const cargandoGrados = ref(true)
const guardandoGrado = ref(false)

const formGrado = ref({ valor: '' })
const editandoGradoId = ref(null)

async function cargarGrados() {
    cargandoGrados.value = true
    grados.value = await getGrados()
    cargandoGrados.value = false
}

onMounted(cargarGrados)

function editarGrado(g) {
    editandoGradoId.value = g.id
    formGrado.value = { valor: g.valor }
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelarEdicionGrado() {
    editandoGradoId.value = null
    formGrado.value = { valor: '' }
}

async function guardarGrado() {
    if (!formGrado.value.valor.trim()) {
        alert('Escribe un valor')
        return
    }
    guardandoGrado.value = true
    try {
        const datos = { valor: formGrado.value.valor.trim() }
        if (editandoGradoId.value) {
            await actualizarGrado(editandoGradoId.value, datos)
        } else {
            await agregarGrado(datos)
        }
        await cargarGrados()
        cancelarEdicionGrado()
    } catch (e) {
        alert('Error al guardar')
    } finally {
        guardandoGrado.value = false
    }
}

async function eliminarGradoConfirm(g) {
    if (!confirm(`¿Eliminar "${g.valor}" del catálogo de grados?`)) return
    await eliminarGrado(g.id)
    await cargarGrados()
    if (editandoGradoId.value === g.id) cancelarEdicionGrado()
}

// ─── CCP OPCIONES ───
const ccpOpciones = ref([])
const cargandoCcp = ref(true)
const guardandoCcp = ref(false)

const formCcp = ref('')
const editandoCcpId = ref(null)

async function cargarCcp() {
    cargandoCcp.value = true
    ccpOpciones.value = await getCcpOpciones()
    cargandoCcp.value = false
}

onMounted(cargarCcp)

function editarCcp(c) {
    editandoCcpId.value = c.id
    formCcp.value = c.etiqueta
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelarEdicionCcp() {
    editandoCcpId.value = null
    formCcp.value = ''
}

async function guardarCcp() {
    if (!formCcp.value.trim()) {
        alert('Escribe una etiqueta')
        return
    }
    guardandoCcp.value = true
    try {
        if (editandoCcpId.value) {
            await actualizarCcpOpcion(editandoCcpId.value, { etiqueta: formCcp.value.trim() })
        } else {
            await agregarCcpOpcion({ etiqueta: formCcp.value.trim() })
        }
        await cargarCcp()
        cancelarEdicionCcp()
    } catch (e) {
        alert('Error al guardar')
    } finally {
        guardandoCcp.value = false
    }
}

async function eliminarCcpConfirm(c) {
    if (!confirm(`¿Eliminar "${c.etiqueta}" del catálogo de notas de copia?`)) return
    await eliminarCcpOpcion(c.id)
    await cargarCcp()
    if (editandoCcpId.value === c.id) cancelarEdicionCcp()
}
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">

            <div class="row g-4">
                <!-- ── GRADOS (abrev) ── -->
                <div class="col-12 col-lg-4">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">
                            {{ editandoGradoId ? 'Editar grado' : 'Agregar grado' }}
                        </h6>

                        <div v-if="editandoGradoId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando <strong>{{ formGrado.valor }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionGrado" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label">Grado</label>
                                <input type="text" class="form-control" v-model="formGrado.valor" placeholder="Ej: M.T.I."
                                    @keyup.enter="guardarGrado">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoGrado" @click="guardarGrado">
                                {{ editandoGradoId ? 'Guardar' : 'Agregar' }}
                            </button>
                            <button v-if="editandoGradoId" class="btn btn-outline-secondary" @click="cancelarEdicionGrado">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Grados registrados</h6>

                        <div v-if="cargandoGrados" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="grados.length === 0" class="text-muted text-center py-4">
                            Todavía no hay grados registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="g in grados" :key="g.id" :class="{ 'table-active': editandoGradoId === g.id }">
                                    <td>{{ g.valor }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarGrado(g)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarGradoConfirm(g)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- ── CCP OPCIONES  ── -->
                <div class="col-12 col-lg-8">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">
                            {{ editandoCcpId ? 'Editar destino' : 'Agregar destino de nota de copia' }}
                        </h6>

                        <div v-if="editandoCcpId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando <strong>{{ formCcp }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionCcp" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label">Destino</label>
                                <input type="text" class="form-control" v-model="formCcp" placeholder="Ej: Departamento de Planeación"
                                    @keyup.enter="guardarCcp">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoCcp" @click="guardarCcp">
                                {{ editandoCcpId ? 'Guardar' : 'Agregar' }}
                            </button>
                            <button v-if="editandoCcpId" class="btn btn-outline-secondary" @click="cancelarEdicionCcp">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Destinos registrados</h6>
                        <p class="text-muted small">
                            Estas son las opciones que aparecen como casillas en "Nota de copia (ccp)"
                            al crear un documento.
                        </p>

                        <div v-if="cargandoCcp" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="ccpOpciones.length === 0" class="text-muted text-center py-4">
                            Todavía no hay destinos registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Destino</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="c in ccpOpciones" :key="c.id" :class="{ 'table-active': editandoCcpId === c.id }">
                                    <td>{{ c.etiqueta }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarCcp(c)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarCcpConfirm(c)">
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