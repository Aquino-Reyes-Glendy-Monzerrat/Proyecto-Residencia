<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import {ref,computed,onMounted} from 'vue'
import {getFirmantes,getDocentes} from '../services/api.js'
import {PDFDocument,rgb} from 'pdf-lib'
import QRCode from 'qrcode'
import {obtenerAccessToken,subirPdfPorTipo} from '../services/googleDrive.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {generarHashFirma,generarIdentificadorFirma} from '../services/hash.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const firmantes = ref([])
const docentes = ref([])
const cargando = ref(true)
const archivo = ref(null)
const previewUrlBase = ref('')
const paginaEnVisor = ref(1)
const totalPaginas = ref(0)
const calculandoPaginas = ref(false)
const asignaciones = ref([])
const firmando = ref(false)
const documentoFirmado = ref(false)
const pdfFirmadoUrl = ref('')
const idDocumento = ref(null)
const enlaceGoogleDrive = ref('')

onMounted(async () => {
    cargando.value = true

    try {
        firmantes.value = await getFirmantes()
        docentes.value = await getDocentes()
    } catch (error) {
        alert('No se pudieron cargar los firmantes y docentes.')
    } finally {
        cargando.value = false
    }
})

// Firmantes fijos
function buscarPorClave(clave) {
    return firmantes.value.find(f => f.clave === clave) || null
}

const firma1 = computed(() => buscarPorClave('director'))
const firma2 = computed(() => buscarPorClave('subdirectora'))
const firma3 = computed(() => buscarPorClave('jefe_depto'))

const previewUrl = computed(() => {
    const base = documentoFirmado.value && pdfFirmadoUrl.value ? pdfFirmadoUrl.value : previewUrlBase.value
    return base ? `${base}#page=${paginaEnVisor.value}` : ''
})

function obtenerNombreOriginal() {
    if (!archivo.value) {
        return 'HORARIO'
    }

    const nombre = archivo.value.name
    return nombre.replace(/\.pdf$/i,'')
}

function obtenerFechaHoraNombre() {
    const ahora = new Date()
    const dia = String(ahora.getDate()).padStart(2,'0')
    const mes = String(ahora.getMonth() + 1).padStart(2,'0')
    const anio = ahora.getFullYear()
    const hora = String(ahora.getHours()).padStart(2,'0')
    const minutos = String(ahora.getMinutes()).padStart(2,'0')
    const segundos = String(ahora.getSeconds()).padStart(2,'0')

    return `${dia}-${mes}-${anio}_${hora}-${minutos}-${segundos}`
}

function obtenerNombrePdfFirmado() {
    return obtenerNombreOriginal() + '_' + obtenerFechaHoraNombre() + '.pdf'
}

function obtenerNombrePdfDocente(nombre) {
    const nombreOriginal = obtenerNombreOriginal()
    const nombreLimpio = String(nombre || 'DOCENTE').trim().replace(/\s+/g,'_').replace(/[\\/:*?"<>|]/g,'')
    const fechaHora = obtenerFechaHoraNombre()

    return nombreOriginal + '_' + nombreLimpio + '_' + fechaHora + '.pdf'
}

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,' ')
        .trim()
        .toUpperCase()
}

// Cargar PDF
async function manejarArchivo(e) {
    const file = e.target.files[0]

    if (!file) {
        return
    }

    if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF.')
        return
    }

    if (previewUrlBase.value) {
        URL.revokeObjectURL(previewUrlBase.value)
    }

    if (pdfFirmadoUrl.value) {
        URL.revokeObjectURL(pdfFirmadoUrl.value)
    }

    archivo.value = file
    previewUrlBase.value = URL.createObjectURL(file)
    pdfFirmadoUrl.value = ''
    paginaEnVisor.value = 1
    asignaciones.value = []
    calculandoPaginas.value = true

    try {
        const bytes = await file.arrayBuffer()
        const pdf = await PDFDocument.load(bytes)
        totalPaginas.value = pdf.getPageCount()

        const pdfjsDoc = await pdfjsLib.getDocument({data: bytes}).promise

        asignaciones.value = []

        // Leer cada página
        for (let i = 1; i <= pdfjsDoc.numPages; i++) {
            const page = await pdfjsDoc.getPage(i)
            const contenido = await page.getTextContent()
            const textoPagina = contenido.items.map(item => item.str).join(' ')

            // Buscar dónde comienza NOMBRE COMPLETO
            const indiceNombre = textoPagina.search(/NOMBRE\s+COMPLETO\s*:/i)
            let docenteEncontrado = null

            if (indiceNombre !== -1) {
                const textoDespuesNombre = textoPagina.substring(indiceNombre)

                // Buscar el nombre del docente
                docenteEncontrado = docentes.value.find(docente => {
                    const nombreDocente = docente.nombre?.trim().replace(/\s+/g,' ')

                    if (!nombreDocente) {
                        return false
                    }

                    const textoNormalizado = normalizarTexto(textoDespuesNombre)
                    const nombreNormalizado = normalizarTexto(nombreDocente)

                    return textoNormalizado.includes(nombreNormalizado)
                })
            }

            if (docenteEncontrado) {
                asignaciones.value.push({pagina: i,docenteId: docenteEncontrado.id})
            }
        }
    } catch (error) {
        alert('No se pudo leer el PDF.')
    } finally {
        calculandoPaginas.value = false
    }
}

