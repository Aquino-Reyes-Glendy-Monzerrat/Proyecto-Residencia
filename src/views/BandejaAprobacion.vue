<!-- //para sub y dir -->

<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { getDocumentosPorEstado, autorizarDocumento, rechazarDocumento } from '../services/api.js'
import { useSesion } from '../composables/UseSesion.js'

const { usuarioActivo: usuario } = useSesion()

const ESTADO_POR_ROL = {
    subdirectora: 'pendiente_subdirectora',
    director: 'pendiente_director'
}
const SIGUIENTE_ESTADO = {
    subdirectora: 'pendiente_director',
    director: 'autorizado'
}

const estadoBandeja = ESTADO_POR_ROL[usuario?.rol] || 'pendiente_subdirectora'
const siguienteEstado = SIGUIENTE_ESTADO[usuario?.rol] || 'pendiente_director'

const documentos = ref([])
const cargando = ref(true)
const verId = ref(null)
const rechazandoId = ref(null)
const textoObservaciones = ref('')
const procesando = ref(false)

async function cargar() {
    cargando.value = true
    documentos.value = await getDocumentosPorEstado(estadoBandeja)
    cargando.value = false
}

onMounted(cargar)

function toggleVer(id) {
    verId.value = verId.value === id ? null : id
}

async function autorizar(doc) {
    if (!confirm(`¿Autorizar el documento ${doc.folio}?`)) return
    procesando.value = true
    try {
        const destino = (usuario?.rol === 'subdirectora' && doc.campos?.para_jefe_depto)
            ? 'autorizado'
            : siguienteEstado
        await autorizarDocumento(doc.id, destino)
        await cargar()
    } finally {
        procesando.value = false
    }
}

function abrirRechazo(id) {
    rechazandoId.value = id
    textoObservaciones.value = ''
}

function cancelarRechazo() {
    rechazandoId.value = null
    textoObservaciones.value = ''
}

async function confirmarRechazo(doc) {
    if (!textoObservaciones.value.trim()) {
        alert('Escribe el motivo antes de continuar')
        return
    }
    procesando.value = true
    try {
        await rechazarDocumento(doc.id, textoObservaciones.value.trim(), usuario?.rol === 'director' ? 'El Director' : 'La Subdirectora')
        rechazandoId.value = null
        await cargar()
    } finally {
        procesando.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-4">

            <h5 class="mb-4">{{ usuario?.rol === 'director'
                ? 'Oficios ya revisados por la Subdirectora, pendientes de su autorización final.'
                : 'Oficios pendientes de su revisión.' }}</h5>

            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>

            <div v-else-if="documentos.length === 0" class="text-muted text-center py-5">
                <i class="bi bi-inbox" style="font-size:2rem;"></i>
                <p class="mt-2 mb-0">No hay documentos pendientes por ahora.</p>
            </div>

            <div v-else class="d-flex flex-column gap-3">
                <div v-for="doc in documentos" :key="doc.id" class="panel p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <p class="fw-semibold mb-0">{{ doc.folio }} — {{ doc.asunto }}</p>
                            <p class="text-muted small mb-0">Fecha: {{ doc.fecha }}</p>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary" @click="toggleVer(doc.id)">
                            <i class="bi bi-eye me-1"></i>{{ verId === doc.id ? 'Ocultar' : 'Ver documento' }}
                        </button>
                    </div>

                    <div v-if="verId === doc.id" class="border rounded p-3 mt-3 bg-white text-dark" v-html="doc.cuerpo">
                    </div>

                    <div v-if="rechazandoId === doc.id" class="alert alert-danger mt-3 mb-0">
                        <label class="form-label small fw-semibold">Motivo por el que no se autoriza</label>
                        <p class="small text-muted mb-2">
                            El documento será devuelto al Jefe del Depto. de Sistemas y Computación con el motivo por el
                            cual no se autorizó para su revisión o corrección.
                        </p>
                        <textarea class="form-control form-control-sm mb-2" rows="3"
                            v-model="textoObservaciones"></textarea>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-secondary" :disabled="procesando"
                                @click="cancelarRechazo">Cancelar</button>
                            <button class="btn btn-sm btn-danger" :disabled="procesando"
                                @click="confirmarRechazo(doc)">Confirmar rechazo</button>
                        </div>
                    </div>

                    <div v-else class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-success" :disabled="procesando" @click="autorizar(doc)">
                            <i class="bi bi-check-lg me-1"></i>Autorizar
                        </button>
                        <button class="btn btn-sm btn-danger" :disabled="procesando" @click="abrirRechazo(doc.id)">
                            <i class="bi bi-x-lg me-1"></i>No autorizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>