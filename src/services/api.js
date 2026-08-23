import axios from 'axios'

const BASE_URL = 'http://localhost:3000'

// ─── USUARIOS ───
export async function getUsuarios() {
    const res = await axios.get(`${BASE_URL}/usuarios`)
    return res.data
}

export async function agregarUsuario(nuevoUsuario) {
    const res = await axios.post(`${BASE_URL}/usuarios`, nuevoUsuario)
    return res.data
}

export async function actualizarUsuario(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/usuarios/${id}`, cambios)
    return res.data
}

export async function eliminarUsuario(id) {
    await axios.delete(`${BASE_URL}/usuarios/${id}`)
}

// ─── LOGIN ───
// Login simple por email+password contra la colección usuarios.
export async function login(email, password) {
    const res = await axios.get(`${BASE_URL}/usuarios?email=${email}&password=${password}`)
    return res.data[0] || null
}

// ─── PERSONAS (búsqueda para autocompletar en formularios) ───
export async function buscarAlumno(query) {
    const res = await axios.get(`${BASE_URL}/alumnos`)
    const q = query.toLowerCase()
    return res.data.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.numero_control && p.numero_control.includes(q))
    )
}

export async function buscarDocente(query) {
    const res = await axios.get(`${BASE_URL}/docentes`)
    const q = query.toLowerCase()
    return res.data.filter(p => p.nombre.toLowerCase().includes(q))
}

export async function buscarEgresado(query) {
    const res = await axios.get(`${BASE_URL}/egresados`)
    const q = query.toLowerCase()
    return res.data.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.numero_control && p.numero_control.includes(q))
    )
}

// ─── DOCENTES (catálogo — administración) ───
export async function getDocentes() {
    const res = await axios.get(`${BASE_URL}/docentes`)
    return res.data
}

export async function agregarDocente(nuevo) {
    const res = await axios.post(`${BASE_URL}/docentes`, nuevo)
    return res.data
}

export async function actualizarDocente(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/docentes/${id}`, cambios)
    return res.data
}

export async function eliminarDocente(id) {
    await axios.delete(`${BASE_URL}/docentes/${id}`)
}

// ─── BITÁCORA (tareas asignadas) ───
export async function getBitacora() {
    const res = await axios.get(`${BASE_URL}/bitacora`)
    return res.data
}

export async function getBitacoraPorId(id) {
    const res = await axios.get(`${BASE_URL}/bitacora/${id}`)
    return res.data
}

// Encuentra la tarea ligada a un documento sin conocer su id de tarea
// de antemano — para sincronizar la tarea al editar el documento
// desde cualquier pantalla, no solo cuando se llega con ?bitacoraId=.
export async function getBitacoraPorDocumentoId(documentoId) {
    const res = await axios.get(`${BASE_URL}/bitacora?documentoId=${documentoId}`)
    return res.data[0] || null
}

// Crea una tarea nueva, siempre en estado 'pendiente'.
export async function agregarBitacora(entrada) {
    entrada.estado = 'pendiente'
    // El id de json-server es un string aleatorio, no sirve para
    // ordenar cronológicamente — creadoEn sí (más reciente primero).
    entrada.creadoEn = Date.now()
    const res = await axios.post(`${BASE_URL}/bitacora`, entrada)
    return res.data
}

export async function actualizarEstadoBitacora(id, estado) {
    const res = await axios.patch(`${BASE_URL}/bitacora/${id}`, { estado })
    return res.data
}