function obtenerNombreCompletoUsuario(usuario) {
    if (!usuario) {
        return ''
    }

    return usuario.nombre?.trim() || ''
}

function generarIdDocumentoTemporal() {
    return Date.now()
}

function obtenerFirmantesPagina(pagina) {
    const asignacion = asignaciones.value.find(a => a.pagina === pagina)

    if (!asignacion) {
        return null
    }

    const docente = docentes.value.find(d => String(d.id) === String(asignacion.docenteId))

    if (!docente) {
        return null
    }

    const resultado = []

    if (firma1.value) {
        resultado.push({id: firma1.value.id,nombre: firma1.value.nombre,puesto: firma1.value.puesto})
    }

    if (firma2.value) {
        resultado.push({id: firma2.value.id,nombre: firma2.value.nombre,puesto: firma2.value.puesto})
    }

    if (firma3.value) {
        resultado.push({id: firma3.value.id,nombre: firma3.value.nombre,puesto: firma3.value.puesto})
    }

    resultado.push({id: docente.id,nombre: docente.nombre,puesto: docente.cargo || 'DOCENTE'})

    return resultado
}

// Generar las 4 firmas
async function generarFirmasPagina(pagina) {
    const usuarios = obtenerFirmantesPagina(pagina)

    if (!usuarios) {
        throw new Error(`No existen firmas para la página ${pagina}.`)
    }

    if (usuarios.length !== 4) {
        throw new Error(`La página ${pagina} no tiene exactamente 4 firmas.`)
    }

    const firmas = []
    const fechaHora = new Date().toISOString().replace('T',' ').replace('Z','')

    for (const usuario of usuarios) {
        const nombreCompleto = obtenerNombreCompletoUsuario(usuario)
        const hashBase = await generarHashFirma(nombreCompleto)
        const identificador = await generarIdentificadorFirma(hashBase,String(idDocumento.value),String(usuario.id),String(pagina),fechaHora)
        const hashFirmaDocumento = hashBase + identificador

        if (hashFirmaDocumento.length !== 72) {
            throw new Error(`El hash de ${nombreCompleto} no tiene 72 caracteres.`)
        }

        firmas.push({id: usuario.id,nombre: nombreCompleto,puesto: usuario.puesto,hash: hashFirmaDocumento,fecha: fechaHora})
    }

    return firmas
}

function concatenarFirmas(firmas) {
    const resultado = firmas.map(firma => firma.hash).join('')

    if (resultado.length !== 288) {
        throw new Error('La firma digital debe contener exactamente 288 caracteres.')
    }

    return resultado
}

// Generar QR
async function generarQR(enlace) {
    if (!enlace) {
        throw new Error('No existe un enlace para generar el QR.')
    }

    return await QRCode.toDataURL(enlace,{errorCorrectionLevel: 'M',margin: 1,width: 180})
}

const ESPACIO_EXTRA = 65
const QR_X = 740
const QR_SIZE = 85

function dibujarFirmaDigital(paginaPDF,firmaElectronica) {
    const linea1 = firmaElectronica.substring(0,96)
    const linea2 = firmaElectronica.substring(96,192)
    const linea3 = firmaElectronica.substring(192,288)

    const yFirma = ESPACIO_EXTRA - 65

    paginaPDF.drawText('Firma electrónica:', {
        x: 17,
        y: yFirma + 60,
        size: 11,
        color: rgb(0.1,0.1,0.1)
    })

    const xHash = 115
    const tamano = 10

    paginaPDF.drawText(linea1,{
        x: xHash,
        y: yFirma + 72,
        size: tamano,
        color: rgb(0.15,0.15,0.15)
    })

    paginaPDF.drawText(linea2,{
        x: xHash,
        y: yFirma + 62,
        size: tamano,
        color: rgb(0.15,0.15,0.15)
    })

    paginaPDF.drawText(linea3,{
        x: xHash,
        y: yFirma + 52,
        size: tamano,
        color: rgb(0.15,0.15,0.15)
    })
}

