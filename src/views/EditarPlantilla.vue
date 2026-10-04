<script setup>
import AdminLayout from '@/layout/AdminLayout.vue';
import { useRouter } from 'vue-router'

const router = useRouter()

const COLORES = ['primary', 'success', 'warning', 'danger']

function editarPlantilla(tipo) {
    router.push(`/editar-plantilla/${tipo}`)
}


//comente esos ,son fijo ,no es probable que cambien o se editen
//mantenimiento solo cambien encabezados de iso 
//otros es libre no tiene caso editar en
//revision igual ya tiene detalle que es libre
const documentosEditables = [
    { tipo: 'comision-externa', nombre: 'Comisión Externa', icono: 'bi-bus-front-fill' },
    { tipo: 'comision-interna', nombre: 'Comisión Interna', icono: 'bi-bus-front-fill' },
    { tipo: 'aceptacion-residencia', nombre: 'Aceptación de Residencia', icono: 'bi-building-fill-check' },
    { tipo: 'aceptacion-servicio-social', nombre: 'Aceptación Servicio Social', icono: 'bi-people-fill' },
    { tipo: 'terminacion-servicio-social', nombre: 'Terminación Servicio Social', icono: 'bi-check2-circle' },
    { tipo: 'terminacion-residencia', nombre: 'Terminación de Residencia', icono: 'bi-check2-square' },
    //{ tipo: 'liberacion-proyecto', nombre: 'Liberación de Proyecto', icono: 'bi-rocket-takeoff' },
    //{ tipo: 'revision-tesis', nombre: 'Oficio de Revisión', icono: 'bi-eye' },
    { tipo: 'memorandum-solventacion-faltas', nombre: 'Memorándum Solventación de Faltas', icono: 'bi-file-text' },
    { tipo: 'memorandum-compactacion-horario', nombre: 'Memorándum Compactación', icono: 'bi-file-text' },
    //{ tipo: 'otros', nombre: 'Otros', icono: 'bi-journal-text' },
    { tipo: 'mantenimiento', nombre: 'Solicitud de Mantenimiento', icono: 'bi-tools' },
    { tipo: 'tutorias', nombre: 'Tutorías', icono: 'bi-person-video3' },
]


</script>


<template>
    <AdminLayout>
        <main class="dashboard-content">
            <section class="row g-3" aria-label="Plantillas">

                <div class="col-12 col-sm-6 col-xl-3" v-for="(doc, i) in documentosEditables" :key="doc.tipo">
                    <article class="metric-card" :class="`metric-${COLORES[i % COLORES.length]}`"
                        @click="editarPlantilla(doc.tipo)">
                        <div class="metric-top">
                            <span class="metric-label fw-bold">{{ doc.nombre }}</span>
                            <span class="metric-icon"><i :class="['bi', doc.icono]" aria-hidden="true"></i></span>
                        </div>
                        <div class="metric-meta mt-2">
                            <button class="btn btn-sm w-100" :class="`btn-${COLORES[i % COLORES.length]}`"
                                type="button">
                                <i class="bi bi-pencil-square" aria-hidden="true"></i> Editar Plantilla
                            </button>
                        </div>
                    </article>
                </div>

            </section>

        </main>
    </AdminLayout>
</template>