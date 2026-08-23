<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { getDocentes, agregarDocente, actualizarDocente, eliminarDocente, getGrados, agregarGrado } from '../services/api.js'

const docentes = ref([])
const cargando = ref(true)
const guardando = ref(false)

const abreviaturasCatalogo = ref([])
const mostrarNuevaAbrev = ref(false)
const nuevaAbrevTexto = ref('')

const vacio = () => ({ nombre: '', sexo: '', grado: '', abreviatura: '', cargo: 'Docente' })
const form = ref(vacio())
const editandoId = ref(null) // null = modo "agregar nuevo" / con valor = modo "editando"

async function cargar() {
    cargando.value = true
    docentes.value = (await getDocentes()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    abreviaturasCatalogo.value = await getGrados()
    cargando.value = false
}

onMounted(cargar)

// Da de alta una abreviatura nueva en el catálogo compartido (el
// mismo que usan Firmantes y Destinatarios) sin salir de esta
// pantalla — si ya existe, solo la selecciona en vez de duplicarla.
async function agregarNuevaAbreviatura() {
    const valor = nuevaAbrevTexto.value.trim().toUpperCase()
    if (!valor) return
    const yaExiste = abreviaturasCatalogo.value.find(g => g.valor.toUpperCase() === valor)
    if (yaExiste) {
        form.value.abreviatura = yaExiste.valor
    } else {
        const nuevo = await agregarGrado({ valor })
        abreviaturasCatalogo.value.push(nuevo)
        form.value.abreviatura = nuevo.valor
    }
    mostrarNuevaAbrev.value = false
    nuevaAbrevTexto.value = ''
}

// Un par de docentes tienen "grado" guardado como arreglo (más de un
// título) — aquí se muestran/editan unidos por "; ", y se guardan
// como texto simple de ahí en adelante.
function gradoComoTexto(grado) {
    return Array.isArray(grado) ? grado.join('; ') : (grado || '')
}

function editar(d) {
    editandoId.value = d.id
    form.value = {
        nombre: d.nombre,
        sexo: d.sexo || '',
        grado: gradoComoTexto(d.grado),
        abreviatura: d.abreviatura || '',
        cargo: d.cargo || 'Docente'
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelarEdicion() {
    editandoId.value = null
    form.value = vacio()
    mostrarNuevaAbrev.value = false
    nuevaAbrevTexto.value = ''
}

async function guardar() {
    if (!form.value.nombre) {
        alert('El nombre es obligatorio')
        return
    }
    guardando.value = true
    try {
        const datos = { ...form.value, abreviatura: form.value.abreviatura.toUpperCase() }
        if (editandoId.value) {
            await actualizarDocente(editandoId.value, datos)
        } else {
            await agregarDocente(datos)
        }
        await cargar()
        cancelarEdicion()
    } catch (e) {
        alert('Error al guardar')
    } finally {
        guardando.value = false
    }
}

async function eliminarConfirm(d) {
    if (!confirm(`¿Eliminar a ${d.nombre} de la lista de docentes?`)) return
    await eliminarDocente(d.id)
    await cargar()
    if (editandoId.value === d.id) cancelarEdicion()
}
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">
            <div class="row g-4">
                <!-- FORMULARIO -->
                <div class="col-12 col-lg-5">
                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">
                            {{ editandoId ? 'Editar docente' : 'Agregar nuevo docente' }}
                        </h6>

                        <div v-if="editandoId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando a <strong>{{ form.nombre }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicion" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Nombre completo</label>
                            <input type="text" class="form-control" v-model="form.nombre" placeholder="Ej: Zarina Maryela Basulto Alvarez">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Sexo</label>
                            <select class="form-select" v-model="form.sexo">
                                <option value="">Selecciona...</option>
                                <option value="F">Femenino</option>
                                <option value="M">Masculino</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Grado <span class="text-muted small">(opcional, texto libre)</span></label>
                            <input type="text" class="form-control" v-model="form.grado" placeholder="Ej: MAESTRÍA EN TECNOLOGÍAS DE INFORMACIÓN">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Abreviatura</label>
                            <select class="form-select mb-2" v-model="form.abreviatura">
                                <option value="">Selecciona...</option>
                                <option v-for="g in abreviaturasCatalogo" :key="g.id" :value="g.valor">{{ g.valor }}</option>
                            </select>
                            <button v-if="!mostrarNuevaAbrev" type="button" class="btn btn-sm btn-link p-0"
                                @click="mostrarNuevaAbrev = true">
                                + Agregar abreviatura nueva
                            </button>
                            <div v-else class="d-flex gap-2">
                                <input type="text" class="form-control form-control-sm" v-model="nuevaAbrevTexto"
                                    placeholder="Ej: M.C." @keyup.enter="agregarNuevaAbreviatura">
                                <button type="button" class="btn btn-sm btn-primary" @click="agregarNuevaAbreviatura">Agregar</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary"
                                    @click="mostrarNuevaAbrev = false; nuevaAbrevTexto = ''">Cancelar</button>
                            </div>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" :disabled="guardando" @click="guardar">
                                {{ editandoId ? 'Guardar cambios' : 'Agregar docente' }}
                            </button>
                            <button v-if="editandoId" class="btn btn-outline-secondary" @click="cancelarEdicion">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- LISTA -->
                <div class="col-12 col-lg-7">
                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Docentes registrados</h6>

                        <div v-if="cargando" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="docentes.length === 0" class="text-muted text-center py-4">
                            Todavía no hay docentes registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Grado</th>
                                    <th>Abreviatura</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="d in docentes" :key="d.id" :class="{ 'table-active': editandoId === d.id }">
                                    <td>{{ d.nombre }}</td>
                                    <td class="text-muted small">{{ gradoComoTexto(d.grado) || '—' }}</td>
                                    <td>{{ d.abreviatura }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editar(d)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarConfirm(d)">
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