<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlantilla, actualizarPlantilla, getConfiguracion, getFirmantes, getDestinatarios } from '../services/api.js'

const route = useRoute()
const router = useRouter()

const tipo = route.params.tipo
const plantilla = ref(null)
const cuerpoEditado = ref('')
const cargando = ref(false)
const guardando = ref(false)

const asuntoEditado = ref('')

const config = ref(null)
const firmantes = ref([])
const destinatarios = ref([])

const esMemorandum = computed(() => tipo.startsWith('memorandum'))
const esRevisionTesis = computed(() => tipo === 'revision-tesis')
const esComision = computed(() => tipo.startsWith('comision'))
const esComisionInterna = computed(() => tipo === 'comision-interna')
const esAlumno = computed(() => ['aceptacion-residencia', 'terminacion-residencia',
    'aceptacion-servicio-social', 'terminacion-servicio-social'].includes(tipo))


function buscarPorClave(clave) {
    return firmantes.value.find(f => f.clave === clave) || null
}
function buscarDestinatarioPorClave(clave) {
    return destinatarios.value.find(d => d.clave === clave) || null
}

onMounted(async () => {
    cargando.value = true
    plantilla.value = await getPlantilla(tipo)
    cuerpoEditado.value = plantilla.value?.cuerpo || ''
    asuntoEditado.value = plantilla.value?.asunto || ''
    config.value = await getConfiguracion()
    firmantes.value = await getFirmantes()
    destinatarios.value = await getDestinatarios()
    cargando.value = false
})

async function guardarCambios() {
    guardando.value = true
    try {
        const cambios = { asunto: asuntoEditado.value }
        if (plantilla.value.cuerpo !== null) cambios.cuerpo = cuerpoEditado.value
        await actualizarPlantilla(plantilla.value.id, cambios)
        alert('Plantilla actualizada correctamente')
        router.push({ name: 'editarPlantilla' })
    } catch (e) {
        alert('Error al guardar los cambios')
    } finally {
        guardando.value = false
    }
}

const vistaPreviaEjemplo = computed(() => {
    return cuerpoEditado.value.replace(/\{(\w+)\}/g, (match, nombre) => `[${nombre}]`)
})

const placeholdersDisponibles = computed(() => {
    const encontrados = [...cuerpoEditado.value.matchAll(/\{(\w+)\}/g)].map(m => m[1])
    return [...new Set(encontrados)]
})
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-4">
            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>

            <div v-else class="row g-4">
                <div class="col-12 col-lg-6">
                    <div class="panel p-4">
                        <h5 class="mb-3">
                            <i class="bi bi-pencil-square me-2"></i>
                            Editando: {{ plantilla?.nombre }}
                        </h5>

                        <div class="mb-3" v-if="plantilla?.asunto !== undefined">
                            <label class="form-label">Asunto</label>
                            <input type="text" class="form-control" v-model="asuntoEditado">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Texto de la plantilla</label>
                            <textarea class="form-control" rows="10" v-model="cuerpoEditado"></textarea>
                        </div>

                        <button class="btn btn-primary" @click="guardarCambios" :disabled="guardando">
                            <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
                            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
                        </button>
                    </div>
                </div>

                <div class="col-12 col-lg-6">
                    <div class="panel p-4">
                        <h6 class="text-muted mb-3"><i class="bi bi-eye me-2"></i>Vista previa</h6>

                        <div class="bg-white border rounded p-4 documento-carta"
                            style="width:100%; font-size:13px; line-height:1.5; color:#333;">

                            <div class="w-100 mb-3 pb-2">
                                <img src="/src/assets/images/logo-encabezado.png"
                                    alt="Encabezado Institucional SEP TecNM" style="max-width: 100%; height: auto;">
                            </div>

                            <div class="text-end mb-3" style="font-size:11px;">
                                Chetumal, Quintana Roo, DD/MM/AAAA<br>
                                <template v-if="esMemorandum"><strong>MEMORANDUM NO: P-XXX/2026</strong></template>
                                <template v-else>Oficio No. P-XXX/2026</template>
                            </div>

                            <!--  -->
                            <div class="mb-3" style="font-size:12px;">
                                <template v-if="esMemorandum">
                                    <strong>{{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.grado }} {{
                                        buscarDestinatarioPorClave('jefe_recursos_humanos')?.nombre }}</strong><br>
                                    {{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.puesto }}
                                </template>


                                <template v-else-if="esAlumno">
                                    <div class="mb-2 text-end"
                                        :style="{ fontSize: config?.estilo.tamano_asunto + 'pt' }">
                                        <strong>ASUNTO: {{ asuntoEditado }}</strong>
                                    </div>
                                    <strong>{{ buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.grado }} {{
                                        buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.nombre }}</strong><br>
                                    {{ buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.puesto }}<br>
                                    PRESENTE:
                                </template>



                                <template v-else-if="esRevisionTesis">
                                    <strong>A QUIEN CORRESPONDA</strong><br>
                                    PRESENTE
                                </template>
                                <template v-else>
                                    <strong>[NOMBRE DEL DESTINATARIO]</strong><br>
                                    <span v-if="esComision">DOCENTE<br></span>
                                    PRESENTE
                                </template>
                            </div>

                            <div class="doc-cuerpo" style="font-size:12px;" v-html="vistaPreviaEjemplo"></div>

                            <div class="mt-4" style="font-size:11px;">
                                <strong style="letter-spacing: 0.27em;">ATENTAMENTE</strong><br>
                                <em>Excelencia en Educación Tecnológica®</em><br>
                                <em>Cultura, Ciencia y Tecnología para la Superación de México®</em><br><br>

                                <template v-if="esComision && !esComisionInterna">
                                    <strong>{{ buscarPorClave('director')?.grado }} {{
                                        buscarPorClave('director')?.nombre }}</strong><br>
                                    {{ buscarPorClave('director')?.puesto }}
                                </template>
                                <template v-else>
                                    <strong>{{ buscarPorClave('jefe_depto')?.grado }} {{
                                        buscarPorClave('jefe_depto')?.nombre }}</strong><br>
                                    {{ buscarPorClave('jefe_depto')?.puesto }}
                                </template>
                            </div>

                            <div class="w-100 text-center mt-4" style="font-size:10px; line-height:1.3;">
                                <img src="/src/assets/images/pie.png" alt="Pie de página"
                                    style="max-width:100%; height:auto;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>