// Edita cualquier campo de la tarea (fecha, descripción, tipo,
// asignado) o limpia campos (ej. documentoId al borrar el documento
// ligado) — no solo cambiar el estado.
export async function actualizarBitacora(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/bitacora/${id}`, cambios)
    return res.data
}

// Marca la tarea como finalizada y la liga al documento recién
// creado, para poder abrirlo desde la misma Bitácora.
export async function finalizarBitacora(id, documentoId) {
    const res = await axios.patch(`${BASE_URL}/bitacora/${id}`, {
        estado: 'finalizado',
        documentoId,
        observacionJefeDepto: ''
    })
    return res.data
}

// El Jefe de Depto revisó el documento finalizado y pidió corregir
// algo — la tarea regresa a 'pendiente' (no 'elaboración') porque,
// para quien la tiene asignada, es tarea nueva que aún no retoma.
export async function retroalimentarBitacora(id, observacion) {
    const res = await axios.patch(`${BASE_URL}/bitacora/${id}`, {
        estado: 'pendiente',
        observacionJefeDepto: observacion
    })
    return res.data
}

export async function eliminarBitacora(id) {
    await axios.delete(`${BASE_URL}/bitacora/${id}`)
}

// ─── DOCUMENTOS ───
export async function getDocumentos() {
    const res = await axios.get(`${BASE_URL}/documentos`)
    return res.data
}

// Crea un documento y le asigna folio interno (DOC-año-000) y fecha
// automáticos — folio es el id interno, no el número de oficio real.
export async function agregarDocumento(documento) {
    const documentos = await getDocumentos()
    documento.folio = `DOC-${new Date().getFullYear()}-${String(documentos.length + 1).padStart(3, '0')}`
    documento.fecha = new Date().toLocaleDateString('es-MX')
    // Mismo motivo que en agregarBitacora: el id es aleatorio, no
    // sirve para ordenar — creadoEn sí.
    documento.creadoEn = Date.now()
    const res = await axios.post(`${BASE_URL}/documentos`, documento)
    return res.data
}

export async function actualizarDocumento(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/documentos/${id}`, cambios)
    return res.data
}

export async function eliminarDocumento(id) {
    await axios.delete(`${BASE_URL}/documentos/${id}`)
}

export async function getDocumentoPorId(id) {
    const res = await axios.get(`${BASE_URL}/documentos/${id}`)
    return res.data
}

export async function getDocumentosPorEstado(estado) {
    const res = await axios.get(`${BASE_URL}/documentos?estado=${estado}`)
    return res.data
}

export async function buscarPorCorreo(email) {
    const res = await axios.get(`${BASE_URL}/usuarios?email=${email}`)
    return res.data[0] || null
}

// ─── APROBACIÓN DE COMISIONES EXTERNAS (Subdirectora/Director) ───
export async function autorizarDocumento(id, siguienteEstado) {
    const res = await axios.patch(`${BASE_URL}/documentos/${id}`, { estado: siguienteEstado })
    return res.data
}

// Rechaza y regresa el documento al Jefe de Depto para corregir.
export async function rechazarDocumento(id, observaciones, rechazadoPor) {
    const res = await axios.patch(`${BASE_URL}/documentos/${id}`, {
        estado: 'pendiente_jefeDepto',
        observaciones,
        rechazadoPor
    })
    return res.data
}

export async function cancelarDocumento(id, motivoCancelacion) {
    const res = await axios.patch(`${BASE_URL}/documentos/${id}`, {
        estado: 'cancelado',
        motivoCancelacion
    })
    return res.data
}

// ─── PLANTILLAS (formatos base de cada tipo de documento) ───
export async function getPlantilla(tipo) {
    const res = await axios.get(`${BASE_URL}/plantillas?tipo=${tipo}`)
    return res.data[0] || null
}

export async function getPlantillas() {
    const res = await axios.get(`${BASE_URL}/plantillas`)
    return res.data
}

export async function actualizarPlantilla(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/plantillas/${id}`, cambios)
    return res.data
}

// ─── CONFIGURACIÓN INSTITUCIONAL (folio, estilo) ───
export async function getConfiguracion() {
    const res = await axios.get(`${BASE_URL}/configuracion`)
    return res.data
}

export async function actualizarConfiguracion(cambios) {
    const res = await axios.patch(`${BASE_URL}/configuracion`, cambios)
    return res.data
}

// ─── FIRMANTES (quiénes firman/elaboran los documentos) ───
export async function getFirmantes() {
    const res = await axios.get(`${BASE_URL}/firmantes`)
    return res.data
}

export async function agregarFirmante(nuevo) {
    const res = await axios.post(`${BASE_URL}/firmantes`, nuevo)
    return res.data
}

export async function actualizarFirmante(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/firmantes/${id}`, cambios)
    return res.data
}

export async function eliminarFirmante(id) {
    await axios.delete(`${BASE_URL}/firmantes/${id}`)
}

// ─── DESTINATARIOS (a quién van dirigidos los documentos) ───
export async function getDestinatarios() {
    const res = await axios.get(`${BASE_URL}/destinatarios`)
    return res.data
}

