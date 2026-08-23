<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, watch, onMounted } from 'vue'
import { getConfiguracion, actualizarConfiguracion } from '../services/api.js'
import headerImg from '@/assets/images/logo-encabezado.png'
import pieImg from '@/assets/images/pie.png'

const config = ref(null)
const cargando = ref(true)
const guardando = ref(false)


function aplicarVariablesDocumento(estilo) {
    const raiz = document.documentElement.style
    raiz.setProperty('--margen-superior', estilo.margen_superior + 'cm')
    raiz.setProperty('--margen-derecho', estilo.margen_derecho + 'cm')
    raiz.setProperty('--margen-inferior', estilo.margen_inferior + 'cm')
    raiz.setProperty('--margen-izquierdo', estilo.margen_izquierdo + 'cm')
    raiz.setProperty('--fuente', estilo.fuente)
    raiz.setProperty('--interlineado', estilo.interlineado)
    raiz.setProperty('--tamano-encabezado', estilo.tamano_encabezado + 'pt')
    raiz.setProperty('--tamano-asunto', estilo.tamano_asunto + 'pt')
    raiz.setProperty('--tamano-destinatario', estilo.tamano_destinatario + 'pt')
    raiz.setProperty('--tamano-cuerpo', estilo.tamano_cuerpo + 'pt')
    raiz.setProperty('--tamano-firma', estilo.tamano_firma + 'pt')
    raiz.setProperty('--tamano-ccp', estilo.tamano_ccp + 'pt')
    raiz.setProperty('--tamano-lema', estilo.tamano_lema + 'pt')
    raiz.setProperty('--tamano-lema-secundario', estilo.tamano_lema_secundario + 'pt')
}

onMounted(async () => {
    config.value = await getConfiguracion()
    cargando.value = false
    aplicarVariablesDocumento(config.value.estilo)
})

watch(() => config.value?.estilo, (nuevoEstilo) => {
    if (!nuevoEstilo) return
    aplicarVariablesDocumento(nuevoEstilo)
}, { deep: true })

function imprimir() {
    window.print()
}

