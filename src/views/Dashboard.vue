<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function crearDocumento(tipo) {
    router.push(`/nuevo-documento/${tipo}`)
}

const COLORES = ['primary', 'success', 'warning', 'danger']

const documentos = [
    { tipo: 'comision', nombre: 'Comisión', icono: 'bi-bus-front-fill' },
    { tipo: 'liberacion-proyecto', nombre: 'Liberación de Proyecto', icono: 'bi-rocket-takeoff' },
    { tipo: 'aceptacion', nombre: 'Carta de Aceptación', icono: 'bi-building-fill-check' },
    { tipo: 'terminacion', nombre: 'Carta de Terminación', icono: 'bi-check2-circle' },
    { tipo: 'revision-tesis', nombre: 'Oficio de Revisión', icono: 'bi-eye' },
    { tipo: 'memorandum', nombre: 'Memorándum', icono: 'bi-file-text' },
    { tipo: 'mantenimiento', nombre: 'Solicitud de Mantenimiento', icono: 'bi-tools' },
    { tipo: 'otros', nombre: 'Otros', icono: 'bi-journal-text' },
]

</script>

<template>
    <AdminLayout>
        <section class="row g-3">
            <div class="col-12 col-sm-6 col-xl-3" v-for="(doc, i) in documentos" :key="doc.tipo">
                <article class="metric-card" :class="`metric-${COLORES[i % COLORES.length]}`">
                    <div class="metric-top">
                        <span class="metric-label fw-bold">{{ doc.nombre }}</span>
                        <span class="metric-icon"><i :class="['bi', doc.icono]" aria-hidden="true"></i></span>
                    </div>
                    <div class="metric-meta mt-2">
                        <button class="btn btn-sm w-100" :class="`btn-${COLORES[i % COLORES.length]}`" type="button"
                            @click="crearDocumento(doc.tipo)">
                            <i class="bi bi-file-earmark-plus" aria-hidden="true"></i> Crear Documento
                        </button>
                    </div>
                </article>
            </div>
        </section>
    </AdminLayout>
</template>