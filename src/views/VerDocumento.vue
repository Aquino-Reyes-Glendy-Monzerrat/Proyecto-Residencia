<script setup>
import AdminLayout from '@/layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocumentoPorId, getConfiguracion } from '../services/api.js'

const route = useRoute()
const router = useRouter()
const doc = ref(null)
const cargando = ref(true)

onMounted(async () => {
    cargando.value = true
    doc.value = await getDocumentoPorId(route.params.id)

    const config = await getConfiguracion()
    document.documentElement.style.setProperty('--margen-superior', config.estilo.margen_superior + 'cm')
    document.documentElement.style.setProperty('--margen-derecho', config.estilo.margen_derecho + 'cm')
    document.documentElement.style.setProperty('--margen-inferior', config.estilo.margen_inferior + 'cm')
    document.documentElement.style.setProperty('--margen-izquierdo', config.estilo.margen_izquierdo + 'cm')

    cargando.value = false
})

function imprimir() {
    window.print()
}
</script>

<template>
    <AdminLayout>
            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>
            <div v-else>
                <div class="d-flex justify-content-between align-items-center mb-3 no-print">
                    <h5 class="m-0">{{ doc?.folio }}</h5>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary" @click="router.back()">
                            <i class="bi bi-arrow-left"></i> Volver
                        </button>
                        <button class="btn btn-primary" @click="imprimir">
                            <i class="bi bi-printer me-1"></i> Imprimir / Guardar PDF
                        </button>
                    </div>
                </div>

                <div class="bg-white border rounded p-4 documento-carta" style="color:#333;" v-html="doc?.cuerpo"></div>
            </div>
   
    </AdminLayout>
</template>