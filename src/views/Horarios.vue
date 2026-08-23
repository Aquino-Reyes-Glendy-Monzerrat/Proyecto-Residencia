<!-- 
     SIMULACIÓN de firma digital. Depende de "pdf-lib" (npm), única vista que
     la usa  -->
<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, onMounted } from 'vue'
import { getFirmantes, getDocentes } from '../services/api.js'
import { PDFDocument, rgb } from 'pdf-lib'

const firmantes = ref([])
const docentes = ref([])
const cargando = ref(true)

const archivo = ref(null)
const previewUrlBase = ref('') // sin #page=, para poder armar el salto a cualquier página
const paginaEnVisor = ref(1)

const totalPaginas = ref(0)
const calculandoPaginas = ref(false)

const numeroPagina = ref(1)
const docenteSeleccionadoId = ref('')
const asignaciones = ref([]) // [{ pagina, docenteId }]

const firmando = ref(false)
const documentoFirmado = ref(false)
const fechaFirmado = ref('')
const pdfFirmadoUrl = ref('')

onMounted(async () => {
    cargando.value = true
    firmantes.value = await getFirmantes()
    docentes.value = await getDocentes()
    cargando.value = false
})

function buscarPorClave(clave) {
    return firmantes.value.find(f => f.clave === clave) || null
}
const firma1 = computed(() => buscarPorClave('director'))
const firma2 = computed(() => buscarPorClave('subdirectora'))
const firma3 = computed(() => buscarPorClave('jefe_depto'))

function nombreDocente(id) {
    return docentes.value.find(d => String(d.id) === String(id))?.nombre || '—'
}

// Oculta docentes ya asignados a OTRA página (no a la actual).
const docentesDisponibles = computed(() => {
    const idsUsadosEnOtrasPaginas = new Set(
        asignaciones.value
            .filter(a => a.pagina !== numeroPagina.value)
            .map(a => String(a.docenteId))
    )
    return docentes.value
        .filter(d => !idsUsadosEnOtrasPaginas.has(String(d.id)))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
})

// Disponible mientras haya un PDF cargado, aunque ya esté completo.
const mostrarSelector = computed(() => totalPaginas.value > 0)

// Salto de página vía #page=N (visor nativo del navegador). El :key
// en <embed> fuerza a Vue a recrearlo, si no el salto no se aplica.
const previewUrl = computed(() => {
    // Firmado ya: muestra el PDF estampado en vez del original.
    const base = documentoFirmado.value && pdfFirmadoUrl.value ? pdfFirmadoUrl.value : previewUrlBase.value
    return base ? `${base}#page=${paginaEnVisor.value}` : ''
})

async function manejarArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    if (previewUrlBase.value) URL.revokeObjectURL(previewUrlBase.value)
    if (pdfFirmadoUrl.value) URL.revokeObjectURL(pdfFirmadoUrl.value)
    archivo.value = file
    previewUrlBase.value = URL.createObjectURL(file)
    pdfFirmadoUrl.value = ''
    paginaEnVisor.value = 1
    numeroPagina.value = 1
    docenteSeleccionadoId.value = ''
    asignaciones.value = []
    documentoFirmado.value = false
    totalPaginas.value = 0

    calculandoPaginas.value = true
    try {
        const bytes = await file.arrayBuffer()
        const pdf = await PDFDocument.load(bytes)
        totalPaginas.value = pdf.getPageCount()
    } catch {
        alert('No se pudo leer el número de páginas del PDF — revisa que el archivo no esté dañado')
    } finally {
        calculandoPaginas.value = false
    }
}

// Va a la página N y carga quién está asignado ahí (o vacío).
function irAPaginaYCargarDocente(n) {
    // "max" del input es solo visual, se recorta aquí también.
    n = Math.min(Math.max(1, n), totalPaginas.value)
    numeroPagina.value = n
    paginaEnVisor.value = n
    const existente = asignaciones.value.find(a => a.pagina === n)
    docenteSeleccionadoId.value = existente ? existente.docenteId : ''
}

// Primera página sin asignación, para saltar ahí tras guardar una.
function primeraPaginaSinAsignar() {
    for (let p = 1; p <= totalPaginas.value; p++) {
        if (!asignaciones.value.some(a => a.pagina === p)) return p
    }
    return null // ninguna sin asignar
}

