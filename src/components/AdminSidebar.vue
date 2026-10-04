<script setup>
import { useSesion } from '../composables/UseSesion.js'
const { usuarioActivo: usuario } = useSesion()
</script>

<template>
    <div class="sidebar-backdrop" data-sidebar-close></div>

    <aside class="admin-sidebar" id="adminSidebar" aria-label="Main navigation">
        <div class="sidebar-header">
            <RouterLink class="brand-mark" to="/dashboard">
                <img src="/src/assets/images/itch.png" alt="Logo" class="logo">
                <span class="brand-copy">
                    <span class="brand-title">Gestor de Documentos</span>
                    <span class="brand-subtitle">Depto. de Sistemas y Computación</span>
                </span>
            </RouterLink>
        </div>

        <nav class="sidebar-nav">


            <!-- subdirecccion y direccion -->

            <RouterLink v-if="usuario && (usuario.rol === 'director' || usuario.rol === 'subdirectora')"
                class="nav-link" to="/bandejaaprobacion" active-class="active">
                <span class="nav-icon"><i class="bi bi-inbox"></i></span>
                <span class="nav-text">Bandeja de autorización</span>
            </RouterLink>

            <!-- todos los roles (excepto sub y dir) -->

            <RouterLink v-if="usuario && !['director', 'subdirectora'].includes(usuario.rol)" class="nav-link"
                to="/dashboard" active-class="active">
                <span class="nav-icon"><i class="bi bi-file-earmark-plus"></i></span>
                <span class="nav-text">Nuevo Documento</span>
            </RouterLink>



            <!-- solo Admin -->

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/bitacora" active-class="active">
                <span class="nav-icon"><i class="bi bi-clipboard2-minus"></i></span>
                <span class="nav-text">Bitácora</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/editarPlantilla"
                active-class="active">
                <span class="nav-icon"><i class="bi bi-pencil-square"></i></span>
                <span class="nav-text">Editar Plantilla</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/horarios" active-class="active">
                <span class="nav-icon"><i class="bi bi-clock"></i></span>
                <span class="nav-text">Horarios</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/tutorias" active-class="active">
                <span class="nav-icon"><i class="bi bi-mortarboard-fill"></i></span>
                <span class="nav-text">Tutorías</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/formatodoc"
                active-class="active">
                <span class="nav-icon"><i class="bi bi-file-earmark-word"></i></span>
                <span class="nav-text">Formato Documento</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/firmantes"
                active-class="active">
                <span class="nav-icon"><i class="bi bi-pencil"></i></span>
                <span class="nav-text">Firmantes</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/destinatarios"
                active-class="active">
                <span class="nav-icon"><i class="bi bi-envelope-arrow-up"></i></span>
                <span class="nav-text">Destinatarios</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/docentes" active-class="active">
                <span class="nav-icon"><i class="bi bi-person-video2"></i></span>
                <span class="nav-text">Docentes</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/folionumeracion"
                active-class="active">
                <span class="nav-icon"><i class="bi bi-123"></i></span>
                <span class="nav-text">Folio y Numeración</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/catalogo" active-class="active">
                <span class="nav-icon"><i class="bi bi-bookmark-star"></i></span>
                <span class="nav-text">Catalogo</span>
            </RouterLink>

            <RouterLink v-if="usuario && usuario.rol === 'admin'" class="nav-link" to="/usuarios" active-class="active">
                <span class="nav-icon"><i class="bi bi-people"></i></span>
                <span class="nav-text">Usuarios</span>
            </RouterLink>

            <!-- Solo Secretaria y Apoyo -->

            <RouterLink v-if="usuario && ['secretaria', 'apoyo'].includes(usuario.rol)" class="nav-link"
                to="/bitacorasecapo" active-class="active">
                <span class="nav-icon"><i class="bi bi-clock-history"></i></span>
                <span class="nav-text">Bitacora</span>
            </RouterLink>

        </nav>
    </aside>
</template>