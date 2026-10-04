// Maneja la conexión, subida y actualización de archivos en Google Drive.

const CLIENT_ID = '226977275079-pe74k37o54bk962r0m8rpod4phctv49t.apps.googleusercontent.com'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

// Carpetas de Google Drive.

const CARPETA_FIRMADOS = '1casFpTviHZUT_NJ493YtIkfq-VPxmg9G'
const CARPETA_DOCENTES = '1vHQ4rW82pxZWEW4zvmd6vAxi7_90zku1'
const CARPETA_INTERNOS = '1S_yDM7ESVrs4fJaDmU8M60kaAVl7BUqe'
const CARPETA_EXTERNO = '1msGDB6fbRIYsSQui68Aqd3b9hz5ksUR1'
const CARPETA_SERVICIO_SOCIAL = '1sGbsMK_cq2imRf63FOCRCtu1rOw6VWcx'
const CARPETA_RESIDENCIA_PROFESIONAL = '1418R-8BkCtLqlUc1EYGp_B0tsuLWWJEd'
const CARPETA_TERMINACION_SERVICIO = '1XTTnk976ZmzKOeJVsn0gSvGuZCMdtRmY'
const CARPETA_TERMINACION_RESIDENCIA = '1tgkd21We-p67yp0YcxIGKmdSd9lDE0b4'
const CARPETA_OFICIO_TESIS = '1KHNz-oEDsdkQA0Ey4fWabEyFSbZESW9e'
const CARPETA_MEMORANDUM_FALTAS = '1jspktRO_uOeCG-NVp-LBC3sqDrni3jNS'
const CARPETA_MEMORANDUM_FALTAS_COMBINADOS = '1NGynX2Kq17XbKLFd-M1tcAFOXtFwLyOA'
const CARPETA_MEMORANDUM_HORARIO = '1nZweu362ylcEmNLVchldaOO0Y-qS_WcG'
const CARPETA_MANTENIMIENTO_INTERNO = '1L2fPXI5nI6460SA8UvPnULP0t6Q38-3w'
const CARPETA_MANTENIMIENTO_EXTERNO = '1EuOLfl4qAFf2b6gIJ5IZiuKRIfrTOkQH'
const CARPETA_OTROS = '1D2wf0Ca7uoYUcwwnPIJDddbAAMuIw5aD'
const CARPETA_LIBERACION_PROYECTO = '1mXbLfzFg1-GXoB6DJNvuZQJCL9Lxxru_'
const CARPETA_TUTORIAS = '1fK48LllJm_UNk-kJBoJK65a5IrV2ypAQ'

// Control de OAuth y del token de acceso.

let tokenClient = null
let accessToken = null
let tokenExpiration = 0

// Cargar Google Identity Services.

function cargarGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            resolve()
            return
        }

        const existente = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')

        if (existente) {
            existente.addEventListener('load', resolve, {once: true})
            existente.addEventListener('error', () => {
                reject(new Error('No se pudo cargar Google Identity Services.'))
            }, {once: true})
            return
        }

        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true

        script.onload = () => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                resolve()
            } else {
                reject(new Error('Google Identity Services no está disponible.'))
            }
        }

        script.onerror = () => {
            reject(new Error('No se pudo cargar Google Identity Services.'))
        }

        document.head.appendChild(script)
    })
}

// Inicializar el cliente OAuth.

async function inicializarOAuth() {
    await cargarGoogleIdentityServices()

    if (tokenClient) {
        return tokenClient
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: () => {}
    })

    return tokenClient
}

// Obtener un token válido para Google Drive.

export async function obtenerAccessToken(forzarNuevo = false) {
    await inicializarOAuth()

    const ahora = Date.now()
    const tokenTodaviaValido = accessToken && tokenExpiration > ahora + 60000

    if (tokenTodaviaValido && !forzarNuevo) {
        return accessToken
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = (response) => {
            if (response.error) {
                reject(new Error(response.error_description || response.error || 'No se pudo obtener autorización de Google.'))
                return
            }

            accessToken = response.access_token
            const segundos = Number(response.expires_in || 3600)

            tokenExpiration = Date.now() + segundos * 1000

            resolve(accessToken)
        }

        tokenClient.requestAccessToken({
            prompt: forzarNuevo ? 'consent' : ''
        })
    })
}

// Solicitar autorización para Google Drive.

export async function conectarGoogleDrive() {
    const token = await obtenerAccessToken(true)

    if (!token) {
        throw new Error('No se obtuvo acceso a Google Drive.')
    }

    return true
}

// Subir un PDF a Google Drive.

export async function subirPdfGoogleDrive(bytesPDF, nombreArchivo, carpetaId = null) {
    let token = await obtenerAccessToken()

    const blob = new Blob([bytesPDF], {type: 'application/pdf'})
    const metadata = {name: nombreArchivo, mimeType: 'application/pdf'}

    if (carpetaId) {
        metadata.parents = [carpetaId]
    }

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const body = new Blob([
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        delimiter,
        'Content-Type: application/pdf\r\n\r\n',
        blob,
        closeDelimiter
    ])

    const url = 'https://www.googleapis.com/upload/drive/v3/files' +
        '?uploadType=multipart' +
        '&fields=id,name,webViewLink,webContentLink'

    let respuesta = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body
    })

    if (respuesta.status === 401) {
        token = await obtenerAccessToken(true)

        respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body
        })
    }

    if (!respuesta.ok) {
        const texto = await respuesta.text()
        throw new Error(`Google Drive respondió ${respuesta.status}. ${texto}`)
    }

    const archivo = await respuesta.json()
    return archivo
}

