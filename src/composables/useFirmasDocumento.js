
// Maneja firmas electrónicas, generación de PDF, QR y Google Drive.

import { ref, nextTick } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

import {actualizarPdfGoogleDrive, subirPdfPorTipo} from '../services/googleDrive.js'
import {generarHashFirma,generarIdentificadorFirma} from '../services/hash.js'
import {
    actualizarDocumento,
    getBitacoraPorDocumentoId,
    actualizarBitacora,
    getConfiguracion,
    getFirmantes
} from '../services/api.js'

export function useFirmasDocumento({tipo,subtipo,campos,listaFirmantes,listaDocentes,mostrarDocumentoFirmado = null}) {
    const firmaElectronica = ref('')
    const qrFirma = ref('')
    const enlaceDriveFirma = ref('')
    const archivoDriveFirma = ref(null)
    const documentoIdActual = ref(null)
    const sugerenciasFirmantes = ref([])
    const campoFirmanteActivo = ref('')
    const firmasLiberacion = ref([])


// Asegurar que la lista de firmantes esté cargada

async function asegurarFirmantesCargados() {
    if (!listaFirmantes.value?.length) {
        const firmantes = await getFirmantes()

        listaFirmantes.value = Array.isArray(firmantes)
            ? firmantes
            : []
    }

    if (!listaFirmantes.value.length) {
        throw new Error('No se pudieron cargar los firmantes.')
    }
}

// Buscar firmante por clave

function buscarPorClave(clave) {
    return listaFirmantes.value.find(
        persona =>
            String(persona.clave || '').trim().toLowerCase() ===
            String(clave || '').trim().toLowerCase()
    ) || null
}


    // Generar firma electrónica

    async function generarFirmaElectronica(persona, documentoId, numeroPagina = 1) {
        if (!persona) {
            throw new Error('No se encontró el firmante.')
        }

        if (!persona.id) {
            throw new Error(`El firmante ${persona.nombre || ''} no tiene ID configurado.`)
        }

        if (!persona.nombre) {
            throw new Error('El firmante no tiene nombre configurado.')
        }

        const hashBase = persona.hashFirma || await generarHashFirma(persona.nombre)

        if (hashBase.length !== 64) {
            throw new Error(`El hash de ${persona.nombre} tiene ${hashBase.length} caracteres. Debe tener 64.`)
        }

        const fechaHora = new Date().toISOString()
        const identificador = await generarIdentificadorFirma(hashBase,documentoId,persona.id,numeroPagina,fechaHora)
        const firma = hashBase + identificador

        if (firma.length !== 72) {
            throw new Error(`La firma de ${persona.nombre} tiene ${firma.length} caracteres. Debe tener 72.`)
        }

        return firma
    }

    // Generar PDF desde la vista previa

    async function generarPDFFromVistaPrevia(htmlPersonalizado = null) {
        await nextTick()

        const config = await getConfiguracion()

        document.documentElement.style.setProperty('--margen-superior', config.estilo.margen_superior + 'cm')
        document.documentElement.style.setProperty('--margen-derecho', config.estilo.margen_derecho + 'cm')
        document.documentElement.style.setProperty('--margen-inferior', config.estilo.margen_inferior + 'cm')
        document.documentElement.style.setProperty('--margen-izquierdo', config.estilo.margen_izquierdo + 'cm')

        if (document.fonts?.ready) {
            await document.fonts.ready
        }

        let elemento
        let elementoTemporal = false
        let estiloPdf = null

        if (htmlPersonalizado) {
            elemento = document.createElement('div')
            elemento.className = 'documento-carta pdf-print-mode'
            elemento.style.position = 'absolute'
            elemento.style.left = '-10000px'
            elemento.style.top = '0'
            elemento.style.width = '816px'
            elemento.style.height = '1056px'
            elemento.style.minHeight = '1056px'
            elemento.style.margin = '0'
            elemento.style.background = '#ffffff'
            elemento.style.color = '#333'
            elemento.style.boxSizing = 'border-box'
            elemento.innerHTML = htmlPersonalizado

            estiloPdf = document.createElement('style')
            estiloPdf.textContent = `
                .pdf-print-mode {
                    width: 816px !important;
                    height: 1056px !important;
                    min-height: 1056px !important;
                    position: relative !important;
                    display: block !important;
                    flex-direction: initial !important;
                    margin: 0 !important;
                    transform: none !important;
                    box-sizing: border-box !important;
                    background: #ffffff !important;
                    color: #333 !important;
                    padding-top: var(--margen-superior, 0.5cm) !important;
                    padding-right: var(--margen-derecho, 1.5cm) !important;
                    padding-bottom: var(--margen-inferior, 1.5cm) !important;
                    padding-left: var(--margen-izquierdo, 2.5cm) !important;
                    text-align: initial !important;
                }

                .pdf-print-mode p,
                .pdf-print-mode div[v-html] {
                    text-align: justify !important;
                }

                .pdf-print-mode .pie-fijo {
                    position: absolute !important;
                    bottom: var(--margen-inferior, 1.5cm) !important;
                    left: var(--margen-izquierdo, 2.5cm) !important;
                    right: var(--margen-derecho, 1.5cm) !important;
                    width: auto !important;
                    margin-top: 0 !important;
                    text-align: center !important;
                }
            `

            document.head.appendChild(estiloPdf)
            document.body.appendChild(elemento)
            elementoTemporal = true
        } else {
            elemento = document.querySelector('.documento-carta')
        }

        if (!elemento) {
            throw new Error('No se encontró la vista previa del documento.')
        }

        try {
            const imagenes = Array.from(elemento.querySelectorAll('img'))

            await Promise.all(
                imagenes.map(img => {
                    if (img.complete && img.naturalWidth > 0) {
                        return Promise.resolve()
                    }

                    return new Promise(resolve => {
                        img.addEventListener('load', resolve, { once: true })
                        img.addEventListener('error', resolve, { once: true })
                    })
                })
            )

            await nextTick()

            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve)
                })
            })

            const canvas = await html2canvas(elemento, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0
            })

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter',
                compress: true
            })

            const imagen = canvas.toDataURL('image/png')

            pdf.addImage(imagen, 'PNG', 0, 0, 215.9, 279.4)

            return pdf.output('arraybuffer')
        } finally {
            if (estiloPdf?.parentNode) {
                estiloPdf.parentNode.removeChild(estiloPdf)
            }

            if (elementoTemporal && elemento?.parentNode) {
                elemento.parentNode.removeChild(elemento)
            }
        }
    }

    // Firma del jefe de departamento

    async function prepararFirmaJefeDepartamento(documentoId) {
    await asegurarFirmantesCargados()

    const jefeDepto = buscarPorClave('jefe_depto')

        if (!jefeDepto) {
            throw new Error('No se encontró al firmante con clave "jefe_depto".')
        }

        const firma = await generarFirmaElectronica(jefeDepto, documentoId, 1)

        firmaElectronica.value = firma
        documentoIdActual.value = documentoId

        return firma
    }

    // Firma de comisión interna

    async function prepararFirmaComisionInterna(documentoId) {
    await asegurarFirmantesCargados()

    documentoIdActual.value = documentoId
    firmaElectronica.value = ''

    const clavesFirmantes = ['jefe_depto', 'subdirectora', 'director']

        if (campos.value.para_jefe_depto === true) {
            const jefeDepto = buscarPorClave('jefe_depto')

            if (!jefeDepto) {
                throw new Error('No se encontró al firmante con clave "jefe_depto".')
            }

            const subdirectora = buscarPorClave('subdirectora')

            if (!subdirectora) {
                throw new Error('No se encontró al firmante con clave "subdirectora".')
            }

            const firmaJefe = await generarFirmaElectronica(jefeDepto, documentoId, 1)
            const firmaSubdirectora = await generarFirmaElectronica(subdirectora, documentoId, 1)

            if (firmaJefe.length !== 72) {
                throw new Error(`La firma del Jefe de Departamento tiene ${firmaJefe.length} caracteres. Debe tener 72.`)
            }

            if (firmaSubdirectora.length !== 72) {
                throw new Error(`La firma de la Subdirectora tiene ${firmaSubdirectora.length} caracteres. Debe tener 72.`)
            }

            const firmaConcatenada = firmaJefe + firmaSubdirectora

            if (firmaConcatenada.length !== 144) {
                throw new Error(`La firma concatenada tiene ${firmaConcatenada.length} caracteres. Debe tener 144.`)
            }

            firmaElectronica.value = firmaConcatenada

            return {
                firmaJefe,
                firmaSubdirectora,
                firmaConcatenada
            }
        }

        return prepararFirmaJefeDepartamento(documentoId)
    }

    // Generar las tres firmas de autorización del director

    async function prepararFirmasAutorizacionDirector(documentoId) {
    await asegurarFirmantesCargados()

    documentoIdActual.value = documentoId
    firmaElectronica.value = ''
    firmasLiberacion.value = []

    const clavesFirmantes = ['jefe_depto', 'subdirectora', 'director']

        for (const clave of clavesFirmantes) {
            const firmante = buscarPorClave(clave)

            if (!firmante) {
                throw new Error(`No se encontró al firmante con clave "${clave}".`)
            }

            const firma = await generarFirmaElectronica(firmante, documentoId, 1)

            firmasLiberacion.value.push({
                tipo: clave,
                nombre: firmante.nombre,
                grado: firmante.abreviatura || '',
                id: firmante.id,
                firma
            })
        }

        const firmaConcatenada = firmasLiberacion.value
            .map(persona => persona.firma)
            .join('')

        if (firmaConcatenada.length !== 216) {
            throw new Error(`La firma concatenada tiene ${firmaConcatenada.length} caracteres. Se esperaban 216.`)
        }

        firmaElectronica.value = firmaConcatenada

        return {
            firmas: firmasLiberacion.value,
            firmaConcatenada
        }
    }

    // Generar firma para un firmante

    async function generarFirmaParaFirmante(documentoId, claveFirmante) {
        const firmante = buscarPorClave(claveFirmante)

        if (!firmante) {
            throw new Error(`No se encontró al firmante con clave "${claveFirmante}".`)
        }

        const firma = await generarFirmaElectronica(firmante, documentoId, 1)

        return {
            firma,
            firmante
        }
    }

    // Firmar documento ya guardado

    async function firmarDocumentoGuardado(documento, claveFirmante, tipoDrive, prefijo) {
        if (!documento?.id) {
            throw new Error('El documento no tiene ID.')
        }

        if (!documento?.cuerpo) {
            throw new Error('El documento no contiene el cuerpo HTML que se debe firmar.')
        }

        const { firma, firmante } = await generarFirmaParaFirmante(documento.id, claveFirmante)

        const contenedor = document.createElement('div')
        contenedor.className = 'documento-carta'
        contenedor.style.position = 'absolute'
        contenedor.style.left = '-10000px'
        contenedor.style.top = '0'
        contenedor.style.width = '816px'
        contenedor.style.background = 'white'
        contenedor.style.padding = '0'
        contenedor.style.zIndex = '-1'
        contenedor.innerHTML = documento.cuerpo

        document.body.appendChild(contenedor)

        const firmaAnterior = contenedor.querySelector('.firma-electronica-pdf')

        if (firmaAnterior) {
            firmaAnterior.remove()
        }

        try {
            const bloqueFirma = document.createElement('div')
            bloqueFirma.className = 'firma-electronica-pdf'
            bloqueFirma.innerHTML = `
                <div class="firma-electronica-hash">
                    <strong>Firma electrónica:</strong><br>
                    ${firma}
                </div>
                <div class="firma-electronica-qr">
                    <img class="qr-firma-documento" alt="Código QR de validación">
                </div>
            `

            const ccp = contenedor.querySelector('.texto-ccp-wrapper')
            const firmaTexto = contenedor.querySelector('.texto-firma')
            const pie = contenedor.querySelector('.pie-fijo')

            if (ccp) {
                ccp.parentNode.insertBefore(bloqueFirma, ccp.nextSibling)
            } else if (firmaTexto) {
                if (pie) {
                    pie.parentNode.insertBefore(bloqueFirma, pie)
                } else {
                    firmaTexto.parentNode.insertBefore(bloqueFirma, firmaTexto.nextSibling)
                }
            } else {
                contenedor.appendChild(bloqueFirma)
            }

            await new Promise(resolve => setTimeout(resolve, 100))

            const canvasProvisional = await html2canvas(contenedor, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false
            })

            const pdfProvisional = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            })

            const anchoPagina = pdfProvisional.internal.pageSize.getWidth()
            const altoPagina = pdfProvisional.internal.pageSize.getHeight()
            const altoImagen = canvasProvisional.height * anchoPagina / canvasProvisional.width

            pdfProvisional.addImage(
                canvasProvisional.toDataURL('image/png'),
                'PNG',
                0,
                0,
                anchoPagina,
                Math.min(altoImagen, altoPagina)
            )

            const arrayBufferProvisional = pdfProvisional.output('arraybuffer')
            const nombreArchivo = `${prefijo}_${documento.folio || documento.id}.pdf`

            const archivoDrive = await subirPdfPorTipo(
                new Uint8Array(arrayBufferProvisional),
                nombreArchivo,
                tipoDrive
            )

            if (!archivoDrive?.id) {
                throw new Error('Google Drive no devolvió el ID del archivo.')
            }

            if (!archivoDrive?.enlace) {
                throw new Error('Google Drive no devolvió el enlace del archivo.')
            }

            archivoDriveFirma.value = archivoDrive
            enlaceDriveFirma.value = archivoDrive.enlace

            const qrDataUrl = await QRCode.toDataURL(archivoDrive.enlace, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 180
            })

            qrFirma.value = qrDataUrl

            const qrImg = contenedor.querySelector('.qr-firma-documento')

            if (!qrImg) {
                throw new Error('No se encontró el elemento del QR.')
            }

            qrImg.src = qrDataUrl

            await new Promise(resolve => {
                if (qrImg.complete) {
                    resolve()
                    return
                }

                qrImg.onload = resolve
                qrImg.onerror = resolve
            })

            const canvasFinal = await html2canvas(contenedor, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false
            })

            const pdfFinal = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            })

            const anchoFinal = pdfFinal.internal.pageSize.getWidth()
            const altoFinalPagina = pdfFinal.internal.pageSize.getHeight()
            const altoFinal = canvasFinal.height * anchoFinal / canvasFinal.width

            pdfFinal.addImage(
                canvasFinal.toDataURL('image/png'),
                'PNG',
                0,
                0,
                anchoFinal,
                Math.min(altoFinal, altoFinalPagina)
            )

            const arrayBufferFinal = pdfFinal.output('arraybuffer')

            await actualizarPdfGoogleDrive(
                archivoDrive.id,
                new Uint8Array(arrayBufferFinal)
            )

            const cuerpoFirmado = contenedor.innerHTML

            await actualizarDocumento(documento.id, {
                estado: 'autorizado',
                firmaElectronica: firma,
                rutaDocumentoFirmado: archivoDrive.enlace,
                driveFileId: archivoDrive.id,
                autorizadoPor: firmante.nombre,
                fechaAutorizacion: new Date().toISOString(),
                rechazadoPor: '',
                observaciones: '',
                cuerpo: cuerpoFirmado
            })

            return {
                firma,
                firmante,
                archivoDrive,
                cuerpo: cuerpoFirmado
            }
        } finally {
            if (contenedor.parentNode) {
                contenedor.parentNode.removeChild(contenedor)
            }
        }
    }

    // Firmas especiales

    async function prepararFirmaServicioSocial(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaResidencia(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaTerminacionServicio(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaTerminacionResidencia(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaOficioTesis(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaMemorandumHorario(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaMantenimientoInterno(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaMantenimientoExterno(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    async function prepararFirmaOtros(documentoId) {
        return prepararFirmaJefeDepartamento(documentoId)
    }

    // Liberación de proyecto

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
}


// Buscar asesor/revisores
function buscarFirmantesLiberacion(query, campo) {
    campoFirmanteActivo.value = campo

    if (!query || query.trim().length < 2) {
        sugerenciasFirmantes.value = []
        return
    }

    const texto = normalizarTexto(query)

    const docentes = Array.isArray(listaDocentes.value)
        ? listaDocentes.value
        : []

    sugerenciasFirmantes.value = docentes
        .filter(docente => {
            if (!docente?.nombre) {
                return false
            }

            const nombre = normalizarTexto(docente.nombre)

            const nombreConGrado = normalizarTexto(
                `${docente.abreviatura || ''} ${docente.nombre || ''}`
            )

            return (
                nombre.includes(texto) ||
                nombreConGrado.includes(texto)
            )
        })
        .slice(0, 10)
}


// Seleccionar asesor/revisor
function seleccionarFirmanteLiberacion(persona, campo) {
    if (!persona?.nombre) {
        return
    }

    const nombre = persona.nombre.trim()
    const grado = (persona.abreviatura || '').trim()

    // Guardamos el nombre completo mostrado
    const nombreMostrado = `${grado} ${nombre}`.trim()

    campos.value[campo] = nombreMostrado

    // Guardamos también el grado por separado
    if (campo === 'nombre_asesor') {
        campos.value.grado_asesor = grado
    }

    if (campo === 'nombre_revisor') {
        campos.value.grado_revisor = grado
    }

    if (campo === 'nombre_revisor2') {
        campos.value.grado_revisor2 = grado
    }

    // Cerrar sugerencias
    sugerenciasFirmantes.value = []
    campoFirmanteActivo.value = ''
}


// Preparar firmas de Liberación de Proyecto
async function prepararFirmasLiberacionProyecto(documentoId) {
    await asegurarFirmantesCargados()

    firmasLiberacion.value = []
    documentoIdActual.value = documentoId
    firmaElectronica.value = ''

    campos.value.hash_asesor = ''
    campos.value.hash_revisor = ''
    campos.value.hash_revisor2 = ''

    //Jefe de departamento

    const jefeDepto = buscarPorClave('jefe_depto')

    if (!jefeDepto) {
        throw new Error(
            'No se encontró al Jefe de Departamento.'
        )
    }

    const firmaJefe = await generarFirmaElectronica(jefeDepto,documentoId,1)

    firmasLiberacion.value.push({
        tipo: 'jefe_depto',
        nombre: jefeDepto.nombre,
        grado: jefeDepto.abreviatura || '',
        id: jefeDepto.id,
        firma: firmaJefe
    })

    //Asesor y revisores

    const camposFirmantes = [
        {
            campo: 'nombre_asesor',
            tipo: 'asesor',
            campoHash: 'hash_asesor',
            campoGrado: 'grado_asesor'
        },
        {
            campo: 'nombre_revisor',
            tipo: 'revisor1',
            campoHash: 'hash_revisor',
            campoGrado: 'grado_revisor'
        },
        {
            campo: 'nombre_revisor2',
            tipo: 'revisor2',
            campoHash: 'hash_revisor2',
            campoGrado: 'grado_revisor2'
        }
    ]

    const docentes = Array.isArray(listaDocentes.value)
        ? listaDocentes.value
        : []

    for (const item of camposFirmantes) {
        const nombreSeleccionado = campos.value[item.campo]

        // Campo opcional
        if (!nombreSeleccionado?.trim()) {
            continue
        }

        const nombreNormalizado =
            normalizarTexto(nombreSeleccionado)

        const persona = docentes.find(docente => {
            if (!docente?.nombre) {
                return false
            }

            const nombreDocente =
                normalizarTexto(docente.nombre)

            const nombreConGrado =
                normalizarTexto(
                    `${docente.abreviatura || ''} ${docente.nombre || ''}`
                )

            return (
                nombreDocente === nombreNormalizado ||
                nombreConGrado === nombreNormalizado
            )
        })

        if (!persona) {
            throw new Error(`No se encontró al firmante seleccionado: ${nombreSeleccionado}`)
        }

        const firma = await generarFirmaElectronica(persona,documentoId,1)
        const grado = persona.abreviatura || ''

        firmasLiberacion.value.push({
            tipo: item.tipo,
            nombre: persona.nombre,
            grado,
            id: persona.id,
            firma
        })

        // Guardar firma electrónica completa de 72 caracteres
        campos.value[item.campoHash] = firma

        // Guardar grado
        campos.value[item.campoGrado] = grado
    }

   //concatenar las firmas

    const firmaConcatenada = firmasLiberacion.value .map(persona => persona.firma).join('')
    const cantidadFirmas = firmasLiberacion.value.length
    const longitudEsperada = cantidadFirmas * 72

    if (firmaConcatenada.length !== longitudEsperada) {
        throw new Error(`La firma concatenada tiene ${firmaConcatenada.length} caracteres. ` + `Se esperaban ${longitudEsperada}.`)
    }

    firmaElectronica.value = firmaConcatenada
    documentoIdActual.value = documentoId

    return firmasLiberacion.value
}
    // Configuración de documentos especiales

    const CONFIG_DOCUMENTOS_ESPECIALES = {
        'comision-interna': {
            prepararFirma: prepararFirmaComisionInterna,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'comision-interna'),
            prefijo: 'Comision_Interna'
        },

        'comision-externa': {
            prepararFirma: prepararFirmasAutorizacionDirector,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'comision-externa'),
            prefijo: 'Comision_Externa'
        },

        'aceptacion-servicio-social': {
            prepararFirma: prepararFirmaServicioSocial,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'aceptacion-servicio-social'),
            prefijo: 'Aceptacion_Servicio_Social'
        },

        'aceptacion-residencia': {
            prepararFirma: prepararFirmaResidencia,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'aceptacion-residencia'),
            prefijo: 'Aceptacion_Residencia'
        },

        'terminacion-servicio-social': {
            prepararFirma: prepararFirmaTerminacionServicio,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'terminacion-servicio'),
            prefijo: 'Terminacion_Servicio'
        },

        'terminacion-residencia': {
            prepararFirma: prepararFirmaTerminacionResidencia,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'terminacion-residencia'),
            prefijo: 'Terminacion_Residencia'
        },

        'oficio_tesis': {
            prepararFirma: prepararFirmaOficioTesis,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'oficio_tesis'),
            prefijo: 'Oficio_Tesis'
        },

        'memorandum-compactacion-horario': {
            prepararFirma: prepararFirmaMemorandumHorario,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'memorandum-compactacion-horario'),
            prefijo: 'Memorandum_Horario'
        },

        'memorandum-solventacion-faltas': {
            prepararFirma: prepararFirmaJefeDepartamento,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'memorandum-solventacion-faltas'),
            prefijo: 'Memorandum_Solventacion_Faltas'
        },

        'mantenimiento_interno': {
            prepararFirma: prepararFirmaMantenimientoInterno,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'mantenimiento_interno'),
            prefijo: 'Mantenimiento_Interno'
        },

        'mantenimiento_externo': {
            prepararFirma: prepararFirmaMantenimientoExterno,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'mantenimiento_externo'),
            prefijo: 'Mantenimiento_Externo'
        },

        'otros': {
            prepararFirma: prepararFirmaOtros,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'otros'),
            prefijo: 'Otros'
        },

        'liberacion-proyecto': {
            prepararFirma: prepararFirmasLiberacionProyecto,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'liberacion-proyecto'),
            prefijo: 'Liberacion_Proyecto'
        },
        'tutorias': {
            prepararFirma: prepararFirmaJefeDepartamento,
            subirPdf: (bytesPDF, nombreArchivo) =>
                subirPdfPorTipo(bytesPDF, nombreArchivo, 'tutorias'),
            prefijo: 'Tutorias'
        }
    }

    // Obtener clave del documento especial

    function obtenerClaveDocumentoEspecial() {
        if (tipo === 'liberacion-proyecto') {
            return 'liberacion-proyecto'
        }

        if (tipo === 'revision-tesis') {
            return 'oficio_tesis'
        }

        if (tipo === 'otros') {
            return 'otros'
        }

        if (tipo === 'mantenimiento') {
            if (campos.value.tipo_servicio === 'interno') {
                return 'mantenimiento_interno'
            }

            if (campos.value.tipo_servicio === 'externo') {
                return 'mantenimiento_externo'
            }

            return null
        }
            if (tipo === 'tutorias') {
                return 'tutorias'
}

        if (subtipo.value) {
            return subtipo.value
        }

        return null
    }

    // Insertar firma y QR en HTML

    function insertarFirmaEnHtml(html, firma, qrDataUrl = '') {
        const contenedor = document.createElement('div')

        contenedor.className = 'documento-carta'
        contenedor.style.position = 'absolute'
        contenedor.style.left = '-10000px'
        contenedor.style.top = '0'
        contenedor.style.width = '816px'
        contenedor.style.background = '#ffffff'
        contenedor.style.padding = '0'
        contenedor.style.zIndex = '-1'
        contenedor.innerHTML = html || ''

        const firmaAnterior = contenedor.querySelector('.firma-electronica-pdf')

        if (firmaAnterior) {
            firmaAnterior.remove()
        }

        const bloqueFirma = document.createElement('div')
        bloqueFirma.className = 'firma-electronica-pdf'
        bloqueFirma.innerHTML = `
            <div class="firma-electronica-hash">
                <strong>Firma electrónica:</strong><br>
                ${firma}
            </div>

            <div class="firma-electronica-qr">
                ${
                    qrDataUrl
                        ? `
                            <img
                                class="qr-firma-documento"
                                src="${qrDataUrl}"
                                alt="Código QR de validación"
                            >
                        `
                        : `
                            <div
                                class="qr-firma-documento"
                                style="width:180px; height:180px;"
                            ></div>
                        `
                }
            </div>
        `

        const ccp = contenedor.querySelector('.texto-ccp-wrapper')
        const firmaTexto = contenedor.querySelector('.texto-firma')
        const pie = contenedor.querySelector('.pie-fijo')

        if (ccp) {
            ccp.parentNode.insertBefore(bloqueFirma, ccp.nextSibling)
        } else if (firmaTexto) {
            if (pie) {
                pie.parentNode.insertBefore(bloqueFirma, pie)
            } else {
                firmaTexto.parentNode.insertBefore(bloqueFirma, firmaTexto.nextSibling)
            }
        } else {
            contenedor.appendChild(bloqueFirma)
        }

        return contenedor.innerHTML
    }

    // Firmar y subir documento

    async function firmarYSubirDocumentoEspecial(documentoId, htmlPersonalizado = null) {
        documentoIdActual.value = documentoId

        const claveDocumento = obtenerClaveDocumentoEspecial()
        const config = CONFIG_DOCUMENTOS_ESPECIALES[claveDocumento]

        if (!config) {
            throw new Error(
                `No existe configuración para el documento. Tipo: "${tipo}", Subtipo: "${subtipo.value}", Servicio: "${campos.value.tipo_servicio}".`
            )
        }

        const htmlBase = htmlPersonalizado ||
            document.querySelector('.documento-carta')?.innerHTML ||
            ''

        if (!htmlBase.trim()) {
            throw new Error(
                'No se encontró el contenido HTML del documento para generar la versión firmada.'
            )
        }

        // Comisión externa

        if (claveDocumento === 'comision-externa') {
            const resultado = await prepararFirmasAutorizacionDirector(documentoId)
            const firma = resultado.firmaConcatenada

            if (!firma) {
                throw new Error('No se pudieron generar las tres firmas electrónicas.')
            }

            if (firma.length !== 216) {
                throw new Error(`La firma final tiene ${firma.length} caracteres. Debe tener 216.`)
            }

            qrFirma.value = ''
            enlaceDriveFirma.value = ''
            archivoDriveFirma.value = null

            await nextTick()

            const htmlProvisional = insertarFirmaEnHtml(htmlBase, firma, '')
            const pdfProvisional = await generarPDFFromVistaPrevia(htmlProvisional)

            const nombreArchivo = `${config.prefijo}_${campos.value.numero_oficio || documentoId}.pdf`

            const archivoDrive = await config.subirPdf(
                new Uint8Array(pdfProvisional),
                nombreArchivo
            )

            if (!archivoDrive?.id) {
                throw new Error('Google Drive no devolvió el ID del archivo.')
            }

            if (!archivoDrive?.enlace) {
                throw new Error('Google Drive no devolvió el enlace del archivo.')
            }

            archivoDriveFirma.value = archivoDrive
            enlaceDriveFirma.value = archivoDrive.enlace

            const qrDataUrl = await QRCode.toDataURL(archivoDrive.enlace, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 180
            })

            qrFirma.value = qrDataUrl

            const htmlFinal = insertarFirmaEnHtml(htmlBase, firma, qrDataUrl)

            if (mostrarDocumentoFirmado && htmlFinal) {
                mostrarDocumentoFirmado(htmlFinal)
                await nextTick()
            }

            await new Promise(resolve => setTimeout(resolve, 500))

            const pdfFinal = await generarPDFFromVistaPrevia(htmlFinal)

            await actualizarPdfGoogleDrive(archivoDrive.id,new Uint8Array(pdfFinal))
            const director = buscarPorClave('director')

            await actualizarDocumento(documentoId, {
                estado: 'autorizado',
                firmaElectronica: firma,
                rutaDocumentoFirmado: archivoDrive.enlace,
                driveFileId: archivoDrive.id,
                autorizadoPor: director?.nombre || 'El Director',
                fechaAutorizacion: new Date().toISOString(),
                rechazadoPor: '',
                observaciones: '',
                cuerpo: htmlFinal
            })

            const bitacora = await getBitacoraPorDocumentoId(documentoId)

            if (bitacora?.id) {
                await actualizarBitacora(bitacora.id, {
                    documentoId,
                    estado: 'finalizado',
                    firmaElectronica: firma,
                    rutaDocumentoFirmado: archivoDrive.enlace,
                    driveFileId: archivoDrive.id,
                    cuerpo: htmlFinal,
                    observacionJefeDepto: ''
                })
            }

            return {
                id: archivoDrive.id,
                enlace: archivoDrive.enlace,
                firma,
                firmas: resultado.firmas,
                cuerpo: htmlFinal
            }
        }

        // Resto de documentos

        await config.prepararFirma(documentoId)

        qrFirma.value = ''
        enlaceDriveFirma.value = ''
        archivoDriveFirma.value = null

        await nextTick()

        const htmlProvisional = insertarFirmaEnHtml(
            htmlBase,
            firmaElectronica.value,
            ''
        )

        const pdfProvisional = await generarPDFFromVistaPrevia(htmlProvisional)

        const nombreArchivo = `${config.prefijo}_${campos.value.numero_oficio || documentoId}.pdf`

        const archivoDrive = await config.subirPdf(
            new Uint8Array(pdfProvisional),
            nombreArchivo
        )

        if (!archivoDrive?.id) {
            throw new Error('Google Drive no devolvió el ID del archivo.')
        }

        if (!archivoDrive?.enlace) {
            throw new Error('Google Drive no devolvió el enlace del archivo.')
        }

        archivoDriveFirma.value = archivoDrive
        enlaceDriveFirma.value = archivoDrive.enlace

        const qrDataUrl = await QRCode.toDataURL(archivoDrive.enlace, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 180
        })

        qrFirma.value = qrDataUrl

        const htmlFinal = insertarFirmaEnHtml(
            htmlBase,
            firmaElectronica.value,
            qrDataUrl
        )

        if (!htmlFinal?.trim()) {
            throw new Error('El HTML final quedó vacío antes de generar el PDF.')
        }

        if (mostrarDocumentoFirmado) {
            mostrarDocumentoFirmado(htmlFinal)
            await nextTick()
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        const pdfFinal = await generarPDFFromVistaPrevia(htmlFinal)

        await actualizarPdfGoogleDrive(archivoDrive.id, new Uint8Array(pdfFinal))
        const esComisionParaJefe = claveDocumento === 'comision-interna' && campos.value.para_jefe_depto === true

        const firmanteAutorizador = esComisionParaJefe
            ? buscarPorClave('subdirectora')
            : buscarPorClave('jefe_depto')

        await actualizarDocumento(documentoId, {
            estado: 'autorizado',
            firmaElectronica: firmaElectronica.value,
            rutaDocumentoFirmado: archivoDrive.enlace,
            driveFileId: archivoDrive.id,
            autorizadoPor: firmanteAutorizador?.nombre ||
                (esComisionParaJefe ? 'Subdirectora' : 'Jefe de Departamento'),
            fechaAutorizacion: new Date().toISOString(),
            rechazadoPor: '',
            observaciones: '',
            cuerpo: htmlFinal
        })

        const bitacora = await getBitacoraPorDocumentoId(documentoId)

        if (bitacora?.id) {
            await actualizarBitacora(bitacora.id, {
                documentoId,
                estado: 'finalizado',
                firmaElectronica: firmaElectronica.value,
                rutaDocumentoFirmado: archivoDrive.enlace,
                driveFileId: archivoDrive.id,
                cuerpo: htmlFinal,
                observacionJefeDepto: ''
            })
        }

        return {
            id: archivoDrive.id,
            enlace: archivoDrive.enlace,
            firma: firmaElectronica.value,
            cuerpo: htmlFinal
        }
    }

    return {
        firmaElectronica,
        qrFirma,
        enlaceDriveFirma,
        archivoDriveFirma,
        documentoIdActual,
        sugerenciasFirmantes,
        campoFirmanteActivo,
        firmasLiberacion,
        buscarFirmantesLiberacion,
        seleccionarFirmanteLiberacion,
        prepararFirmaJefeDepartamento,
        prepararFirmaComisionInterna,
        prepararFirmaServicioSocial,
        prepararFirmaResidencia,
        prepararFirmaTerminacionServicio,
        prepararFirmaTerminacionResidencia,
        prepararFirmaOficioTesis,
        prepararFirmaMemorandumHorario,
        prepararFirmaMantenimientoInterno,
        prepararFirmaMantenimientoExterno,
        prepararFirmaOtros,
        prepararFirmasLiberacionProyecto,
        prepararFirmasAutorizacionDirector,
        generarFirmaParaFirmante,
        generarFirmaElectronica,
        firmarDocumentoGuardado,
        obtenerClaveDocumentoEspecial,
        insertarFirmaEnHtml,
        firmarYSubirDocumentoEspecial,
        generarPDFFromVistaPrevia,
        CONFIG_DOCUMENTOS_ESPECIALES
    }
}
