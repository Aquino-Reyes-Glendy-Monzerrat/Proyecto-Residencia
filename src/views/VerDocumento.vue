<script setup>
import AdminLayout from '@/layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocumentoPorId, getConfiguracion } from '../services/api.js'
import { folioRealDe, imprimirConNombre } from '@/utils/folio.js'
import { estiloDe, variablesDeEstilo } from '@/utils/estiloDocumento.js'

const route = useRoute()
const router = useRouter()
const doc = ref(null)
const config = ref(null)
const cargando = ref(true)

const noEncontrado = ref(false)

onMounted(async () => {
    cargando.value = true
    try {
        doc.value = await getDocumentoPorId(route.params.id)
        config.value = await getConfiguracion()
    } catch (e) {

        noEncontrado.value = true
    } finally {
        cargando.value = false
    }
})



function imprimir() {
    imprimirConNombre(doc.value?.tipo, doc.value?.campos)
}
</script>

<template>
    <AdminLayout>
        <div v-if="cargando" class="text-center py-5">
            <span class="spinner-border"></span>
        </div>
        <div v-else-if="noEncontrado" class="text-center py-5">
            <i class="bi bi-file-earmark-x" style="font-size:3rem"></i>
            <h5 class="mt-3">Documento no encontrado</h5>
            <p class="text-muted">Es posible que se haya borrado.</p>
            <button class="btn btn-success" @click="router.back()">
                <i class="bi bi-arrow-left"></i> Volver
            </button>
        </div>
        <div v-else>
            <div class="d-flex justify-content-between align-items-center mb-3 no-print">
                <h5 class="m-0">{{ folioRealDe(doc, config?.folio?.prefijo_default, config?.folio?.anio) }}</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-success" @click="router.back()">
                        <i class="bi bi-arrow-left"></i> Volver
                    </button>
                    <button class="btn btn-primary" @click="imprimir">
                        <i class="bi bi-printer me-1"></i> Imprimir / Guardar PDF
                    </button>
                </div>
            </div>
            <div class="bg-white border rounded p-4 documento-carta" style="color:#333;"
                :style="variablesDeEstilo(estiloDe(doc, config))" v-html="doc?.cuerpo"></div>
        </div>

    </AdminLayout>
</template>