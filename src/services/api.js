import axios from "axios";
import { generarHashFirma } from './hash.js'

//const BASE_URL = "http://localhost:3000";

//para conectar con render
const BASE_URL = 'https://proyecto-residencia.onrender.com'

// ─── BASE: operaciones comunes de cualquier colección ───
// Si lo que se quiere borrar ya no existe (404), no es error: el
// objetivo (que no esté) ya se cumplió. Pasa, por ejemplo, porque
// json-server borra solo las tareas ligadas al borrar su documento.
function ignorarNoExiste(e) {
    if (e?.response?.status !== 404) throw e;
}

// Las 5 operaciones básicas de una colección de json-server. Los
// catálogos las usan tal cual; documentos y bitácora encima agregan
// sus reglas propias (más abajo). Un solo lugar para cambiar cómo se
// habla con el servidor (por ejemplo, las rutas de Laravel).
function crearCrud(coleccion) {
    const url = `${BASE_URL}/${coleccion}`;
    return {
        listar: async () => (await axios.get(url)).data,
        obtener: async (id) => (await axios.get(`${url}/${id}`)).data,
        agregar: async (nuevo) => (await axios.post(url, nuevo)).data,
        actualizar: async (id, cambios) => (await axios.patch(`${url}/${id}`, cambios)).data,
        eliminar: async (id) => {
            await axios.delete(`${url}/${id}`).catch(ignorarNoExiste);
        },
    };
}

// ─── USUARIOS ───
const usuarios = crearCrud("usuarios");
export const getUsuarios = usuarios.listar;
export const agregarUsuario = usuarios.agregar;
export const actualizarUsuario = usuarios.actualizar;
export const eliminarUsuario = usuarios.eliminar;

// ─── LOGIN ───
// Login simple por email+password contra la colección usuarios.
export async function login(email, password) {
    const res = await axios.get(
        `${BASE_URL}/usuarios?email=${email}&password=${password}`,
    );
    return res.data[0] || null;
}

export async function buscarPorCorreo(email) {
    const res = await axios.get(`${BASE_URL}/usuarios?email=${email}`);
    return res.data[0] || null;
}

// ─── PERSONAS (búsqueda para autocompletar en formularios) ───
export async function buscarAlumno(query) {
    const res = await axios.get(`${BASE_URL}/alumnos`);
    const q = query.toLowerCase();
    return res.data.filter(
        (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.numero_control && p.numero_control.includes(q)),
    );
}

export async function buscarDocente(query) {
    const res = await axios.get(`${BASE_URL}/docentes`);
    const q = query.toLowerCase();
    return res.data.filter((p) => p.nombre.toLowerCase().includes(q));
}

export async function buscarEgresado(query) {
    const res = await axios.get(`${BASE_URL}/egresados`);
    const q = query.toLowerCase();
    return res.data.filter(
        (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.numero_control && p.numero_control.includes(q)),
    );
}

// ─── CATÁLOGOS (se administran desde su propia pantalla) ───
const docentes = crearCrud("docentes");

export const getDocentes = docentes.listar;

// Agregar docente manteniendo sincronizado su hash de firma
// con el registro correspondiente de firmantes.
export async function agregarDocente(nuevo) {
    const firmantesRes = await axios.get(`${BASE_URL}/firmantes`);
    const firmantes = firmantesRes.data;

    const firmanteExistente = firmantes.find(
        f => f.nombre === nuevo.nombre && f.firma !== false
    );

    let hashFirma;

    if (firmanteExistente?.hashFirma) {
        // La persona ya tiene un hash registrado.
        // Se reutiliza exactamente el mismo.
        hashFirma = firmanteExistente.hashFirma;
    } else {
        // La persona no tiene hash.
        // Se genera a partir de su nombre.
        hashFirma = await generarHashFirma(nuevo.nombre);

        // Si ya existía como firmante pero no tenía hash,
        // también se actualiza ese registro.
        if (firmanteExistente) {
            await axios.patch(
                `${BASE_URL}/firmantes/${firmanteExistente.id}`,
                { hashFirma }
            );
        }
    }

    const docenteConHash = {
        ...nuevo,
        hashFirma
    };

    const res = await axios.post(
        `${BASE_URL}/docentes`,
        docenteConHash
    );

    return res.data;
}

export async function actualizarDocente(id, cambios) {
    const res = await axios.patch(
        `${BASE_URL}/docentes/${id}`,
        cambios
    );

    return res.data;
}

export const eliminarDocente = docentes.eliminar;


// ─── FIRMANTES ───
// Quiénes firman/elaboran los documentos.
const firmantes = crearCrud("firmantes");