// Subir un PDF, hacerlo público y devolver sus datos.

export async function subirPdf(bytesPDF, nombreArchivo, carpetaId, tipoDocumento = 'documento') {
    const archivo = await subirPdfGoogleDrive(bytesPDF, nombreArchivo, carpetaId)

    if (!archivo.id) {
        throw new Error(`Google Drive no devolvió el ID del PDF de ${tipoDocumento}.`)
    }

    await hacerArchivoPublico(archivo.id)

    return {
        id: archivo.id,
        nombre: archivo.name,
        enlace: obtenerEnlaceDrive(archivo.id)
    }
}

// Seleccionar automáticamente la carpeta según el tipo de documento.

export async function subirPdfPorTipo(bytesPDF, nombreArchivo, tipoDocumento) {
    let carpetaId = null

    switch (tipoDocumento) {
        case 'comision-interna':
            carpetaId = CARPETA_INTERNOS
            break

        case 'comision-externa':
            carpetaId = CARPETA_EXTERNO
            break

        case 'aceptacion-servicio-social':
            carpetaId = CARPETA_SERVICIO_SOCIAL
            break

        case 'aceptacion-residencia':
            carpetaId = CARPETA_RESIDENCIA_PROFESIONAL
            break

        case 'docente':
            carpetaId = CARPETA_DOCENTES
            break

        case 'horario':
            carpetaId = CARPETA_FIRMADOS
            break

        case 'terminacion-servicio':
            carpetaId = CARPETA_TERMINACION_SERVICIO
            break

        case 'terminacion-residencia':
            carpetaId = CARPETA_TERMINACION_RESIDENCIA
            break

        case 'oficio_tesis':
            carpetaId = CARPETA_OFICIO_TESIS
            break

        case 'memorandum-solventacion-faltas':
            carpetaId = CARPETA_MEMORANDUM_FALTAS
            break

        case 'memorandum-solventacion-faltas-combinado':
            carpetaId = CARPETA_MEMORANDUM_FALTAS_COMBINADOS
            break

        case 'memorandum-compactacion-horario':
            carpetaId = CARPETA_MEMORANDUM_HORARIO
            break

        case 'mantenimiento_interno':
            carpetaId = CARPETA_MANTENIMIENTO_INTERNO
            break

        case 'mantenimiento_externo':
            carpetaId = CARPETA_MANTENIMIENTO_EXTERNO
            break

        case 'otros':
            carpetaId = CARPETA_OTROS
            break

        case 'liberacion-proyecto':
            carpetaId = CARPETA_LIBERACION_PROYECTO
            break

        case 'tutorias':
            carpetaId = CARPETA_TUTORIAS
            break

        default:
            throw new Error(`Tipo de documento no reconocido: "${tipoDocumento}".`)
    }

    if (!carpetaId) {
        throw new Error(`No existe una carpeta configurada para el tipo "${tipoDocumento}".`)
    }

    const archivo = await subirPdf(bytesPDF, nombreArchivo, carpetaId, tipoDocumento)

    return archivo
}

// Actualizar un PDF existente en Google Drive.

export async function actualizarPdfGoogleDrive(fileId, bytesPDF) {
    if (!fileId) {
        throw new Error('No se recibió el ID del archivo de Google Drive.')
    }

    let token = await obtenerAccessToken()

    const blob = new Blob([bytesPDF], {type: 'application/pdf'})
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`

    let respuesta = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/pdf'
        },
        body: blob
    })

    if (respuesta.status === 401) {
        token = await obtenerAccessToken(true)

        respuesta = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/pdf'
            },
            body: blob
        })
    }

    if (!respuesta.ok) {
        const texto = await respuesta.text()
        throw new Error(`No se pudo actualizar el PDF. Código ${respuesta.status}.`)
    }

    const texto = await respuesta.text()

    if (!texto) {
        return {id: fileId}
    }

    return JSON.parse(texto)
}

// Hacer público un archivo de Google Drive.

export async function hacerArchivoPublico(fileId) {
    let token = await obtenerAccessToken()

    const datos = {role: 'reader', type: 'anyone'}
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`

    let respuesta = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })

    if (respuesta.status === 401) {
        token = await obtenerAccessToken(true)

        respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
    }

    if (!respuesta.ok) {
        const texto = await respuesta.text()
        throw new Error(`No se pudo hacer público el archivo. Código ${respuesta.status}. ${texto}`)
    }

    return await respuesta.json()
}

// Generar el enlace de visualización de Google Drive.

export function obtenerEnlaceDrive(fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`
}

// Exportar los IDs de las carpetas.

export {
    CARPETA_FIRMADOS,
    CARPETA_DOCENTES,
    CARPETA_INTERNOS,
    CARPETA_SERVICIO_SOCIAL,
    CARPETA_RESIDENCIA_PROFESIONAL,
    CARPETA_TERMINACION_SERVICIO,
    CARPETA_TERMINACION_RESIDENCIA,
    CARPETA_OFICIO_TESIS,
    CARPETA_MEMORANDUM_FALTAS,
    CARPETA_MEMORANDUM_HORARIO,
    CARPETA_MANTENIMIENTO_INTERNO,
    CARPETA_MANTENIMIENTO_EXTERNO,
    CARPETA_OTROS,
    CARPETA_LIBERACION_PROYECTO,
    CARPETA_EXTERNO,
    CARPETA_TUTORIAS,
    CARPETA_MEMORANDUM_FALTAS_COMBINADOS
}