// Al elegir docente: crea/corrige la asignación y salta a la
// siguiente página sin asignar (si queda alguna).
function seleccionarDocente() {
    if (!docenteSeleccionadoId.value) return
    const pagina = numeroPagina.value
    const existente = asignaciones.value.find(a => a.pagina === pagina)
    if (existente) {
        existente.docenteId = docenteSeleccionadoId.value
    } else {
        asignaciones.value.push({ pagina, docenteId: docenteSeleccionadoId.value })
        asignaciones.value.sort((a, b) => a.pagina - b.pagina)
    }
    const siguiente = primeraPaginaSinAsignar()
    if (siguiente !== null) irAPaginaYCargarDocente(siguiente)
}

// Salta a esa página con su docente precargado, para cambiarlo.
function editarAsignacion(a) {
    irAPaginaYCargarDocente(a.pagina)
}

function quitarAsignacion(pagina) {
    asignaciones.value = asignaciones.value.filter(a => a.pagina !== pagina)
    // Reabre el selector en la página que se acaba de liberar.
    irAPaginaYCargarDocente(pagina)
}

// Cosmético — NO es un hash real, solo relleno visual.
function codigoSimulado() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

// Coordenadas medidas contra el PDF en blanco real (841.89x595.28pt),
// como distancia desde el borde superior.
const PAGINA_REF_ANCHO = 841.89
const CODIGO_1_TOP = 519.5
const CODIGO_2_TOP = 528.0
const NOMBRE_TOP = 553.6
const PUESTO_TOP = 562.1
const COLUMNAS_X = [42, 234, 460, 680]
// Tapa el nombre de relleno de la columna 4 antes de escribir el real.
const RELLENO_COL4_TOP = 543
const RELLENO_COL4_BOTTOM = 565
// QR: hueco entre "OBSERVACIONES" y la fila de firmas.
const QR_X = 770
const QR_Y = 54
const QR_LADO = 24

async function construirPdfFirmado() {
    const bytesOriginales = await archivo.value.arrayBuffer()
    const pdf = await PDFDocument.load(bytesOriginales)
    const paginas = pdf.getPages()

    for (const a of asignaciones.value) {
        const pagina = paginas[a.pagina - 1]
        if (!pagina) continue
        const { width, height } = pagina.getSize()
        const escalaX = width / PAGINA_REF_ANCHO

        const docente = docentes.value.find(d => String(d.id) === String(a.docenteId))

        // Códigos simulados — el blanco no trae nada ahí.
        COLUMNAS_X.forEach(colX => {
            const x = colX * escalaX
            pagina.drawText(codigoSimulado(), { x, y: height - CODIGO_1_TOP, size: 5, color: rgb(0.15, 0.15, 0.15) })
            pagina.drawText(codigoSimulado(), { x, y: height - CODIGO_2_TOP, size: 5, color: rgb(0.15, 0.15, 0.15) })
        })

        // Firma 4: tapa el relleno y escribe el docente real.
        const col4X = COLUMNAS_X[3] * escalaX
        pagina.drawRectangle({
            x: col4X - 4,
            y: height - RELLENO_COL4_BOTTOM,
            width: (width - 10 * escalaX) - (col4X - 4),
            height: RELLENO_COL4_BOTTOM - RELLENO_COL4_TOP,
            color: rgb(1, 1, 1)
        })
        pagina.drawText(docente?.nombre?.toUpperCase() || '', {
            x: col4X, y: height - NOMBRE_TOP, size: 7, color: rgb(0, 0, 0)
        })
        pagina.drawText(docente?.cargo?.toUpperCase() || 'DOCENTE', {
            x: col4X, y: height - PUESTO_TOP, size: 6, color: rgb(0, 0, 0)
        })

        pagina.drawRectangle({
            x: QR_X * escalaX, y: QR_Y,
            width: QR_LADO, height: QR_LADO,
            borderColor: rgb(0.4, 0.4, 0.4), borderWidth: 1
        })
        pagina.drawText('QR', {
            x: QR_X * escalaX + 4, y: QR_Y + 8,
            size: 7, color: rgb(0.4, 0.4, 0.4)
        })
    }

    const bytesFirmados = await pdf.save()
    if (pdfFirmadoUrl.value) URL.revokeObjectURL(pdfFirmadoUrl.value)
    pdfFirmadoUrl.value = URL.createObjectURL(new Blob([bytesFirmados], { type: 'application/pdf' }))
}

