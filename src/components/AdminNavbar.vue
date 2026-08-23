<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { useSesion } from '../composables/UseSesion.js'

const router = useRouter()
const { usuarioActivo: usuario, cerrarSesion: limpiarSesion } = useSesion()
const dropdownAbierto = ref(false)

function toggleDropdown() {
    dropdownAbierto.value = !dropdownAbierto.value
}

function cerrarSesion() {
    limpiarSesion()
    router.push('/')
}
</script>

<template>
    <nav class="navbar admin-navbar navbar-expand bg-white">
        <div class="container-fluid px-3 px-lg-4">
            <button class="sidebar-toggle" type="button" data-sidebar-toggle aria-controls="adminSidebar"
                aria-expanded="true" aria-label="Toggle sidebar">
                <span></span>
                <span></span>
                <span></span>
            </button>

            <div class="navbar-actions ms-auto">
                <button class="icon-button theme-toggle" type="button" data-theme-toggle
                    aria-label="Switch color theme" title="Switch color theme">
                    <i class="bi bi-moon-stars" data-theme-icon aria-hidden="true"></i>
                </button>

                
                <div class="dropdown" :class="{ show: dropdownAbierto }">
                    <button class="profile-button" type="button" @click="toggleDropdown">
                        <i class="bi bi-person-circle" style="font-size: 1.5rem;" aria-hidden="true"></i>
                        <span class="ms-2 small fw-semibold" v-if="usuario">
                            {{ usuario.nombre }}
                        </span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" :class="{ show: dropdownAbierto }">
                        <li v-if="usuario" class="px-3 py-2">
                            <div class="fw-semibold">{{ usuario.nombre }}</div>
                            <div class="text-muted small text-capitalize">{{ usuario.rol }}</div>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#" @click.prevent="cerrarSesion">
                                <i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>
                                Cerrar Sesión
                            </a>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    </nav>
</template>