export const getFirmantes = firmantes.listar;

// Agregar firmante manteniendo sincronizado su hash
// con el docente correspondiente.
export async function agregarFirmante(nuevo) {

    // Las personas que no firman no necesitan hash.
    if (nuevo.firma === false) {
        return firmantes.agregar(nuevo);
    }

    const docentesLista = await getDocentes();
    const docenteExistente = docentesLista.find(d => d.nombre === nuevo.nombre);

    let hashFirma;

    if (docenteExistente?.hashFirma) {
        // Reutilizar el hash que ya tiene el docente.
        hashFirma = docenteExistente.hashFirma;
    } else {
        // Generar un hash nuevo.
        hashFirma = await generarHashFirma(nuevo.nombre);

        // Si el docente ya existe pero no tenía hash,
        // actualizarlo también.
        if (docenteExistente) {
            await actualizarDocente(docenteExistente.id,{ hashFirma });
        }
    }

    const firmanteConHash = {
        ...nuevo,
        hashFirma
    };

    return firmantes.agregar(firmanteConHash);
}

export const actualizarFirmante = firmantes.actualizar;
export const eliminarFirmante = firmantes.eliminar;

// ─── SINCRONIZAR HASH DE DOCENTES Y FIRMANTES ───
export async function sincronizarHashes() {
    const [docentes, firmantesLista] = await Promise.all([
        getDocentes(),
        getFirmantes()
    ]);

    const normalizarNombre = nombre =>
        (nombre || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    // ─── DOCENTES → FIRMANTES ───
    for (const docente of docentes) {
        const nombreDocente = normalizarNombre(docente.nombre);

        if (!nombreDocente) continue;

        const firmante = firmantesLista.find(
            f =>
                normalizarNombre(f.nombre) === nombreDocente &&
                f.firma !== false
        );

        let hashFirma = docente.hashFirma;

        if (!hashFirma && firmante?.hashFirma) {
            hashFirma = firmante.hashFirma;
        }

        if (!hashFirma) {
            hashFirma = await generarHashFirma(docente.nombre);
        }

        if (docente.hashFirma !== hashFirma) {
            await actualizarDocente(docente.id,{ hashFirma });
        }

        if (firmante && firmante.hashFirma !== hashFirma) {
            await actualizarFirmante(firmante.id,{ hashFirma });
        }
    }

    // ─── FIRMANTES → DOCENTES ───
    for (const firmante of firmantesLista) {
        if (firmante.firma === false) continue;

        const nombreFirmante = normalizarNombre(firmante.nombre);

        if (!nombreFirmante) continue;

        const docente = docentes.find(
            d => normalizarNombre(d.nombre) === nombreFirmante
        );

        let hashFirma = firmante.hashFirma;

        if (!hashFirma && docente?.hashFirma) {
            hashFirma = docente.hashFirma;
        }

        if (!hashFirma) {
            hashFirma = await generarHashFirma(firmante.nombre);
        }

        if (firmante.hashFirma !== hashFirma) {
            await actualizarFirmante(firmante.id,{ hashFirma });
        }

        if (docente && docente.hashFirma !== hashFirma) {
            await actualizarDocente( docente.id,{ hashFirma });
        }
    }

    return {
        docentes,
        firmantes: firmantesLista
    };
}


// A quién van dirigidos los documentos.
const destinatarios = crearCrud("destinatarios");
export const getDestinatarios = destinatarios.listar;
export const agregarDestinatario = destinatarios.agregar;
export const actualizarDestinatario = destinatarios.actualizar;
export const eliminarDestinatario = destinatarios.eliminar;

// Compartido por Firmantes/Destinatarios.
const grados = crearCrud("grados");
export const getGrados = grados.listar;
export const agregarGrado = grados.agregar;
export const actualizarGrado = grados.actualizar;
export const eliminarGrado = grados.eliminar;

// Destinos de la nota de copia (C.c.p.).
const ccpOpciones = crearCrud("ccp_opciones");
export const getCcpOpciones = ccpOpciones.listar;
export const agregarCcpOpcion = ccpOpciones.agregar;
export const actualizarCcpOpcion = ccpOpciones.actualizar;

export const eliminarCcpOpcion = ccpOpciones.eliminar;

// tipos de incidencia 
const tiposIncidencia = crearCrud("tipos_incidencia");
export const getTiposIncidencia = tiposIncidencia.listar;
export const agregarTipoIncidencia = tiposIncidencia.agregar;
export const actualizarTipoIncidencia = tiposIncidencia.actualizar;
export const eliminarTipoIncidencia = tiposIncidencia.eliminar;


// tipos de actividad complementaria cursos,eventos ,etc
const actividadesComplementarias = crearCrud("actividades_complementarias");
export const getActividadesComplementarias = actividadesComplementarias.listar;
export const agregarActividadComplementaria = actividadesComplementarias.agregar;
export const actualizarActividadComplementaria = actividadesComplementarias.actualizar;
export const eliminarActividadComplementaria = actividadesComplementarias.eliminar;

const gruposTutoria = crearCrud("gruposTutoria");
export const getGruposTutoria = gruposTutoria.listar;
export const agregarGrupoTutoria = gruposTutoria.agregar;
export const actualizarGrupoTutoria = gruposTutoria.actualizar;
export const eliminarGrupoTutoria = gruposTutoria.eliminar;

const fuentes = crearCrud("fuentes");
export const getFuentes = fuentes.listar;
export const agregarFuente = fuentes.agregar;
export const actualizarFuente = fuentes.actualizar;
export const eliminarFuente = fuentes.eliminar;

// ─── BITÁCORA (tareas asignadas) ───
const bitacora = crearCrud("bitacora");
export const getBitacora = bitacora.listar;
export const getBitacoraPorId = bitacora.obtener;
// Edita cualquier campo de la tarea (fecha, descripción, tipo,
// asignado) o limpia campos (ej. documentoId al borrar el documento
// ligado) — no solo cambiar el estado.
export const actualizarBitacora = bitacora.actualizar;
export const eliminarBitacora = bitacora.eliminar;

// Encuentra la tarea ligada a un documento sin conocer su id de tarea
// de antemano — para sincronizar la tarea al editar el documento
// desde cualquier pantalla, no solo cuando se llega con ?bitacoraId=.
export async function getBitacoraPorDocumentoId(documentoId) {
    const res = await axios.get(
        `${BASE_URL}/bitacora?documentoId=${documentoId}`,
    );
    return res.data[0] || null;
}

// Crea una tarea nueva, siempre en estado 'pendiente'.
export async function agregarBitacora(entrada) {
    entrada.estado = "pendiente";
    // El id de json-server es un string aleatorio, no sirve para
    // ordenar cronológicamente — creadoEn sí (más reciente primero).
    entrada.creadoEn = Date.now();
    return bitacora.agregar(entrada);
}

export async function actualizarEstadoBitacora(id, estado) {
    return bitacora.actualizar(id, { estado });
}

// Marca la tarea como finalizada y la liga al documento recién
// creado, para poder abrirlo desde la misma Bitácora.
export async function finalizarBitacora(id, documentoId) {
    return bitacora.actualizar(id, {
        estado: "finalizado",
        documentoId,
        observacionJefeDepto: "",
    });
}

// El Jefe de Depto revisó el documento finalizado y pidió corregir
// algo — la tarea regresa a 'pendiente' (no 'elaboración') porque,
// para quien la tiene asignada, es tarea nueva que aún no retoma.
export async function retroalimentarBitacora(id, observacion) {
    return bitacora.actualizar(id, {
        estado: "pendiente",
        observacionJefeDepto: observacion,
    });
}

// ─── DOCUMENTOS ───
const documentos = crearCrud("documentos");
export const getDocumentos = documentos.listar;
export const getDocumentoPorId = documentos.obtener;
export const actualizarDocumento = documentos.actualizar;
export const eliminarDocumento = documentos.eliminar;

// Crea un documento y le asigna folio interno (DOC-año-000) y fecha
// automáticos — folio es el id interno, no el número de oficio real.
export async function agregarDocumento(documento) {
    const existentes = await getDocumentos();
    documento.folio = `DOC-${new Date().getFullYear()}-${String(existentes.length + 1).padStart(3, "0")}`;
    documento.fecha = new Date().toLocaleDateString("es-MX");
    // Mismo motivo que en agregarBitacora: el id es aleatorio, no
    // sirve para ordenar — creadoEn sí.
    documento.creadoEn = Date.now();
    return documentos.agregar(documento);
}

export async function getDocumentosPorEstado(estado) {
    const res = await axios.get(`${BASE_URL}/documentos?estado=${estado}`);
    return res.data;
}

// ─── APROBACIÓN DE COMISIONES EXTERNAS (Subdirectora/Director) ───
export async function autorizarDocumento(id, siguienteEstado) {
    return documentos.actualizar(id, { estado: siguienteEstado });
}

// Rechaza y regresa el documento al Jefe de Depto para corregir.
export async function rechazarDocumento(id, observaciones, rechazadoPor) {
    return documentos.actualizar(id, {
        estado: "pendiente_jefeDepto",
        observaciones,
        rechazadoPor,
    });
}

export async function cancelarDocumento(id, motivoCancelacion) {
    return documentos.actualizar(id, {
        estado: "cancelado",
        motivoCancelacion,
        // si estaba en "corregir", faseDe lo seguiría mostrando como
        // Corrección solicitada y nunca llegaría a Cancelados
        revisionJefeDepto: "",
        esperandoCorreccionSecretaria: false,
        // y que a Secretaria le salga el motivo de cancelación, no una
        // instrucción de corrección que ya no aplica
        observacionJefeDepto: "",
        notaAlCompartir: "",
    });
}


// >Recursos humanos 
export async function enviarDocumentoARH(id) {
    return documentos.actualizar(id, {
        estado: "enviado_rh",
        enviadoRH: true,
        fechaEnvioRH: new Date().toISOString(),
        fechaAceptadoRH: "",
        observacionRH: "",
        fechaObservacionRH: "",
        rechazadoPor: "",
        observaciones: "",
    });
}

export async function getDocumentosEnviadosRH() {
    const res = await axios.get(`${BASE_URL}/documentos?enviadoRH=true`);
    return res.data;
}

export async function aceptarEnRH(id) {
    return documentos.actualizar(id, { estado: "aceptado_rh", fechaAceptadoRH: new Date().toISOString() });
}


export async function rechazarEnRH(id, observacion) {
    return documentos.actualizar(id, {
        estado: "pendiente_jefeDepto",
        rechazadoPor: "Recursos Humanos",
        observaciones: observacion,
        observacionRH: observacion,
        fechaObservacionRH: new Date().toISOString(),
    });
}

// ─── PLANTILLAS (formatos base de cada tipo de documento) ───
const plantillas = crearCrud("plantillas");
export const getPlantillas = plantillas.listar;
export const actualizarPlantilla = plantillas.actualizar;

export async function getPlantilla(tipo) {
    const res = await axios.get(`${BASE_URL}/plantillas?tipo=${tipo}`);
    return res.data[0] || null;
}

// ─── CONFIGURACIÓN INSTITUCIONAL (folio, estilo) ───
// Es un solo registro, no una lista: no lleva id en la ruta.
export async function getConfiguracion() {
    const res = await axios.get(`${BASE_URL}/configuracion`);
    return res.data;
}

export async function actualizarConfiguracion(cambios) {
    const res = await axios.patch(`${BASE_URL}/configuracion`, cambios);
    return res.data;
}

// ─── FOLIOS (numeración de oficios) ───
// categoria es 'general' o 'memorandums' — cada una tiene su propio
// contador y sus propias reservas, totalmente independientes.

// Toma el siguiente número y AVANZA el contador de una vez — "gasta"
// el folio, no es solo consultar cuál sigue.
export async function consumirSiguienteFolio(categoria) {
    const config = await getConfiguracion();
    if (!config.folio[categoria])
        config.folio[categoria] = { actual: 0, reservados: [] };
    config.folio[categoria].actual = (config.folio[categoria].actual || 0) + 1;
    await actualizarConfiguracion(config);
    return {
        numero: config.folio[categoria].actual,
        anio: config.folio.anio,
        prefijo: config.folio.prefijo_default,
    };
}

// Adelanta el contador "cantidad" folios y los guarda uno por uno
// como reservados (no como rango) — cada uno con su propio estado
// usado/libre.
export async function reservarFolios(categoria, cantidad) {
    const config = await getConfiguracion();
    if (!config.folio[categoria])
        config.folio[categoria] = { actual: 0, reservados: [] };
    const cat = config.folio[categoria];
    if (!cat.reservados) cat.reservados = [];
    for (let i = 0; i < cantidad; i++) {
        cat.actual += 1;
        cat.reservados.push({ numero: cat.actual, usado: false });
    }
    await actualizarConfiguracion(config);
    return config.folio;
}

// Marca (o desmarca) un folio reservado como usado — desde la
// pantalla de Folio a mano, o automático al asignarlo a un documento.
export async function marcarFolioReservado(categoria, numero, usado) {
    const config = await getConfiguracion();
    const folio = config.folio[categoria]?.reservados?.find(
        (r) => r.numero === numero,
    );
    if (folio) folio.usado = usado;
    await actualizarConfiguracion(config);
    return config.folio;
}

// Reinicia el contador de una categoría a 0 y borra sus reservas —
// irreversible, normalmente solo al iniciar un año nuevo.
export async function reiniciarContadorFolio(categoria) {
    const config = await getConfiguracion();
    config.folio[categoria] = { actual: 0, reservados: [] };
    await actualizarConfiguracion(config);
    return config.folio;
}

