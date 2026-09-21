<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlantilla, actualizarPlantilla, getConfiguracion, getFirmantes, getDestinatarios } from '../services/api.js'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { CampoPlaceholder, textoARaw, rawATexto } from '../tiptap/CampoPlaceholder.js'
import { EJEMPLOS_CAMPOS, EJEMPLOS_POR_PLANTILLA } from '../utils/ejemplosPlaceholders.js'

const route = useRoute()
const router = useRouter()

const tipo = route.params.tipo
const plantilla = ref(null)
const cuerpoEditado = ref('')
const cargando = ref(false)
const guardando = ref(false)

const asuntoEditado = ref('')
const encabezadoIsoEditado = ref({
    nombreDocumento: '',
    fechaAprobacion: '',
    revision: '',
    sistemaGestion: '',
    referenciaNorma: '',
})

const editor = useEditor({
    extensions: [StarterKit, CampoPlaceholder],
    content: '',
    editorProps: { attributes: { class: 'form-control editor-chips' } },
    onUpdate: ({ editor }) => {
        cuerpoEditado.value = rawATexto(editor.getHTML())
    },
})

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
    if (plantilla.value?.encabezadoIso) {
        encabezadoIsoEditado.value = { ...plantilla.value.encabezadoIso }
    }
    config.value = await getConfiguracion()
    firmantes.value = await getFirmantes()
    destinatarios.value = await getDestinatarios()
    cargando.value = false
    await nextTick()
    editor.value?.commands.setContent(textoARaw(cuerpoEditado.value))
})

async function guardarCambios() {
    guardando.value = true
    try {
        const cambios = { asunto: asuntoEditado.value }
        if (plantilla.value.cuerpo !== null) cambios.cuerpo = cuerpoEditado.value
        if (tipo === 'mantenimiento') cambios.encabezadoIso = encabezadoIsoEditado.value
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
    const excepciones = EJEMPLOS_POR_PLANTILLA[tipo] || {}
    return cuerpoEditado.value.replace(/\{(\w+)\}/g, (match, nombre) =>
        excepciones[nombre] || EJEMPLOS_CAMPOS[nombre] || `[${nombre}]`)
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

                        <div class="mb-3" v-if="plantilla?.cuerpo !== null">
                            <label class="form-label">Texto de la plantilla</label>
                            <EditorContent :editor="editor" />
                            <div class="small text-muted mt-1">
                                <i class="bi bi-info-circle me-1"></i>Arrastra una pastilla para reacomodarla
                            </div>
                        </div>

                        <template v-if="tipo === 'mantenimiento'">
                            <div class="mb-3">
                                <label class="form-label">Nombre del Documento</label>
                                <input type="text" class="form-control" v-model="encabezadoIsoEditado.nombreDocumento">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Fecha de Aprobación</label>
                                <input type="text" class="form-control" v-model="encabezadoIsoEditado.fechaAprobacion">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Revisión</label>
                                <input type="text" class="form-control" v-model="encabezadoIsoEditado.revision">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Sistema Integral de Gestión <span
                                        class="text-muted small">(una norma por línea)</span></label>
                                <textarea class="form-control" rows="3"
                                    :value="encabezadoIsoEditado.sistemaGestion.replaceAll('<br>', '\n')"
                                    @input="encabezadoIsoEditado.sistemaGestion = $event.target.value.replaceAll('\n', '<br>')"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Referencia a la Norma <span class="text-muted small">(una por
                                        línea)</span></label>
                                <textarea class="form-control" rows="3"
                                    :value="encabezadoIsoEditado.referenciaNorma.replaceAll('<br>', '\n')"
                                    @input="encabezadoIsoEditado.referenciaNorma = $event.target.value.replaceAll('\n', '<br>')"></textarea>
                            </div>
                        </template>

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

                            <table v-if="tipo === 'mantenimiento'"
                                style="width:100%; border-collapse:collapse; border:1px solid #000; font-size:11px;">
                                <tr>
                                    <td rowspan="3"
                                        style="width:15%; text-align:center; vertical-align:middle; border:1px solid #000; padding:4px;">
                                        <img src="/src/assets/images/itch.png" alt="LOGO"
                                            style="max-width:100%; max-height:80px;">
                                    </td>
                                    <td rowspan="2"
                                        style="width:55%; vertical-align:top; border:1px solid #000; padding:4px;">
                                        <strong>Nombre del Documento:</strong> {{ encabezadoIsoEditado.nombreDocumento
                                        }}
                                    </td>
                                    <td style="width:30%; border:1px solid #000; padding:4px;">
                                        <strong>Fecha de Aprobación:</strong> {{ encabezadoIsoEditado.fechaAprobacion }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="border:1px solid #000; padding:4px;">
                                        <strong>Revisión:</strong> {{ encabezadoIsoEditado.revision }}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="border:1px solid #000; padding:0;">
                                        <table style="width:100%; border-collapse:collapse; border:none;">
                                            <tr>
                                                <td
                                                    style="width:50%; border-right:1px solid #000; padding:4px; vertical-align:top;">
                                                    <strong>Sistema Integral de Gestión:</strong><br>
                                                    <span v-html="encabezadoIsoEditado.sistemaGestion"></span>
                                                </td>
                                                <td style="width:50%; padding:4px; vertical-align:top;">
                                                    <strong>Referencia a la Norma:</strong><br>
                                                    <span v-html="encabezadoIsoEditado.referenciaNorma"></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td
                                        style="vertical-align:middle; border:1px solid #000; padding:4px; text-align:center;">
                                        <strong>Página 1 de 1</strong>
                                    </td>
                                </tr>
                            </table>

                            <template v-else>

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
                                            buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.nombre
                                            }}</strong><br>
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

                            </template>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>



<style>
.editor-chips {
    min-height: 220px;
    line-height: 2.1;
}

.editor-chips .chip-campo {
    display: inline-flex;
    align-items: center;
    background: rgba(96, 165, 250, 0.16);
    border: 1px solid rgba(96, 165, 250, 0.5);
    color: #60a5fa;
    border-radius: 999px;
    padding: 1px 10px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: grab;
    user-select: none;
}

.editor-chips .chip-campo::before {
    content: attr(data-label);
}
</style>