async function guardar() {
    guardando.value = true
    try {
        await actualizarConfiguracion(config.value)
        alert('Configuración actualizada correctamente')
    } catch (e) {
        alert('Error al guardar los cambios')
    } finally {
        guardando.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div v-if="cargando" class="text-center py-5">
            <span class="spinner-border"></span>
        </div>

        <div v-else class="row g-4">
            <div class="col-12">
                <div class="row g-4 align-items-start">
                    <div class="col-12 col-lg-5">
                        <div class="panel p-4">
                            <h5 class="mb-3"><i class="bi bi-fonts me-2"></i>Tipografía y márgenes</h5>

                            <div class="mb-3">
                                <label class="form-label">Fuente</label>

                                <select class="form-select" v-model="config.estilo.fuente" disabled>
                                    <option value="'Noto Sans', Arial, sans-serif">Noto Sans
                                    </option>
                                </select>
                                <div class="form-text">Tipografía definida por el manual de identidad gráfica del
                                    TecNM</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Interlineado</label>
                                <select class="form-select" v-model.number="config.estilo.interlineado">
                                    <option :value="1">Sencillo (1.0)</option>
                                    <option :value="1.15">1.15</option>
                                    <option :value="1.5">1.5</option>
                                    <option :value="2">Doble (2.0)</option>
                                </select>
                            </div>

                            <hr>
                            <h6 class="text-muted mb-2">Tamaño de letra por sección</h6>

                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <label class="form-label small">Encabezado
                                        (Dependencia/Sección<br>/Folio/Fecha)</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_encabezado">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Asunto</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_asunto">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Destinatario</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_destinatario">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Cuerpo del oficio</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_cuerpo">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Firma / Atentamente</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_firma">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">C.c.p. / Iniciales</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_ccp">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Lema "Excelencia..."</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_lema">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Lema "Cultura, Ciencia..."</label>
                                    <input type="number" min="6" max="16" step="1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.tamano_lema_secundario">
                                </div>
                            </div>

                            <hr>
                            <h6 class="text-muted mb-2">Márgenes de impresión (cm)</h6>
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label small">Superior</label>
                                    <input type="number" step="0.1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.margen_superior">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Derecho</label>
                                    <input type="number" step="0.1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.margen_derecho">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Inferior</label>
                                    <input type="number" step="0.1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.margen_inferior">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small">Izquierdo</label>
                                    <input type="number" step="0.1" class="form-control form-control-sm"
                                        v-model.number="config.estilo.margen_izquierdo">
                                </div>
                            </div>

                            <div class="mt-4 no-print">
                                <button class="btn btn-primary me-2" @click="guardar" :disabled="guardando">
                                    <span v-if="guardando" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
                                </button>
                                <button class="btn btn-success" type="button" @click="imprimir">
                                    <i class="bi bi-printer me-1"></i> Ver cómo se imprime
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-7 col-preview-sticky">
                        <div class="panel p-4">
                            <h6 class="text-muted mb-3"><i class="bi bi-eye me-2"></i>Vista previa</h6>
                            <div class="preview-scale-outer">
                                <div class="bg-white border rounded documento-carta">

                                    <div class="w-100 mb-3 pb-2">
                                        <img :src="headerImg" alt="Encabezado Institucional SEP TecNM"
                                            class="header-doc-img">
                                    </div>

                                    <div class="text-end mb-3 texto-encabezado">
                                        <strong>DEPENDENCIA:</strong> Subdirección Académica.<br>
                                        <strong>SECCIÓN:</strong> Sistemas y Computación.<br>
                                        <strong>OFICIO No.</strong> P-XXX/2026<br><br>
                                        Chetumal, Q. Roo a <span class="fecha-resaltada">DD/MM/AAAA</span>
                                    </div>

                                    <div class="mb-3 text-end texto-asunto">
                                        <strong>ASUNTO: CARTA DE EJEMPLO.</strong>
                                    </div>

                                    <div class="mb-3 texto-destinatario">
                                        <strong>NOMBRE DEL DESTINATARIO</strong><br>
                                        <strong>PUESTO DEL DESTINATARIO</strong><br>
                                        <strong>PRESENTE</strong>
                                    </div>

                                    <div class="texto-cuerpo">
                                        <p>Por este medio le informo que, con la finalidad de fortalecer la
                                            formación, actualización y capacitación del capital humano de este
                                            instituto, ha sido comisionado(a) para trasladarse a la ciudad de
                                            Chetumal, Quintana Roo, para participar en el curso-taller titulado
                                            "Ejemplo de Texto Lorem Ipsum" del programa educativo en Ingeniería en
                                            Sistemas Computacionales. Dicho curso se llevará a cabo del día 08 al
                                            14 de agosto de 2026, en las instalaciones de este Instituto
                                            Tecnológico.</p>
                                        <p>Sin otro particular por el momento y agradeciendo de antemano la
                                            atención que brinde al presente, quedo de usted.</p>
                                    </div>

                                    <div class="mt-4 texto-firma">
                                        <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
                                        <div class="texto-lema">
                                            Excelencia en Educación Tecnológica®
                                        </div>
                                        <div class="texto-lema-secundario">
                                            Cultura, Ciencia y Tecnología para la Superación de México®
                                        </div>
                                        <br><br>
                                        <strong>NOMBRE DEL FIRMANTE</strong><br>
                                        <strong>PUESTO DEL FIRMANTE</strong>
                                    </div>

                                    <div class="mt-4 texto-ccp">
                                        C.c.p. Archivo<br>
                                        Minutario<br>
                                        MANM/MAZE/Lgop*
                                    </div>

                                    <div class="w-100 text-center pie-fijo">
                                        <img :src="pieImg" alt="Pie de página" class="pie-doc-img">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.form-label.small {
    display: flex;
    align-items: flex-end;
    min-height: 4rem;
}

@media (min-width: 992px) {
    .col-preview-sticky {
        position: sticky;
        top: 0.5rem;
        align-self: flex-start;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
    }
}
</style>