async function generarDocumento() {
    if (!archivo.value) {
        alert('Sube el PDF del horario antes de continuar')
        return
    }
    if (asignaciones.value.length === 0) {
        alert('Asigna al menos un docente a una página')
        return
    }
    firmando.value = true
    fechaFirmado.value = new Date().toLocaleString('es-MX')
    await construirPdfFirmado()
    firmando.value = false
    documentoFirmado.value = true
}

function reiniciar() {
    if (previewUrlBase.value) URL.revokeObjectURL(previewUrlBase.value)
    if (pdfFirmadoUrl.value) URL.revokeObjectURL(pdfFirmadoUrl.value)
    archivo.value = null
    previewUrlBase.value = ''
    pdfFirmadoUrl.value = ''
    asignaciones.value = []
    totalPaginas.value = 0
    documentoFirmado.value = false
}
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">
            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>

            <template v-else>


                <div class="row g-3">
                    <div class="col-12 col-lg-4">
                        <div class="panel p-3">
                            <label class="form-label small fw-semibold">Archivo PDF del horario</label>
                            <input type="file" accept="application/pdf" class="form-control form-control-sm mb-3"
                                @change="manejarArchivo">

                            <template v-if="archivo">
                                <p v-if="calculandoPaginas" class="text-muted small mb-3">
                                    <span class="spinner-border spinner-border-sm me-1"></span>Leyendo el PDF…
                                </p>
                                <template v-else>
                                    <template v-if="mostrarSelector">
                                        <p v-if="totalPaginas > 1" class="small text-muted mb-2">
                                            pág. {{ numeroPagina }} de {{ totalPaginas }}
                                        </p>
                                        <div class="d-flex gap-1 mb-3">
                                            <input v-if="totalPaginas > 1" type="number" min="1" :max="totalPaginas"
                                                class="form-control form-control-sm" style="width:70px"
                                                v-model.number="numeroPagina" @change="irAPaginaYCargarDocente(numeroPagina)">
                                            <select class="form-select form-select-sm" v-model="docenteSeleccionadoId"
                                                @change="seleccionarDocente">
                                                <option value="">Selecciona un docente</option>
                                                <option v-for="d in docentesDisponibles" :key="d.id" :value="d.id">{{
                                                    d.nombre }}</option>
                                            </select>
                                        </div>
                                    </template>

                                    <div v-if="asignaciones.length" class="d-flex flex-column gap-1 mb-3">
                                        <div v-for="a in asignaciones" :key="a.pagina"
                                            class="d-flex justify-content-between align-items-center small border rounded px-2 py-1"
                                            :class="{ 'border-primary': paginaEnVisor === a.pagina }">
                                            <button class="btn btn-sm btn-link p-0 text-start"
                                                @click="editarAsignacion(a)">
                                                Pág. {{ a.pagina }} — {{ nombreDocente(a.docenteId) }}
                                            </button>
                                            <button class="btn btn-sm btn-link text-danger p-0"
                                                @click="quitarAsignacion(a.pagina)">
                                                <i class="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <p v-else-if="!mostrarSelector" class="text-muted small mb-3">Ninguna página
                                        asignada todavía.</p>
                                </template>
                            </template>

                            <button class="btn btn-primary w-100" :disabled="firmando || !archivo"
                                @click="generarDocumento">
                                <span v-if="firmando" class="spinner-border spinner-border-sm me-1"></span>
                                {{ firmando ? 'Firmando…' : 'Generar documento' }}
                            </button>
                            <button v-if="archivo" class="btn btn-outline-secondary w-100 mt-2" @click="reiniciar">
                                Subir otro archivo
                            </button>
                        </div>
                    </div>

                    <div class="col-12 col-lg-8">
                        <div v-if="!previewUrlBase" class="panel p-5 text-center text-muted">
                            <i class="bi bi-file-earmark-arrow-up" style="font-size:2rem;"></i>
                            <p class="mt-2 mb-0">Sube un PDF para verlo aquí.</p>
                        </div>
                        <div v-else class="panel p-2">
                            <div class="d-flex justify-content-end align-items-center mb-2">
                                <a v-if="documentoFirmado" :href="pdfFirmadoUrl" download="HORARIOS_FIRMADOS.pdf"
                                    class="btn btn-sm btn-success">
                                    <i class="bi bi-check-circle me-1"></i>Descargar
                                </a>
                            </div>
                            <embed :key="previewUrl" :src="previewUrl" type="application/pdf"
                                style="width:100%; height:75vh;">
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </AdminLayout>
</template>