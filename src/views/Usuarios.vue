<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { getUsuarios, agregarUsuario, actualizarUsuario, eliminarUsuario } from '../services/api.js'

const usuarios = ref([])

const nuevoUsuario = ref({ nombre: '', email: '', password: '', rol: '' })
const cambioPassword = ref({ usuarioId: null, nombreUsuario: '', password: '', confirmar: '' })

const verPasswordNuevo = ref(false)
const verPassword = ref(false)
const verConfirmar = ref(false)

let modalNuevoInstancia = null
let modalPasswordInstancia = null

// Carga usuarios de json-server
onMounted(async () => {
    usuarios.value = await getUsuarios()
})

function abrirModalNuevo() {
    const modalEl = document.getElementById('modalNuevoUsuario')
    modalNuevoInstancia = new Modal(modalEl)
    modalNuevoInstancia.show()
}

function cerrarModalNuevo() {
    if (modalNuevoInstancia) modalNuevoInstancia.hide()
    nuevoUsuario.value = { nombre: '', email: '', password: '', rol: '' }
    verPasswordNuevo.value = false
}

async function guardarUsuario() {
    if (!nuevoUsuario.value.nombre || !nuevoUsuario.value.email || !nuevoUsuario.value.password || !nuevoUsuario.value.rol) {
        alert('Por favor completa todos los campos')
        return
    }
    const usuario = await agregarUsuario({
        nombre: nuevoUsuario.value.nombre,
        email: nuevoUsuario.value.email,
        password: nuevoUsuario.value.password,
        rol: nuevoUsuario.value.rol,
        estado: 'aprobado'
    })
    usuarios.value.push(usuario)
    cerrarModalNuevo()
}

function abrirModalPassword(usuario) {
    cambioPassword.value = { usuarioId: usuario.id, nombreUsuario: usuario.nombre, password: '', confirmar: '' }
    verPassword.value = false
    verConfirmar.value = false
    const modalEl = document.getElementById('modalCambiarPassword')
    modalPasswordInstancia = new Modal(modalEl)
    modalPasswordInstancia.show()
}

function cerrarModalPassword() {
    if (modalPasswordInstancia) modalPasswordInstancia.hide()
    cambioPassword.value = { usuarioId: null, nombreUsuario: '', password: '', confirmar: '' }
    verPassword.value = false
    verConfirmar.value = false
}

async function guardarPassword() {
    if (!cambioPassword.value.password || !cambioPassword.value.confirmar) {
        alert('Por favor completa ambos campos')
        return
    }
    if (cambioPassword.value.password !== cambioPassword.value.confirmar) {
        alert('Las contraseñas no coinciden')
        return
    }
    if (cambioPassword.value.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres')
        return
    }
    await actualizarUsuario(cambioPassword.value.usuarioId, {
        password: cambioPassword.value.password
    })
    alert(`Contraseña de ${cambioPassword.value.nombreUsuario} actualizada correctamente`)
    cerrarModalPassword()
}

async function desactivar(usuario) {
    await actualizarUsuario(usuario.id, { estado: 'inactivo' })
    usuario.estado = 'inactivo'
}

async function reactivar(usuario) {
    await actualizarUsuario(usuario.id, { estado: 'activo' })
    usuario.estado = 'activo'
}

async function eliminar(usuario) {
    if (confirm(`¿Estás seguro de eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`)) {
        await eliminarUsuario(usuario.id)
        usuarios.value = usuarios.value.filter(u => u.id !== usuario.id)
    }
}
</script>