async function construirPdfFirmado(enlacesQRPorPagina = {}) {
    if (!archivo.value) {
        throw new Error('No existe archivo PDF.')
    }

    const bytesOriginales = await archivo.value.arrayBuffer()
    const pdfOriginal = await PDFDocument.load(bytesOriginales)
    const pdfNuevo = await PDFDocument.create()

    const firmasPorPagina = {}
    const concatenadasPorPagina = {}

    // Generar firmas
    for (let pagina = 1; pagina <= totalPaginas.value; pagina++) {
        firmasPorPagina[pagina] = await generarFirmasPagina(pagina)
        concatenadasPorPagina[pagina] = concatenarFirmas(firmasPorPagina[pagina])
    }

    // Crear cada página nueva
    for (let pagina = 1; pagina <= totalPaginas.value; pagina++) {
        const paginaOriginal = pdfOriginal.getPages()[pagina - 1]

        if (!paginaOriginal) {
            continue
        }

        const {width,height} = paginaOriginal.getSize()
        const nuevaAltura = height + ESPACIO_EXTRA
        const paginaNueva = pdfNuevo.addPage([width,nuevaAltura])

        const paginaCopiada = await pdfNuevo.embedPage(paginaOriginal)

        paginaNueva.drawPage(paginaCopiada,{
            x: 0,
            y: ESPACIO_EXTRA,
            width,
            height
        })

        const firmaElectronica = concatenadasPorPagina[pagina]

        dibujarFirmaDigital(paginaNueva,firmaElectronica)

        const enlaceQR = enlacesQRPorPagina[pagina]

        if (enlaceQR) {
            const qrData = await generarQR(enlaceQR)
            const qrImage = await pdfNuevo.embedPng(qrData)

            paginaNueva.drawImage(qrImage,{
                x: QR_X,
                y: 25,
                width: QR_SIZE,
                height: QR_SIZE
            })
        }
    }

    const bytesFirmados = await pdfNuevo.save()

    if (pdfFirmadoUrl.value) {
        URL.revokeObjectURL(pdfFirmadoUrl.value)
    }

    pdfFirmadoUrl.value = URL.createObjectURL(
        new Blob([bytesFirmados],{type: 'application/pdf'})
    )

    return {
        bytes: bytesFirmados,
        concatenadasPorPagina
    }
}

// Crear PDF individual para cada docente
async function crearPdfIndividual(numeroPagina) {
    const bytesOriginales = await archivo.value.arrayBuffer()
    const pdfOriginal = await PDFDocument.load(bytesOriginales)
    const pdfIndividual = await PDFDocument.create()
    const [pagina] = await pdfIndividual.copyPages(pdfOriginal,[numeroPagina - 1])

    pdfIndividual.addPage(pagina)

    return await pdfIndividual.save()
}

async function generarDocumento() {
    if (!archivo.value) {
        alert('Sube el PDF del horario antes de continuar.')
        return
    }

    if (asignaciones.value.length !== totalPaginas.value) {
        alert('No se pudo identificar automáticamente al docente de todas las páginas.')
        return
    }

    firmando.value = true

    try {
        idDocumento.value = generarIdDocumentoTemporal()

        // Obtener token automáticamente
        await obtenerAccessToken()

        const enlacesQRPorPagina = {}

        // PDF para cada docente
        for (let pagina = 1; pagina <= totalPaginas.value; pagina++) {
            const asignacion = asignaciones.value.find(a => a.pagina === pagina)

            if (!asignacion) {
                throw new Error(`No hay docente asignado en la página ${pagina}.`)
            }

            const docente = docentes.value.find(d => String(d.id) === String(asignacion.docenteId))

            if (!docente) {
                throw new Error(`No se encontró el docente de la página ${pagina}.`)
            }

            const bytesDocente = await crearPdfIndividual(pagina)
            const nombreDocente = obtenerNombrePdfDocente(docente.nombre)
            const resultadoDocente = await subirPdfPorTipo(bytesDocente,nombreDocente,'docente')

            if (!resultadoDocente || !resultadoDocente.enlace) {
                throw new Error(`No se obtuvo el enlace del PDF de ${docente.nombre}.`)
            }

            enlacesQRPorPagina[pagina] = resultadoDocente.enlace
        }

        const resultado = await construirPdfFirmado(enlacesQRPorPagina)

        for (const pagina in resultado.concatenadasPorPagina) {
            const firma = resultado.concatenadasPorPagina[pagina]

            if (firma.length !== 288) {
                throw new Error(`La firma digital de la página ${pagina} no tiene 288 caracteres.`)
            }
        }

        const nombrePdfFirmado = obtenerNombrePdfFirmado()
        const resultadoDrive = await subirPdfPorTipo(resultado.bytes,nombrePdfFirmado,'horario')

        if (!resultadoDrive || !resultadoDrive.enlace) {
            throw new Error('Google Drive no devolvió el enlace del PDF firmado.')
        }

        enlaceGoogleDrive.value = resultadoDrive.enlace
        documentoFirmado.value = true

        alert('PDF firmado y guardado correctamente en Google Drive.')
    } catch (error) {
        alert(error.message || 'Ocurrió un error al generar el documento.')
    } finally {
        firmando.value = false
    }
}

