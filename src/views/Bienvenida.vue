<template>
    <div class="auth-body">
        <button class="icon-button theme-toggle auth-theme-toggle" type="button" data-theme-toggle
            aria-label="Switch color theme" title="Switch color theme">
            <i class="bi bi-moon-stars" data-theme-icon aria-hidden="true"></i>
        </button>

        <main class="welcome-page">
            <div class="welcome-wrapper">
                <div class="welcome-header mb-5">
                    <div class="welcome-logos">
                        <div class="welcome-col-left">
                            <img src="@/assets/images/tecnm.png" alt="Logo tecnm" class="welcome-logo logo-tecnm" />
                        </div>
                        <div class="welcome-col-center">
                            <h1 class="mb-1">Gestor de Documentos</h1>
                            <p class="text-muted mb-0">
                                Departamento de Sistemas y Computación
                            </p>
                        </div>
                        <div class="welcome-col-right">
                            <img src="@/assets/images/itch.png" alt="Logo itch" class="welcome-logo logo-itch" />
                        </div>
                    </div>
                </div>

                <div class="row g-3 justify-content-center">
                    <div class="col-12 col-sm-6 col-lg-5">
                        <section class="auth-card">
                            <form @submit.prevent="handleLogin" novalidate>
                                <div class="mb-4">
                                    <p class="text-muted mb-0 text-center">
                                        Ingrese sus credenciales
                                    </p>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label" for="loginEmail">Correo</label>
                                    <input
                                        v-model="email"
                                        class="form-control"
                                        :class="{ 'is-invalid': errorCampo === 'correo' }"
                                        id="loginEmail"
                                        type="email"
                                        autocomplete="off"
                                        required
                                    />
                                    <div class="invalid-feedback">{{ error }}</div>
                                </div>

                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <label class="form-label" for="loginPassword">Contraseña</label>
                                        <RouterLink class="small fw-semibold" to="#">¿Olvidaste tu contraseña?</RouterLink>
                                    </div>
                                    <div class="input-group">
                                        <input
                                            v-model="password"
                                            class="form-control"
                                            :class="{ 'is-invalid': errorCampo === 'password' }"
                                            id="loginPassword"
                                            :type="verPassword ? 'text' : 'password'"
                                            minlength="6"
                                            autocomplete="current-password"
                                            required
                                        />
                                        <button type="button" class="btn btn-outline-secondary" @click="verPassword = !verPassword">
                                            <i :class="verPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                                        </button>
                                        <div class="invalid-feedback">{{ error }}</div>
                                    </div>
                                </div>

                                <div class="form-check mb-4">
                                    <input v-model="rememberMe" class="form-check-input" type="checkbox" id="rememberMe" />
                                    <label class="form-check-label" for="rememberMe">Recordar</label>
                                </div>

                                <!-- Mensaje de error general (cuenta inactiva) -->
                                <div v-if="errorCampo === 'cuenta'" class="alert alert-warning mb-3">
                                    <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
                                </div>

                                <button class="btn btn-primary w-100" type="submit" :disabled="cargando">
                                    <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                                    <i v-else class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                                    {{ cargando ? 'Verificando...' : 'Iniciar Sesión' }}
                                </button>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlantilla } from '../composables/usePlantilla'
import { buscarPorCorreo } from '../services/api.js'
import { useSesion } from '../composables/UseSesion.js'

const router = useRouter()
const { initPlantilla } = usePlantilla()
const { guardarSesion } = useSesion()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const error = ref('')
const errorCampo = ref('')  // 'correo' | 'password' | 'cuenta'
const cargando = ref(false)
const verPassword = ref(false)

async function handleLogin() {
    error.value = ''
    errorCampo.value = ''
    cargando.value = true

    try {
        // Paso 1: buscar por correo
        const usuario = await buscarPorCorreo(email.value)

        // Caso 1: correo no existe
        if (!usuario) {
            error.value = 'El correo no está registrado en el sistema'
            errorCampo.value = 'correo'
            return
        }

        // Caso 2: contraseña incorrecta
        if (usuario.password !== password.value) {
            error.value = 'Contraseña incorrecta'
            errorCampo.value = 'password'
            return
        }

        // Caso 3: cuenta inactiva
        if (usuario.estado !== 'activo') {
            error.value = 'Tu cuenta está inactiva. Contacta al administrador.'
            errorCampo.value = 'cuenta'
            return
        }

        // Caso 4: todo bien
        guardarSesion(usuario)
        // Redirigir según rol: director y cualquier rol con 'sub' (p.ej. subdirectora)
        if (usuario.rol && (usuario.rol === 'director' || usuario.rol.includes('sub'))) {
            router.push('/bandejaaprobacion')
        } else {
            router.push('/dashboard')
        }

    } catch (e) {
        error.value = 'Error al conectar con el servidor. Intenta de nuevo.'
        errorCampo.value = 'cuenta'
    } finally {
        cargando.value = false
    }
}

onMounted(() => {
    initPlantilla()
})
</script>