<template>
    <AdminLayout>

        <div class="heading-actions mb-3">
            <button type="button" class="btn btn-primary btn-sm" @click="abrirModalNuevo">
                <i class="bi bi-person-plus" aria-hidden="true"></i> Nuevo Usuario
            </button>
        </div>

        <section class="panel">
            <div class="table-responsive">
                <table class="table align-middle mb-0" id="usuariosTabla">
                    <thead>
                        <tr>
                            <th scope="col">Nombre</th>
                            <th scope="col">Correo</th>
                            <th scope="col">Rol</th>
                            <th scope="col">Estado</th>
                            <th scope="col" class="text-center">Contraseña</th>
                            <th scope="col" class="text-center">Cuenta</th>
                            <th scope="col" class="text-center">Eliminar</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="usuario in usuarios" :key="usuario.id">
                            <td>{{ usuario.nombre }}</td>
                            <td class="text-muted">{{ usuario.email }}</td>
                            <td>
                                <select class="form-select form-select-sm w-auto" v-model="usuario.rol"
                                    :disabled="usuario.rol === 'admin'">
                                    <option value="admin">Admin</option>
                                    <option value="secretaria">Secretaria</option>
                                    <option value="apoyo">Apoyo</option>
                                </select>
                            </td>
                            <td>
                                <span v-if="usuario.estado === 'activo'"
                                    class="badge bg-success-subtle text-success">Activo</span>
                                <span v-if="usuario.estado === 'inactivo'"
                                    class="badge bg-secondary-subtle text-secondary">Inactivo</span>
                            </td>

                            <!-- Contraseña -->
                            <td class="text-center">
                                <template v-if="usuario.rol !== 'admin'">
                                    <button type="button" class="btn btn-sm btn-outline-secondary"
                                        @click="abrirModalPassword(usuario)">
                                        <i class="bi bi-key"></i> Cambiar
                                    </button>
                                </template>
                                <span v-else class="text-muted small">—</span>
                            </td>

                            <!-- Cuenta -->
                            <td class="text-center">
                                <template v-if="usuario.rol !== 'admin'">
                                    <button v-if="usuario.estado === 'activo'" type="button"
                                        class="btn btn-sm btn-outline-danger" @click="desactivar(usuario)">
                                        <i class="bi bi-person-x"></i> Desactivar
                                    </button>
                                    <button v-if="usuario.estado === 'inactivo'" type="button"
                                        class="btn btn-sm btn-outline-success" @click="reactivar(usuario)">
                                        <i class="bi bi-person-check"></i> Reactivar
                                    </button>
                                </template>
                                <span v-else class="text-muted small">—</span>
                            </td>

                            <!-- Eliminar -->
                            <td class="text-center">
                                <template v-if="usuario.rol !== 'admin'">
                                    <button type="button" class="btn btn-sm btn-danger" @click="eliminar(usuario)">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </template>
                                <span v-else class="text-muted small">—</span>
                            </td>
                        </tr>

                        <tr v-if="usuarios.length === 0">
                            <td colspan="7" class="text-center text-muted py-4">
                                <i class="bi bi-people" style="font-size: 2rem;"></i>
                                <p class="mt-2 mb-0">No hay usuarios registrados</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- MODAL NUEVO USUARIO -->
        <div class="modal fade" id="modalNuevoUsuario" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-person-plus"></i> Nuevo Usuario</h5>
                        <button type="button" class="btn-close" @click="cerrarModalNuevo" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Nombre completo <span class="text-danger">*</span></label>
                            <input type="text"  class="form-control" v-model="nuevoUsuario.nombre" required autocomplete="off" >
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Correo <span class="text-danger">*</span></label>
                            <input type="email" class="form-control" v-model="nuevoUsuario.email" required autocomplete="off">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contraseña <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input :type="verPasswordNuevo ? 'text' : 'password'" class="form-control"
                                    v-model="nuevoUsuario.password" minlength="6" required autocomplete="off">
                                <button type="button" class="btn btn-outline-secondary"
                                    @click="verPasswordNuevo = !verPasswordNuevo">
                                    <i :class="verPasswordNuevo ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                                </button>
                            </div>
                            <div class="form-text">Mínimo 6 caracteres</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Rol <span class="text-danger">*</span></label>
                            <select class="form-select" v-model="nuevoUsuario.rol" required>
                                <option value="">Selecciona un rol</option>
                                <option value="admin">Admin</option>
                                <option value="secretaria">Secretaria</option>
                                <option value="apoyo">Apoyo</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cerrarModalNuevo">
                            <i class="bi bi-x-circle"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" @click="guardarUsuario">
                            <i class="bi bi-check-lg"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL CAMBIAR CONTRASEÑA -->
        <div class="modal fade" id="modalCambiarPassword" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="bi bi-key"></i> Cambiar contraseña</h5>
                        <button type="button" class="btn-close" @click="cerrarModalPassword"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted small mb-3">
                            Usuario: <strong>{{ cambioPassword.nombreUsuario }}</strong>
                        </p>
                        <div class="mb-3">
                            <label class="form-label">Nueva contraseña <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input :type="verPassword ? 'text' : 'password'" class="form-control"
                                    v-model="cambioPassword.password" minlength="6" required>
                                <button type="button" class="btn btn-outline-secondary"
                                    @click="verPassword = !verPassword">
                                    <i :class="verPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Confirmar contraseña <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input :type="verConfirmar ? 'text' : 'password'" class="form-control"
                                    v-model="cambioPassword.confirmar" required>
                                <button type="button" class="btn btn-outline-secondary"
                                    @click="verConfirmar = !verConfirmar">
                                    <i :class="verConfirmar ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cerrarModalPassword">
                            <i class="bi bi-x-circle"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" @click="guardarPassword">
                            <i class="bi bi-check-lg"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </AdminLayout>
</template>