function reiniciar() {
    if (previewUrlBase.value) {
        URL.revokeObjectURL(previewUrlBase.value)
    }

    if (pdfFirmadoUrl.value) {
        URL.revokeObjectURL(pdfFirmadoUrl.value)
    }

    archivo.value = null
    previewUrlBase.value = ''
    pdfFirmadoUrl.value = ''
    asignaciones.value = []
    totalPaginas.value = 0
    documentoFirmado.value = false
    idDocumento.value = null
    enlaceGoogleDrive.value = ''
    paginaEnVisor.value = 1
    calculandoPaginas.value = false
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
                            <label class="form-label fw-semibold">
                                Adjuntar archivo PDF del horario
                            </label>

                            <input
                                type="file"
                                accept="application/pdf"
                                class="form-control form-control-sm mb-3"
                                @change="manejarArchivo"
                            >

                            <div v-if="firma1" class="small mb-2">
                                <strong>Firma 1:</strong>
                                {{ firma1.nombre }}
                            </div>

                            <div v-if="firma2" class="small mb-2">
                                <strong>Firma 2:</strong>
                                {{ firma2.nombre }}
                            </div>

                            <div v-if="firma3" class="small mb-3">
                                <strong>Firma 3:</strong>
                                {{ firma3.nombre }}
                            </div>

                            <template v-if="archivo">
                                <p v-if="calculandoPaginas" class="text-muted small mb-3">
                                    <span class="spinner-border spinner-border-sm me-1"></span>
                                    Leyendo el PDF…
                                </p>

                                <p v-else-if="totalPaginas > 0" class="small text-muted mb-3">
                                    <i class="bi bi-check-circle me-1"></i>
                                    Se identificaron {{ asignaciones.length }} firmantes de {{ totalPaginas }} páginas.
                                </p>

                                <button
                                    type="button"
                                    class="btn btn-primary w-100"
                                    :disabled="firmando || !archivo || calculandoPaginas || totalPaginas === 0 || asignaciones.length !== totalPaginas"
                                    @click="generarDocumento"
                                >
                                    <span v-if="firmando" class="spinner-border spinner-border-sm me-1"></span>

                                    <i v-else class="bi bi-pen-fill me-1"></i>

                                    {{ firmando ? 'Firmando PDF' : 'Firmar documento' }}
                                </button>
                            </template>

                            <a
                                v-if="documentoFirmado"
                                :href="pdfFirmadoUrl"
                                :download="obtenerNombrePdfFirmado()"
                                class="btn btn-success w-100 mt-2"
                            >
                                <i class="bi bi-download me-1"></i>
                                Descargar PDF firmado
                            </a>

                            <a
                                v-if="enlaceGoogleDrive"
                                :href="enlaceGoogleDrive"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn btn-outline-success w-100 mt-2"
                            >
                                <i class="bi bi-cloud-arrow-up me-1"></i>
                                Ver PDF en Google Drive
                            </a>

                            <button
                                v-if="archivo"
                                class="btn btn-outline-secondary w-100 mt-2"
                                @click="reiniciar"
                            >
                                Subir otro archivo
                            </button>
                        </div>
                    </div>

                    <div class="col-12 col-lg-8">
                        <div v-if="!previewUrlBase" class="panel p-5 text-center text-muted">
                            <i class="bi bi-file-earmark-arrow-up" style="font-size:2rem;"></i>

                            <p class="mt-2 mb-0">
                                Sube un PDF para verlo aquí.
                            </p>
                        </div>

                        <div v-else class="panel p-2">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span v-if="documentoFirmado" class="small text-success">
                                    <i class="bi bi-check-circle me-1"></i>
                                    Documento firmado
                                </span>

                                <span v-if="documentoFirmado" class="small text-muted">
                                    ID:
                                    {{ idDocumento }}
                                </span>
                            </div>

                            <embed
                                :key="previewUrl"
                                :src="previewUrl"
                                type="application/pdf"
                                style="width:100%;height:85vh;"
                            >
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </AdminLayout>
</template>