export async function agregarDestinatario(nuevo) {
    const res = await axios.post(`${BASE_URL}/destinatarios`, nuevo)
    return res.data
}

export async function actualizarDestinatario(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/destinatarios/${id}`, cambios)
    return res.data
}

export async function eliminarDestinatario(id) {
    await axios.delete(`${BASE_URL}/destinatarios/${id}`)
}

// ─── GRADOS (catálogo compartido por Firmantes/Destinatarios) ───
export async function getGrados() {
    const res = await axios.get(`${BASE_URL}/grados`)
    return res.data
}

export async function agregarGrado(nuevo) {
    const res = await axios.post(`${BASE_URL}/grados`, nuevo)
    return res.data
}

export async function actualizarGrado(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/grados/${id}`, cambios)
    return res.data
}

export async function eliminarGrado(id) {
    await axios.delete(`${BASE_URL}/grados/${id}`)
}

// ─── CCP OPCIONES (catálogo — destinos de nota de copia) ───
export async function getCcpOpciones() {
    const res = await axios.get(`${BASE_URL}/ccp_opciones`)
    return res.data
}

export async function agregarCcpOpcion(nuevo) {
    const res = await axios.post(`${BASE_URL}/ccp_opciones`, nuevo)
    return res.data
}

export async function actualizarCcpOpcion(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/ccp_opciones/${id}`, cambios)
    return res.data
}

export async function eliminarCcpOpcion(id) {
    await axios.delete(`${BASE_URL}/ccp_opciones/${id}`)
}

// ─── GRUPOS DE TUTORÍA ───
export async function getGruposTutoria() {
    const res = await axios.get(`${BASE_URL}/gruposTutoria`)
    return res.data
}

export async function agregarGrupoTutoria(grupo) {
    const res = await axios.post(`${BASE_URL}/gruposTutoria`, grupo)
    return res.data
}

export async function actualizarGrupoTutoria(id, cambios) {
    const res = await axios.patch(`${BASE_URL}/gruposTutoria/${id}`, cambios)
    return res.data
}

export async function eliminarGrupoTutoria(id) {
    await axios.delete(`${BASE_URL}/gruposTutoria/${id}`)
}

// ─── FOLIOS (numeración de oficios) ───
// categoria es 'general' o 'memorandums' — cada una tiene su propio
// contador y sus propias reservas, totalmente independientes.

// Toma el siguiente número y AVANZA el contador de una vez — "gasta"
// el folio, no es solo consultar cuál sigue.
export async function consumirSiguienteFolio(categoria) {
    const config = await getConfiguracion()
    if (!config.folio[categoria]) config.folio[categoria] = { actual: 0, reservados: [] }
    config.folio[categoria].actual = (config.folio[categoria].actual || 0) + 1
    await actualizarConfiguracion(config)
    return {
        numero: config.folio[categoria].actual,
        anio: config.folio.anio,
        prefijo: config.folio.prefijo_default,
    }
}

// Adelanta el contador "cantidad" folios y los guarda uno por uno
// como reservados (no como rango) — cada uno con su propio estado
// usado/libre.
export async function reservarFolios(categoria, cantidad) {
    const config = await getConfiguracion()
    if (!config.folio[categoria]) config.folio[categoria] = { actual: 0, reservados: [] }
    const cat = config.folio[categoria]
    if (!cat.reservados) cat.reservados = []
    for (let i = 0; i < cantidad; i++) {
        cat.actual += 1
        cat.reservados.push({ numero: cat.actual, usado: false })
    }
    await actualizarConfiguracion(config)
    return config.folio
}

// Marca (o desmarca) un folio reservado como usado — desde la
// pantalla de Folio a mano, o automático al asignarlo a un documento.
export async function marcarFolioReservado(categoria, numero, usado) {
    const config = await getConfiguracion()
    const folio = config.folio[categoria]?.reservados?.find(r => r.numero === numero)
    if (folio) folio.usado = usado
    await actualizarConfiguracion(config)
    return config.folio
}

// Reinicia el contador de una categoría a 0 y borra sus reservas —
// irreversible, normalmente solo al iniciar un año nuevo.
export async function reiniciarContadorFolio(categoria) {
    const config = await getConfiguracion()
    config.folio[categoria] = { actual: 0, reservados: [] }
    await actualizarConfiguracion(config)
    return config.folio
}