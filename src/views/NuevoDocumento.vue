<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlantilla, buscarAlumno, buscarDocente, buscarEgresado, agregarDocumento, getFirmantes, getDocentes,getGrados, getDestinatarios, getDocumentoPorId, actualizarDocumento, getBitacoraPorId, finalizarBitacora } from '../services/api.js'
import { useFolio } from '../composables/UseFolio.js'
import { useTextoDocumento } from '../composables/useTextoDocumento.js'
import { getConfiguracion } from '../services/api.js'
// import headerImg from '@/assets/images/logo-encabezado.png'
// import pieImg from '@/assets/images/pie.png'
import { useSesion } from '@/composables/UseSesion.js'
import { formatearFolio, imprimirConNombre, folioRealDe } from '@/utils/folio.js'
import { useMemosJuntos } from '@/composables/useMemosJuntos.js'
import { useImagenesDocumento } from '../composables/useImagenesDocumento.js'
import { useFirmasDocumento } from '../composables/useFirmasDocumento.js'

// Formularios de cada tipo de documento (components/Documentos/).
import DatosDocumento from '@/components/Documentos/DatosDocumento.vue'
import BuscarDocente from '@/components/Documentos/BuscarDocente.vue'
import PieDocumento from '@/components/Documentos/PieDocumento.vue'
import TipoComision from '@/components/Documentos/Comision/TipoComision.vue'
import ComisionExterna from '@/components/Documentos/Comision/ComisionExterna.vue'
import ComisionInterna from '@/components/Documentos/Comision/ComisionInterna.vue'
import TipoMemorandum from '@/components/Documentos/memorandum/TipoMemorandum.vue'
import CompactacionHorario from '@/components/Documentos/memorandum/CompactacionHorario.vue'
import SolventacionFaltas from '@/components/Documentos/memorandum/SolventacionFaltas.vue'
import TipoServicioAlumno from '@/components/Documentos/alumnos/TipoServicioAlumno.vue'
import BuscarAlumno from '@/components/Documentos/alumnos/BuscarAlumno.vue'
import DatosAlumnoDocumento from '@/components/Documentos/alumnos/DatosAlumnoDocumento.vue'
import NombreProyectoPrograma from '@/components/Documentos/alumnos/NombreProyectoPrograma.vue'
import FechasServicio from '@/components/Documentos/alumnos/FechasServicio.vue'
import LiberacionProyecto from '@/components/Documentos/alumnos/LiberacionProyecto.vue'
import RevisionTesis from '@/components/Documentos/alumnos/RevisionTesis.vue'
import FormularioTutorias from '@/components/Documentos/tutorias/FormularioTutorias.vue'
import FormularioOtros from '@/components/Documentos/otros/FormularioOtros.vue'
import TipoServicioMantenimiento from '@/components/Documentos/mantenimiento/TipoServicioMantenimiento.vue'
import FormularioMantenimiento from '@/components/Documentos/mantenimiento/FormularioMantenimiento.vue'
import { enCorreccion } from '@/utils/estadoDocumento.js'
import { fotoDeEstilo, estiloDe, variablesDeEstilo } from '@/utils/estiloDocumento.js'
import { fechaConBarras, fechaHoy } from '@/utils/fechas.js'

const config = ref(null)
const { headerImgActual, pieImgActual } = useImagenesDocumento(config)

const CIUDAD_FECHA = 'Chetumal, Quintana Roo,'

const { fechaATexto, rangoFechasATexto, diasATexto } = useTextoDocumento()




const route = useRoute()
const router = useRouter()
const { usuarioActivo, getUsuarioActivo } = useSesion()

const tipo = route.params.tipo
const idEdicion = route.params.id || null
const bitacoraId = route.query.bitacoraId || null
const tareaBitacora = ref(null)
const subtipo = ref('')
const plantilla = ref(null)
const cargando = ref(false)
const documentoGuardado = ref(false)
const docOriginal = ref(null) // el documento tal como estaba antes de editarlo
const documentoIdSegundo = ref(null)

// Al editar un memo que es parte de un par: su pareja, solo para el
// aviso que reemplaza a la casilla de "2 incidencias".
const parejaEdicion = ref(null)

const textoParejaEdicion = computed(() => {
    if (!parejaEdicion.value || !config.value) return ''
    return folioRealDe(parejaEdicion.value, config.value.folio.prefijo_default, config.value.folio.anio) || parejaEdicion.value.folio
})

// Formato de la vista previa (y de lo que se imprime): al editar, el
// del propio documento; al crear, el actual de la configuración.
const estiloDocumento = computed(() => variablesDeEstilo(estiloDe(docOriginal.value, config.value)))

// Decide a dónde va una Comisión Externa al editar: si nunca se
// rechazó, a la Subdirectora por primera vez; si ya se rechazó, se
// reenvía a ella; si edita Secretaria/Apoyo, siempre al Jefe de Depto.
const destinoAlGuardarEdicion = computed(() => {
    const esComisionConCadena = subtipo.value === 'comision-externa' ||
        (subtipo.value === 'comision-interna' && campos.value.para_jefe_depto)
    if (!esComisionConCadena) return null
    if (usuarioActivo?.rol !== 'admin') {
        return {
            estado: 'pendiente_jefeDepto',
            avisoAntes: 'Al guardar, se envía al Jefe de Depto para su revisión.',
            mensajeDespues: 'Documento corregido y enviado al Jefe de Depto para revisión',
            rutaDespues: '/bitacorasecapo'
        }
    }
    const yaFueRechazado = !!docOriginal.value?.rechazadoPor
    return {
        estado: 'pendiente_subdirectora',
        avisoAntes: yaFueRechazado
            ? 'Al guardar, vuelve a enviarse a la Subdirectora.'
            : 'Al guardar, se enviará a la Subdirectora para revisión.',
        mensajeDespues: yaFueRechazado
            ? 'Documento corregido y reenviado a la Subdirectora'
            : 'Documento corregido y enviado a la Subdirectora',
        rutaDespues: '/bitacora'
    }
})

function camposIniciales() {
    return {
        fecha_documento: fechaHoy(),
        numero_oficio: '',
        grado_docente: '',
        nombre_destinatario: '',
        sexo_destinatario: '',
        ciudad_destino: '',
        motivo: '',
        fecha: '',
        hora_entrada: '',
        hora_salida: '',
        nombre_solicitante: '',
        numero_control: '',
        nombre_estudiante: '',
        carrera: '',
        nombre_proyecto: '',
        nombre_programa: '',
        fecha_inicio: '',
        fecha_fin: '',
        nombre_asesor: '',
        nombre_revisor: '',
        nombre_revisor2: '',
        grado_asesor: '',
        grado_revisor: '',
        grado_revisor2: '',
        hash_asesor: '',
        hash_revisor: '',
        hash_revisor2: '',
        detalle_egresado: '',
        total_dias: '',
        texto_libre: '',
        nombre_curso: '',
        lugar_evento: '',
        horario: '',
        producto: '',
        tipo_actividad: '',
        lugar_especifico: '',
        para_jefe_depto: false,
        horario_inicio: '',
        horario_fin: '',
        ccp_destinos: tipo === 'mantenimiento'
            ? ['Departamento de Planeación Programación y Presupuestación', 'Área Solicitante']
            : [],
        ccp_iniciales: '',
        tipo_servicio: '',
        categoria_mantenimiento_equipo: false,
        categoria_centro_computo: false,
        area_solicitante: 'Sistemas y Computación',
        nombre_solicitante_mant: '',
        fecha_solicitud_mant: '',
        descripcion_servicio: '',
        motivo_proveedor_externo: '',
        categoria_recursos_materiales: false,
        puesto_destinatario: ''
    }
}

const campos = ref(camposIniciales())

const busquedaPersona = ref('')
const sugerencias = ref([])
const mostrarSugerencias = ref(false)

// Personas para "¿quién captura?" de Comisión — de la colección
// firmantes, incluye a quienes solo elaboran (firma:false).
const listaFirmantes = ref([])
const listaDocentes = ref([])
const listaDestinatarios = ref([])
const listaGrados = ref([])

const {
    firmaElectronica,
    qrFirma,
    enlaceDriveFirma,
    archivoDriveFirma,
    documentoIdActual,
    firmasLiberacion,

    sugerenciasFirmantes,
    campoFirmanteActivo,
    buscarFirmantesLiberacion,
    seleccionarFirmanteLiberacion,

    firmarDocumentoGuardado,
    firmarYSubirDocumentoEspecial
} = useFirmasDocumento({
    tipo,
    subtipo,
    campos,
    listaFirmantes,
    listaDocentes
})
// Busca por "clave" (identificador estable) — único lugar para datos
// de un firmante, tanto en la firma como en "¿quién captura?".
function buscarPorClave(clave) {
    const firmante = listaFirmantes.value.find(
        persona =>
            String(persona.clave || '').trim().toLowerCase() ===
            String(clave || '').trim().toLowerCase()
    )

    return firmante || null
}

// Mismo mecanismo, para destinatarios (a quién va dirigido el oficio).
function buscarDestinatarioPorClave(clave) {
    return listaDestinatarios.value.find(p => p.clave === clave) || null
}


// Solicitante de Mantenimiento: el Jefe de Depto. tal como está en
// Firmantes (clave jefe_depto). Si cambia la persona, basta con editarlo ahí.
function nombreJefeDepto() {
    const jefe = buscarPorClave('jefe_depto')
    return jefe ? [jefe.grado, jefe.nombre].filter(Boolean).join(' ') : ''
}

// Convierte una persona al formato que usan los checkboxes.
function aOpcionCcp(persona) {
    if (!persona) return null
    return { id: persona.id, etiqueta: `${persona.puesto} (${persona.nombre})`, iniciales: persona.iniciales }
}

// Jefe de Depto + quien elabora — se repite en todos los documentos
// que NO son Comisión Externa (siempre firma Jefe, nunca Director).
const personasJefeDeptoYElaboran = computed(() => {
    const jefeDepto = aOpcionCcp(buscarPorClave('jefe_depto'))
    const elaboran = listaFirmantes.value
        .filter(p => p.firma === false)
        .map(aOpcionCcp)
    return [jefeDepto, ...elaboran].filter(Boolean)
})

const personasComisionCcp = computed(() => {
    if (subtipo.value === 'comision-interna') { // interna: mismo conjunto que el resto de documentos
        return personasJefeDeptoYElaboran.value
    }
    if (subtipo.value === 'comision-externa') { // externa: Director + Subdirectora + el resto
        const director = aOpcionCcp(buscarPorClave('director'))
        const subdirectora = aOpcionCcp(buscarPorClave('subdirectora'))
        return [director, subdirectora, ...personasJefeDeptoYElaboran.value].filter(Boolean)
    }
    return []
})

watch(subtipo, async (val) => {
    if (val) {
        plantilla.value = await getPlantilla(val)
    }
})


function limpiarFormulario() {
    campos.value = camposIniciales()
    campos.value.nombre_solicitante_mant = nombreJefeDepto()

    const eranDos = combinarIncidencias.value
    limpiarCombo()
    combinarIncidencias.value = eranDos
    
    busquedaPersona.value = ''
    sugerencias.value = []
    mostrarSugerencias.value = false
    documentoGuardado.value = false 

                    
    
}



// Todos comparten el contador 'general' excepto Memorándum (aparte)
// y Tutorías (no consume folio automático aquí, se llena a mano).
const TIPOS_FOLIO_GENERAL = [
    'comision', 'liberacion-proyecto',
    'aceptacion', 'terminacion',
    'revision-tesis', 'otros', 'mantenimiento',
]
const categoriaFolio = computed(() => {
    if (TIPOS_FOLIO_GENERAL.includes(tipo)) return 'general'
    if (tipo === 'memorandum') return 'memorandums'
    return null
})
// Selector de folio automático/reservado — ver useFolio.js. Al
// editar, el número ya asignado no se toca, solo se puede corregir.
const { folioSeleccionado, mostrarReservados, folioMostradoTexto, reservadosConTexto, resolverNumeroFolio } = useFolio(categoriaFolio, config)

const {
    combinarIncidencias, motivo2, fecha2,
    folioSeleccionado2, mostrarReservados2, folioMostradoTexto2, reservadosConTexto2,
    resolverNumeroFolio2, guardarSegundoYVincular,limpiarCombo, 
} = useMemosJuntos(categoriaFolio, config, folioSeleccionado)



onMounted(async () => {
    config.value = await getConfiguracion()


    // Noto Sans se importa localmente en main.js (@fontsource).

    // Modo editar: carga el documento guardado, combinado con
    // camposIniciales() por si le faltan campos agregados después.
    if (idEdicion) {
        docOriginal.value = await getDocumentoPorId(idEdicion)
        if (docOriginal.value.subtipoGuardado) subtipo.value = docOriginal.value.subtipoGuardado
        campos.value = { ...camposIniciales(), ...(docOriginal.value.campos || {}) }
        // busquedaPersona es aparte de campos, hay que restaurarla
        // igual o se ve vacía aunque el dato sí esté guardado.
        busquedaPersona.value = campos.value.numero_control || campos.value.nombre_destinatario || ''
        // Memo de un par: se trae la pareja solo para avisar con su folio.
        if (docOriginal.value.vinculadoCon) {
            parejaEdicion.value = await getDocumentoPorId(docOriginal.value.vinculadoCon).catch(() => null)
        }
    }

    if (!idEdicion && route.query.subtipo) subtipo.value = String(route.query.subtipo)
    // Si viene de una tarea de Bitácora, solo es referencia — no
    // precarga campos del formulario.
    if (bitacoraId) {
        tareaBitacora.value = await getBitacoraPorId(bitacoraId)
    }

    // Comisión/Memorándum/Aceptación/Terminación tienen subtipo — su
    // plantilla real se resuelve en el watch(subtipo) de abajo.
    if (!['comision', 'memorandum', 'aceptacion', 'terminacion'].includes(tipo)) {
        plantilla.value = await getPlantilla(tipo)
    }

    listaGrados.value = await getGrados()
    listaFirmantes.value = await getFirmantes()
    listaDocentes.value = await getDocentes()
    listaDestinatarios.value = await getDestinatarios()
  
    if (!campos.value.nombre_solicitante_mant) campos.value.nombre_solicitante_mant = nombreJefeDepto()
})


const tiposAlumno = ['aceptacion', 'terminacion', 'liberacion-proyecto']

async function buscarEnBD(query) {
    if (query.length < 2) {
        sugerencias.value = []
        mostrarSugerencias.value = false
        return
    }
    if (tiposAlumno.includes(tipo)) {
        sugerencias.value = await buscarAlumno(query)
    } else if (tipo === 'revision-tesis') {
        sugerencias.value = await buscarEgresado(query)
    } else {
        sugerencias.value = await buscarDocente(query)
    }
    mostrarSugerencias.value = sugerencias.value.length > 0
}

function seleccionarPersona(persona) {
    if (persona.numero_control) {
        campos.value.numero_control = persona.numero_control
        campos.value.nombre_estudiante = persona.nombre
        campos.value.carrera = persona.carrera || ''
        busquedaPersona.value = persona.numero_control
    } else {
        campos.value.nombre_destinatario = persona.nombre
        campos.value.nombre_solicitante = persona.nombre
        campos.value.sexo_destinatario = persona.sexo || ''
        if (persona.abreviatura) campos.value.grado_docente = persona.abreviatura
        busquedaPersona.value = persona.nombre
    }
    sugerencias.value = []
    mostrarSugerencias.value = false
}


const notaCcp = computed(() => {
    const partes = campos.value.ccp_destinos || []

    if (partes.length === 0 && !campos.value.ccp_iniciales) return ''

    const lineas = partes.map((p, i) => i === 0 ? `C.c.p. ${p}` : p)
    if (campos.value.ccp_iniciales) lineas.push(campos.value.ccp_iniciales)

    return lineas.map(l => `<div>${l}</div>`).join('')
})


function numeroOficioCompleto() {
    const anio = config.value?.folio.anio || new Date().getFullYear()
    const prefijo = config.value?.folio.prefijo_default || 'P'
    return formatearFolio(campos.value.numero_oficio, prefijo, anio)
}

// En MAYÚSCULAS en todos los tipos excepto memorándum.
const CAMPOS_MAYUSCULAS = ['nombre_estudiante', 'nombre_destinatario', 'nombre_solicitante', 'carrera', 'nombre_proyecto']

const vistaPrevia = computed(() => {
    if (!plantilla.value?.cuerpo) return ''
    let html = plantilla.value.cuerpo
    for (const [clave, valor] of Object.entries(campos.value)) {
        const enMayusculas = tipo !== 'memorandum' && CAMPOS_MAYUSCULAS.includes(clave) && typeof valor === 'string'
        let valorFinal = enMayusculas ? valor.toUpperCase() : valor
        // \n de un <textarea> no se ve en HTML, se convierte a <br>.
        if (typeof valorFinal === 'string') valorFinal = valorFinal.replaceAll('\n', '<br>')
        html = html.replaceAll(`{${clave}}`, valorFinal || '')
    }
    html = html.replaceAll('{fecha_texto}', fechaATexto(campos.value.fecha))
    html = html.replaceAll('{rango_fechas}', rangoFechasATexto(campos.value.fecha_inicio, campos.value.fecha_fin))
    html = html.replaceAll('{dias_texto}', diasATexto(campos.value.fecha_inicio, campos.value.fecha_fin))
    html = html.replaceAll('{fecha_inicio_texto}', fechaATexto(campos.value.fecha_inicio))
    html = html.replaceAll('{fecha_fin_texto}', fechaATexto(campos.value.fecha_fin))


    const lugarTexto = campos.value.lugar_especifico
        ? `, ${campos.value.lugar_especifico}`
        : ''
    html = html.replaceAll('{lugar_texto}', lugarTexto)

    const comisionadoTexto = campos.value.sexo_destinatario === 'F' ? 'comisionada'
        : campos.value.sexo_destinatario === 'M' ? 'comisionado'
            : 'comisionado(a)'
    html = html.replaceAll('{comisionado_texto}', comisionadoTexto)
    const articuloC = campos.value.sexo_destinatario === 'F' ? 'la' : 'el'
    html = html.replaceAll('{articulo_c}', articuloC)
    const nombreDocente = tipo !== 'memorandum'
        ? (campos.value.nombre_destinatario || '').toUpperCase()
        : (campos.value.nombre_destinatario || '')
    html = html.replaceAll('{nombre_docente_completo}',
        `${campos.value.grado_docente} ${nombreDocente}`.trim())
    const horarioTexto = (campos.value.horario_inicio && campos.value.horario_fin)
        ? `, en el horario de ${campos.value.horario_inicio} a ${campos.value.horario_fin} hrs`
        : ''
    html = html.replaceAll('{horario_texto}', horarioTexto)
    return html
})

const numeroOficioResuelto2 = ref('')
const vistaPreviaSegundaIncidencia = computed(() => {
    if (!combinarIncidencias.value || !plantilla.value?.cuerpo) return ''
    const articuloC = campos.value.sexo_destinatario === 'F' ? 'la' : 'el'
    const cuerpo = plantilla.value.cuerpo
        .replaceAll('{articulo_c}', articuloC)
        .replaceAll('{nombre_solicitante}', campos.value.nombre_solicitante || '')
        .replaceAll('{motivo}', (motivo2.value || '').replaceAll('\n', '<br>'))

    const jefe = buscarPorClave('jefe_depto')
    const jefeRH = buscarDestinatarioPorClave('jefe_recursos_humanos')
    const fechaTexto = fecha2.value ? fechaConBarras(fecha2.value) : 'DD/MM/AAAA'

    return `
        <div class="w-100 mb-3 pb-2 encabezado-doc">
            <img src="${headerImgActual.value}" class="header-doc-img" alt="Encabezado Institucional SEP TecNM">
        </div>
        <div class="d-flex justify-content-between mb-3">
            <div class="texto-destinatario">
                <strong>${jefeRH?.grado || ''} ${jefeRH?.nombre || ''}</strong><br>
                <strong>${jefeRH?.puesto || ''}</strong>
            </div>
            <div class="text-end texto-encabezado">
                ${CIUDAD_FECHA} <span class="fecha-resaltada">${fechaTexto}</span><br>
                <strong>MEMORANDUM NO: ${formatearFolio(numeroOficioResuelto2.value, config.value?.folio.prefijo_default || 'P', config.value?.folio.anio || new Date().getFullYear())}</strong>
            </div>
        </div>
        <div class="texto-cuerpo">${cuerpo}</div>
        <div class="mt-4 texto-firma">
            <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
            <div class="texto-lema">Excelencia en Educación Tecnológica®</div>
            <div class="texto-lema-secundario">Cultura, Ciencia y Tecnología para la Superación de México®</div>
            <br><br>
            <strong>${jefe?.grado || ''} ${jefe?.nombre || ''}</strong><br>
            <strong>${jefe?.puesto || ''}</strong><br>
        </div>
        ${notaCcp.value ? `<div class="texto-ccp-wrapper"><span class="texto-ccp">${notaCcp.value}</span></div>` : ''}
        <div class="w-100 text-center pie-fijo" style="font-size: 10px; line-height: 1.3;">
            <img src="${pieImgActual.value}" alt="Pie de página" class="pie-doc-img">
        </div>
    `
})

async function guardarEnHistorial() {
    if (documentoGuardado.value) {
        return idEdicion || documentoIdActual.value
    }
 
    try {
        // Resuelve el número de oficio ANTES de armar el HTML final,
        // solo al crear (avanza el contador o marca el reservado usado).
        if (!idEdicion && categoriaFolio.value) {
            campos.value.numero_oficio = await resolverNumeroFolio()
            // Espera a que la vista previa se repinte con el número
            // ya resuelto, si no el innerHTML captura el valor viejo.
            await nextTick()
        }

        const htmlCompleto = document.querySelector('.documento-carta')?.innerHTML || vistaPrevia.value
        const requiereAprobacion = subtipo.value === 'comision-externa' ||
            (subtipo.value === 'comision-interna' && campos.value.para_jefe_depto)
        const usuarioActivo = getUsuarioActivo()

        // tipoRuta/subtipoGuardado/campos permiten reabrir para editar.
        const datosDocumento = {
            tipo: subtipo.value || tipo,
            asunto: campos.value.motivo || campos.value.nombre_proyecto ||
                campos.value.nombre_programa || campos.value.nombre_curso ||
                plantilla.value?.asunto || tipo,
            cuerpo: htmlCompleto,
            tipoRuta: tipo,
            subtipoGuardado: subtipo.value,
            campos: JSON.parse(JSON.stringify(campos.value))
        }

        let documentoId = idEdicion
        let datosCompletos = null

        if (idEdicion) {
            // El reseteo depende del tipo y quién edita (ver
            // destinoAlGuardarEdicion) — si no es Comisión Externa,
            // el estado se queda igual, solo se limpia la revisión.
            const actualizacion = { ...datosDocumento }
            const destino = destinoAlGuardarEdicion.value
            // Se limpia siempre, o la marca de "corregir" se queda
            // pegada aunque ya se haya reenviado.
            const esSuyoDesdeAntes = String(docOriginal.value?.creadoPor) === String(usuarioActivo?.id)
            if (usuarioActivo?.rol === 'admin') {
                // Su propio documento se queda neutral — solo se
                // marca aprobado si edita el trabajo de alguien más.
                actualizacion.revisionJefeDepto = esSuyoDesdeAntes ? '' : 'aprobado'
            } else {
                actualizacion.revisionJefeDepto = 'sin_revisar'
            }
            actualizacion.observacionJefeDepto = ''
            // Se limpia siempre al editar, o el motivo de cancelación
            // se queda pegado aunque ya haya avanzado a Autorizado.
            actualizacion.motivoCancelacion = ''
            if (usuarioActivo?.rol !== 'admin') {
                // Si edita Secretaria/Apoyo, ya no se reenvía solo —
                // depende de que ella use "Enviar a revisión".
                actualizacion.solicitoRevision = false

                // También si venía de una corrección: tiene que volver
                // a enviarla, o el Jefe nunca se entera.
                actualizacion.editadoTrasEnvio = !!(docOriginal.value?.solicitoRevision || docOriginal.value?.revisionJefeDepto === 'aprobado' || enCorreccion(docOriginal.value))
            }
            // Corrección resuelta (la hizo ella o el Admin mismo): se
            // apaga la marca vieja y su nota.
            actualizacion.esperandoCorreccionSecretaria = false
            actualizacion.notaAlCompartir = ''

            if (destino) {
                actualizacion.estado = destino.estado
                actualizacion.observaciones = ''
                actualizacion.rechazadoPor = ''
            } else if (docOriginal.value?.estado === 'cancelado') {
                // Editar un doc normal cancelado lo regresa a neutral
                // — no hace falta un botón "Reactivar" aparte.
                actualizacion.estado = 'generado'
            }
            await actualizarDocumento(idEdicion, actualizacion)
        } else {
            // "generado", no "autorizado" — ese se reserva para
            // cuando el Director autoriza una Comisión Externa.
            let estadoInicial = 'generado'
            if (requiereAprobacion) {
                // Secretaria/Apoyo → pasa por el Jefe de Depto primero;
                // Jefe/Admin → directo a la Subdirectora.
                estadoInicial = usuarioActivo?.rol !== 'admin' ? 'pendiente_jefeDepto' : 'pendiente_subdirectora'
            }
            datosCompletos = {
                ...datosDocumento,
                creadoPor: usuarioActivo?.id,
                estado: estadoInicial,
                observaciones: '',
                motivoCancelacion: '',
                revisionJefeDepto: 'sin_revisar',
                observacionJefeDepto: '',
                solicitoRevision: false,
                // Foto del formato vigente: el documento se verá siempre
                // así aunque después cambie la configuración.
                estilo: fotoDeEstilo(config.value?.estilo),
            }
            const creado = await agregarDocumento(datosCompletos)
            documentoId = creado?.id
        }

        // Solventación de Faltas con 2 incidencias: se guarda un
        // segundo documento independiente, con su propio folio.
        if (!idEdicion && combinarIncidencias.value && subtipo.value === 'memorandum-solventacion-faltas') {
            const numeroOficio2 = await resolverNumeroFolio2()
            numeroOficioResuelto2.value = numeroOficio2
            documentoIdSegundo.value = await guardarSegundoYVincular(documentoId,datosCompletos,vistaPreviaSegundaIncidencia.value,numeroOficio2)
        }

        // Si viene de una tarea, se marca finalizada y se liga.
        if (bitacoraId && documentoId) {
            await finalizarBitacora(bitacoraId, documentoId)
        }

        documentoGuardado.value = true
        documentoIdActual.value = documentoId
        return documentoId

    } catch (e) {
        // console.error(e)
        alert('Error al generar el documento')
        return false
    } finally {
        cargando.value = false
    }
}

async function firmarDocumentoGenerado(
    documentoId,
    htmlPersonalizado = null
) {
    documentoIdActual.value = documentoId

    if (!documentoGuardado.value) {
        throw new Error('No existe el documento guardado para firmar.')
    }

    return await firmarYSubirDocumentoEspecial(documentoId,htmlPersonalizado)
}

function avisarYRedirigir() {
    const destino = destinoAlGuardarEdicion.value
    if (idEdicion && destino) {
        alert(destino.mensajeDespues)
        router.push(destino.rutaDespues)
    } else if (bitacoraId) {
        alert(idEdicion
            ? 'Documento corregido y tarea marcada como finalizada'
            : 'Documento generado y tarea marcada como finalizada')
        // Admin regresa a Bitácora, el resto a BitacoraSecApo.
        router.push(usuarioActivo?.rol === 'admin' ? '/bitacora' : '/bitacorasecapo')
    } else if (idEdicion) {
        alert('Documento actualizado correctamente')
        router.push(usuarioActivo?.rol === 'admin' ? '/bitacora' : '/bitacorasecapo')
    } else {
        alert('Documento generado correctamente')
        router.push(usuarioActivo?.rol === 'admin' ? '/bitacora' : '/bitacorasecapo')
    }
}

function debeFirmarDocumentoAhora() {

    // Comisión Externa nunca se firma al crear.
    if (subtipo.value === 'comision-externa') {
        return false
    }

    // Comisión Interna para el Jefe de Departamento:
    // Admin SOLO crea el documento y lo manda a la Subdirectora.
    // La firma se genera cuando la Subdirectora autoriza.
    if (
        subtipo.value === 'comision-interna' &&
        campos.value.para_jefe_depto === true
    ) {
        return false
    }

    // Todos los demás documentos conservan
    // su funcionamiento actual.
    return true
}

async function generarDocumento() {
    try {
        cargando.value = true

        const documentoId = await guardarEnHistorial()

        if (!documentoId) {
            throw new Error(
                'No se obtuvo el ID del documento guardado.'
            )
        }

        if (debeFirmarDocumentoAhora()) {

        //Memorandum 1 principal
            await firmarDocumentoGenerado(documentoId)

        //Memorandum 2
            // Solamente para Solventación de Faltas
            // con más de una incidencia
            if (
                combinarIncidencias.value &&
                subtipo.value === 'memorandum-solventacion-faltas' &&
                documentoIdSegundo.value
            ) {
                await firmarDocumentoGenerado(
                    documentoIdSegundo.value,
                    vistaPreviaSegundaIncidencia.value
                )
            }
        }

        avisarYRedirigir()

    } catch (error) {

        console.error(
            'Error al generar y firmar documento:',
            error
        )

        alert(
            error?.message ||
            'Error al generar y firmar el documento.'
        )

    } finally {
        cargando.value = false
    }
}


async function imprimirDocumento() {
    try {
        cargando.value = true

        const documentoId = await guardarEnHistorial()

        if (!documentoId) {
            throw new Error('No se obtuvo el ID del documento guardado.')
        }

        if (debeFirmarDocumentoAhora()) {
            await firmarDocumentoGenerado(documentoId)
        }

        await nextTick()

        window.print()

        avisarYRedirigir()
        
    } catch (error) {
        console.error('Error al generar, firmar e imprimir:', error)

        alert(
            error?.message ||
            'Error al generar y firmar el documento.'
        )
    } finally {
        cargando.value = false
    }
}
</script>

<template>
    <AdminLayout mostrarVolver>
        <div class="row g-4 align-items-start">

            <!-- COLUMNA IZQUIERDA: FORMULARIO -->
            <div class="col-12 col-lg-5">
                <div class="panel p-4">



                    <h5 class="mb-4">
                        <i class="bi bi-file-earmark-plus me-2"></i>
                        {{ plantilla?.nombre || 'Nuevo Documento' }}
                    </h5>

                    <div v-if="idEdicion" class="alert alert-warning py-2 mb-3">
                        <i class="bi bi-pencil-square me-1"></i>
                        <template v-if="destinoAlGuardarEdicion">
                            Estás corrigiendo un documento ya existente. {{ destinoAlGuardarEdicion.avisoAntes }}
                        </template>
                        <template v-else>
                            Estás corrigiendo un documento ya existente. Al guardar, se actualizan los cambios{{
                                bitacoraId ? ' y la tarea se vuelve a marcar como Finalizado' : '' }}.
                        </template>
                    </div>

                    <div v-if="tareaBitacora" class="alert alert-info py-2 mb-3">
                        <p class="mb-1 fw-semibold"><i class="bi bi-clipboard-check me-1"></i>Tarea asignada — {{
                            tareaBitacora.tipo }}</p>
                        <p class="mb-1 small">
                            Fecha: {{ tareaBitacora.fecha }}
                            <span v-if="tareaBitacora.fechaCaducidad && tareaBitacora.fechaCaducidad !== '—'">
                                · Vence: {{ tareaBitacora.fechaCaducidad }}</span>
                        </p>
                        <p class="mb-0 small">Descripción: "{{ tareaBitacora.descripcion }}"</p>
                    </div>

                    <!-- ── TUTORÍAS ── -->
                    <!-- Solo fecha/oficio/nombre — grupos se editan en Tutorías. -->
                    <template v-if="tipo === 'tutorias'">
                        <FormularioTutorias :campos="campos" :cargando="cargando" @guardar="generarDocumento" />
                    </template>

                    <!-- ── COMISIÓN ── -->
                    <template v-if="tipo === 'comision'">
                        <TipoComision v-model="subtipo" />
                        <template v-if="subtipo">
                            <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                                :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                                v-model:folio-seleccionado="folioSeleccionado"
                                v-model:mostrar-reservados="mostrarReservados" fecha-primero />
                            <BuscarDocente v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                                :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                                @seleccionar="seleccionarPersona" />
                            <ComisionExterna v-if="subtipo === 'comision-externa'" :campos="campos" />
                            <ComisionInterna v-if="subtipo === 'comision-interna'" :campos="campos" />
                            <PieDocumento :campos="campos" :personas="personasComisionCcp" :cargando="cargando"
                                @generar="generarDocumento" />
                        </template>
                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona el tipo de comisión para continuar</p>
                        </div>
                    </template>

                    <!-- ── MEMORÁNDUM ── -->
                    <template v-else-if="tipo === 'memorandum'">
                        <TipoMemorandum v-model="subtipo" />
                        <template v-if="subtipo">
                            <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                                :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                                v-model:folio-seleccionado="folioSeleccionado"
                                v-model:mostrar-reservados="mostrarReservados" fecha-primero />
                            <BuscarDocente v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                                :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                                @seleccionar="seleccionarPersona" />
                            <CompactacionHorario v-if="subtipo === 'memorandum-compactacion-horario'"
                                :campos="campos" />
                            <SolventacionFaltas v-if="subtipo === 'memorandum-solventacion-faltas'" :campos="campos"
                                :id-edicion="idEdicion" :texto-pareja-edicion="textoParejaEdicion"
                                v-model:combinar-incidencias="combinarIncidencias"
                                :folio-mostrado-texto2="folioMostradoTexto2"
                                v-model:folio-seleccionado2="folioSeleccionado2"
                                :reservados-con-texto2="reservadosConTexto2"
                                v-model:mostrar-reservados2="mostrarReservados2" v-model:fecha2="fecha2"
                                v-model:motivo2="motivo2" />
                            <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                                @generar="generarDocumento" />
                        </template>
                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona el tipo de memorándum para continuar</p>
                        </div>
                    </template>

                    <!-- ── ALUMNOS: Residencia y SS (Aceptación / Terminación) ── -->
                    <template v-else-if="tipo === 'aceptacion' || tipo === 'terminacion'">
                        <TipoServicioAlumno v-model="subtipo" :tipo="tipo" />
                        <template v-if="subtipo">
                            <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                                :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                                v-model:folio-seleccionado="folioSeleccionado"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <BuscarAlumno v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                                :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                                @seleccionar="seleccionarPersona" />
                            <DatosAlumnoDocumento :campos="campos" />
                            <NombreProyectoPrograma :campos="campos" :subtipo="subtipo" />
                            <FechasServicio :campos="campos" />
                            <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                                @generar="generarDocumento" />
                        </template>
                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona Residencia o Servicio Social para continuar</p>
                        </div>
                    </template>

                    <!-- ── LIBERACIÓN DE PROYECTO ── -->
                    <template v-else-if="tipo === 'liberacion-proyecto'">
                        <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                            :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                            v-model:folio-seleccionado="folioSeleccionado"
                            v-model:mostrar-reservados="mostrarReservados" fecha-primero />
                        <BuscarAlumno v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                            :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                            @seleccionar="seleccionarPersona" />
                        <DatosAlumnoDocumento :campos="campos" />
                        <LiberacionProyecto
                                :campos="campos"
                                :sugerencias-firmantes="sugerenciasFirmantes"
                                :campo-firmante-activo="campoFirmanteActivo"
                                :buscar-firmantes-liberacion="buscarFirmantesLiberacion"
                                :seleccionar-firmante-liberacion="seleccionarFirmanteLiberacion"
                            />
                        <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                            @generar="generarDocumento" />
                    </template>

                    <!-- ── REVISIÓN DE TESIS ── -->
                    <template v-else-if="tipo === 'revision-tesis'">
                        <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                            :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                            v-model:folio-seleccionado="folioSeleccionado"
                            v-model:mostrar-reservados="mostrarReservados" />
                        <BuscarAlumno v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                            :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                            @seleccionar="seleccionarPersona" />
                        <RevisionTesis :campos="campos" />
                        <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                            @generar="generarDocumento" />
                    </template>

                    <!-- ── OTROS ── -->
                    <template v-else-if="tipo === 'otros'">
                        <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                            :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                            v-model:folio-seleccionado="folioSeleccionado"
                            v-model:mostrar-reservados="mostrarReservados" />
                        <FormularioOtros :campos="campos" :lista-grados="listaGrados" />
                        <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                            @generar="generarDocumento" />
                    </template>

                    <!-- ── MANTENIMIENTO ── (sin "Fecha del documento": usa su encabezado ISO) -->
                    <template v-else-if="tipo === 'mantenimiento'">
                        <TipoServicioMantenimiento :campos="campos" />
                        <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                            :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                            v-model:folio-seleccionado="folioSeleccionado"
                            v-model:mostrar-reservados="mostrarReservados" :con-fecha="false" />
                        <FormularioMantenimiento :campos="campos" />
                        <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                            @generar="generarDocumento" />
                    </template>

                    <button v-if="plantilla || subtipo" class="btn btn-danger w-100 mt-2" @click="limpiarFormulario"
                        type="button">
                        <i class="bi bi-trash me-2"></i>Limpiar formulario
                    </button>

                </div>

            </div>

            <!-- COLUMNA DERECHA: VISTA PREVIA  /src/assets/images/logo-encabezado.png -->
            <div class="col-12 col-lg-7 col-preview-sticky">
                <div class="panel p-4">
                    <h6 class="text-muted mb-3">
                        <i class="bi bi-eye me-2"></i>Vista previa
                    </h6>
                    <div class="preview-scale-outer"
                        :class="{ 'combo-wrapper': combinarIncidencias && subtipo === 'memorandum-solventacion-faltas' }">
                        <div class="bg-white border rounded documento-carta" :style="estiloDocumento">
                            <!-- Encabezado institucional -->
                            <div class="w-100 mb-3 pb-2  encabezado-doc " v-if="tipo !== 'mantenimiento'">
                                <img :src="headerImgActual" class="header-doc-img"
                                    alt="Encabezado Institucional SEP TecNM">
                            </div>



                            <!-- Vista previa normal -->

                            <div v-if="plantilla && tipo !== 'liberacion-proyecto' && tipo !== 'mantenimiento'">

                                <!-- Encabezado alumnos (residencia y SS) -->
                                <template v-if="tipo === 'aceptacion' || tipo === 'terminacion'">
                                    <div class="text-end mb-3 texto-encabezado">
                                        <strong>DEPENDENCIA:</strong> Subdirección Académica.<br>
                                        <strong>SECCIÓN:</strong> Sistemas y Computación.<br>
                                        Oficio No. {{ numeroOficioCompleto() }}<br><br>
                                        {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{
                                            campos.fecha_documento ?
                                                fechaConBarras(campos.fecha_documento)
                                                :
                                                'DD/MM/AAAA' }}</span>
                                    </div>
                                    <!--  -->
                                    <div class="mb-3 text-end texto-asunto">
                                        <strong>ASUNTO: {{ plantilla?.asunto }}</strong>
                                    </div><br />
                                    <div class="mb-3 texto-destinatario">
                                        <strong>{{ buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.grado }}
                                            {{
                                                buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.nombre
                                            }}</strong><br>
                                        <strong>{{ buscarDestinatarioPorClave('jefa_gestion_vinculacion')?.puesto
                                            }}</strong><br>
                                        <strong>PRESENTE</strong>
                                    </div>
                                </template>


                                <!-- Encabezado memorándum -->
                                <template v-else-if="tipo === 'memorandum'">
                                    <div class="d-flex justify-content-between mb-3">
                                        <div class="texto-destinatario">
                                            <strong>{{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.grado }}
                                                {{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.nombre
                                                }}</strong><br>
                                            <strong>{{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.puesto
                                                }}</strong>
                                        </div>
                                        <div class="text-end texto-encabezado">
                                            {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{
                                                campos.fecha_documento ?
                                                    fechaConBarras(campos.fecha_documento) : 'DD/MM/AAAA' }}</span><br>
                                            <strong>MEMORANDUM NO: {{ numeroOficioCompleto() }}</strong>
                                        </div>
                                    </div>
                                </template>

                                <!-- Encabezado comisión, revisión tesis, otros -->
                                <template v-else>
                                    <div class="text-end mb-3 texto-encabezado">
                                        {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{
                                            campos.fecha_documento ?
                                                fechaConBarras(campos.fecha_documento) : 'DD/MM/AAAA' }}</span><br>
                                        Oficio No. {{ numeroOficioCompleto() }}
                                    </div>

                                    <div class="mb-3 texto-destinatario">
                                        <strong v-if="tipo === 'revision-tesis'">A QUIEN CORRESPONDA</strong>
                                        <strong v-else>
                                            {{ campos.grado_docente ? campos.grado_docente + ' ' : '' }}{{
                                                (campos.nombre_destinatario || campos.nombre_solicitante ||
                                                    campos.nombre_estudiante || '[Nombre]').toUpperCase() }}
                                        </strong><br>
                                        <template v-if="campos.puesto_destinatario"><strong>{{
                                            campos.puesto_destinatario
                                                }}</strong><br></template>
                                        <strong v-if="tipo === 'comision'">DOCENTE<br></strong>
                                        <strong>PRESENTE</strong>
                                    </div>
                                </template>

                                <!-- Cuerpo -->
                                <div class="texto-cuerpo" v-html="vistaPrevia">
                                </div>

                                <!-- Firma -->
                                <div class="mt-4 texto-firma">
                                    <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
                                    <div class="texto-lema">
                                        Excelencia en Educación Tecnológica®
                                    </div>
                                    <div class="texto-lema-secundario">
                                        Cultura, Ciencia y Tecnología para la Superación de México®
                                    </div>
                                    <br>

                                    <br>
                                    <template
                                        v-if="subtipo === 'comision-externa' || (subtipo === 'comision-interna' && campos.para_jefe_depto)">
                                        <strong>{{ buscarPorClave(subtipo === 'comision-interna' ? 'subdirectora' :
                                            'director')?.grado }} {{
                                                buscarPorClave(subtipo === 'comision-interna' ? 'subdirectora' :
                                                    'director')?.nombre }}</strong><br>
                                        <strong>{{ buscarPorClave(subtipo === 'comision-interna' ? 'subdirectora' :
                                            'director')?.puesto }}</strong>
                                        <br>
                                    </template>
                                    <template v-else>
                                        <strong>{{ buscarPorClave('jefe_depto')?.grado }} {{
                                            buscarPorClave('jefe_depto')?.nombre }}</strong><br>
                                        <strong>{{ buscarPorClave('jefe_depto')?.puesto }}</strong>
                                        <br>
                                    </template>
                                </div>

                                <div v-if="notaCcp" class="texto-ccp-wrapper">
                                    <span class="texto-ccp" v-html="notaCcp"></span>
                                </div>
                            </div>


                            <!-- Vista previa Liberación de Proyecto -->
                            <div v-else-if="tipo === 'liberacion-proyecto'">

                                <div class="text-end mb-3 texto-encabezado">
                                    {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{
                                        campos.fecha_documento ?
                                            fechaConBarras(campos.fecha_documento) :
                                            'DD/MM/AAAA' }}</span><br>
                                    Oficio No. {{ numeroOficioCompleto() }}
                                </div>
                                <!--  -->
                                <div class="text-end mb-3 texto-asunto">
                                    <strong>Asunto: {{ plantilla?.asunto }}</strong>
                                </div>
                                <br>
                                <div class="mb-3 texto-destinatario">
                                    <strong>{{ buscarDestinatarioPorClave('jefa_division_estudios')?.grado }} {{
                                        buscarDestinatarioPorClave('jefa_division_estudios')?.nombre }}</strong><br>
                                    <strong>{{ buscarDestinatarioPorClave('jefa_division_estudios')?.puesto
                                        }}</strong><br>
                                    <strong>PRESENTE</strong>
                                </div>
                                <p class="mb-3 texto-cuerpo">
                                    Por este medio informo que ha sido liberado el siguiente proyecto para la
                                    titulación
                                    integral:
                                </p>
                                <table class="texto-cuerpo"
                                    style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
                                    <tr>
                                        <td class="doc-celda" style="width:40%;"><strong>Nombre del estudiante y/o
                                                egresado:</strong></td>
                                        <td class="doc-celda">{{ (campos.nombre_estudiante || '—').toUpperCase() }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda"><strong>Carrera:</strong></td>
                                        <td class="doc-celda">{{ (campos.carrera || '—').toUpperCase() }}</td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda"><strong>No. de control:</strong></td>
                                        <td class="doc-celda">{{ campos.numero_control || '—' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda"><strong>Nombre del proyecto:</strong></td>
                                        <td class="doc-celda">{{ (campos.nombre_proyecto || '—').toUpperCase() }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda"><strong>Producto:</strong></td>
                                        <td class="doc-celda">{{ campos.producto || '—' }}</td>
                                    </tr>
                                </table>
                                <div class="text-center mt-3 mb-4 texto-firma">
                                    <strong class="atentamente-spaced">ATENTAMENTE</strong><br><br>
                                    ___________________________________________________<br>
                                    <strong>{{ buscarPorClave('jefe_depto')?.grado }} {{
                                        buscarPorClave('jefe_depto')?.nombre }}</strong><br>
                                    <strong>{{ buscarPorClave('jefe_depto')?.puesto }}</strong>
                                </div>


                                <table class="texto-firma"
                                    style="width:100%; border-collapse:collapse; margin-top:1rem;">
                                    <tr>
                                        <td class="doc-celda" style="width:33%; height:80px; vertical-align:top;">
                                            {{ campos.nombre_asesor || '' }}
                                        </td>
                                        <td class="doc-celda" style="width:33%; height:80px; vertical-align:top;">
                                            {{ campos.nombre_revisor || '' }}
                                        </td>
                                        <td class="doc-celda" style="width:34%; height:80px; vertical-align:top;">
                                            {{ campos.nombre_revisor2 || '' }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda">Nombre y firma del asesor</td>
                                        <td class="doc-celda">*Nombre y firma del revisor</td>
                                        <td class="doc-celda">*Nombre y firma del revisor</td>
                                    </tr>
                                </table>
                                <p class="texto-ccp" style="color:#555; margin-top:4px;">
                                    * Solo aplica para el caso de tesis o tesina.<br>
                                </p>
                                <div v-if="notaCcp" class="texto-ccp-wrapper">
                                    <span class="texto-ccp" v-html="notaCcp"></span>
                                </div>
                            </div>


                            <!-- mantenimiento -->
                            <div v-else-if="tipo === 'mantenimiento'" class="mantenimiento-form texto-cuerpo"
                                style="color: #000;">

                                <!-- ENCABEZADO OFICIAL -->
                                <table
                                    style="width:100%; border-collapse:collapse; margin-bottom:1rem; border:1px solid #000;">
                                    <tr>
                                        <td rowspan="3" class="doc-celda-iso"
                                            style="width:15%; text-align:center; vertical-align:middle;">
                                            <img src="/src/assets/images/itch.png" alt="LOGO"
                                                style="max-width:100%; max-height:140px;" />
                                        </td>

                                        <td rowspan="2" class="doc-celda-iso" style="width:55%; vertical-align:top;">
                                            <strong>Nombre del Documento:</strong> {{
                                                plantilla?.encabezadoIso?.nombreDocumento ||
                                                "Formato para Solicitud de Mantenimiento Correctivo y/o Preventivo Interno o Externo" }}
                                        </td>
                                        <td class="doc-celda-iso" style="width:30%;">
                                            <strong>Fecha de Aprobación:</strong> {{
                                                plantilla?.encabezadoIso?.fechaAprobacion || '22 noviembre 2022' }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda-iso">
                                            <strong>Revisión:</strong> {{ plantilla?.encabezadoIso?.revision || '4' }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="border:1px solid #000; padding:0;">
                                            <table style="width:100%; border-collapse:collapse; border:none;">
                                                <tr>
                                                    <td class="texto-ccp"
                                                        style="width:50%; border-right:1px solid #000; padding:4px; vertical-align:top;">
                                                        <strong>Sistema Integral de Gestión:</strong><br>
                                                        <span
                                                            v-html="plantilla?.encabezadoIso?.sistemaGestion || 'ISO 9001:2015<br>ISO 14001:2015<br>ISO 45001:2018'"></span>
                                                    </td>
                                                    <td class="texto-ccp"
                                                        style="width:50%; padding:4px; vertical-align:top;">
                                                        <strong>Referencia a la Norma:</strong><br>
                                                        <span
                                                            v-html="plantilla?.encabezadoIso?.referenciaNorma || 'ISO 9001:2015: 7.1.3<br>ISO 14001:2015: 8.1'"></span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>

                                        <td class="doc-celda-iso" style="vertical-align:middle;">
                                            <strong>Página 1 de 1</strong>
                                        </td>
                                    </tr>
                                </table>

                                <!-- TÍTULO -->
                                <h5 class="text-center fw-bold my-3 texto-asunto"
                                    style="text-transform:uppercase; letter-spacing:0.5px;">
                                    SOLICITUD MANTENIMIENTO CORRECTIVO Y/O PREVENTIVO
                                </h5>

                                <!-- TABLAS PARALELAS (TIPO SERVICIO Y RECURSOS) -->
                                <div
                                    style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; gap:15px;">

                                    <table style="width:40%; border-collapse:collapse; border:1px solid #000;">
                                        <tr>
                                            <td class="doc-celda-iso">Servicio Interno</td>
                                            <td class="doc-celda-iso"
                                                style="width:30px; text-align:center; font-weight:bold;">
                                                {{ campos.tipo_servicio === 'interno' ? 'X' : '' }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="doc-celda-iso">Servicio externo</td>
                                            <td class="doc-celda-iso" style="text-align:center; font-weight:bold;">
                                                {{ campos.tipo_servicio === 'externo' ? 'X' : '' }}
                                            </td>
                                        </tr>
                                    </table>

                                    <table style="width:55%; border-collapse:collapse; border:1px solid #000;">
                                        <tr>
                                            <td class="doc-celda-iso">Recursos Materiales y Servicios</td>
                                            <td class="doc-celda-iso"
                                                style="width:30px; text-align:center; font-weight:bold;">
                                                {{ campos.categoria_recursos_materiales ? 'X' : '' }}
                                            </td>

                                        </tr>
                                        <tr>
                                            <td class="doc-celda-iso">Mantenimiento de Equipo</td>
                                            <td class="doc-celda-iso"
                                                style="width:30px; text-align:center; font-weight:bold;">
                                                {{ campos.categoria_mantenimiento_equipo ? 'X' : '' }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="doc-celda-iso">Centro de Cómputo</td>
                                            <td class="doc-celda-iso" style="text-align:center; font-weight:bold;">
                                                {{ campos.categoria_centro_computo ? 'X' : '' }}
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- FOLIO -->
                                <div class="texto-encabezado" style="text-align:right; margin-bottom:0.8rem;">
                                    <strong>Folio:</strong> <span
                                        style="border-bottom: 1px solid #000; padding: 0 15px; display:inline-block; min-width:120px;">{{
                                            numeroOficioCompleto() }}</span>
                                </div>

                                <!-- BLOQUE PRINCIPAL DEL FORMATO -->
                                <div style="border:1px solid #000; margin-bottom:1.5rem;">

                                    <!-- Área Solicitante -->
                                    <div style="border-bottom:1px solid #000; padding:6px 8px;">
                                        <strong>Área Solicitante:</strong> {{ campos.area_solicitante }}
                                    </div>

                                    <!-- Nombre y Firma del Solicitante -->
                                    <div style="border-bottom:1px solid #000; padding:6px 8px; min-height:45px;">
                                        <strong>Nombre y Firma del Solicitante:</strong> {{
                                            campos.nombre_solicitante_mant }}
                                    </div>

                                    <!-- Fecha de Solicitud -->
                                    <div style="border-bottom:1px solid #000; padding:6px 8px;">
                                        <strong>Fecha de solicitud:</strong> {{ campos.fecha_solicitud_mant ?
                                            fechaATexto(campos.fecha_solicitud_mant) : '' }}
                                    </div>

                                    <!-- Descripción del Servicio Solicitado -->
                                    <div style="border-bottom:1px solid #000; padding:6px 8px; min-height:160px;">
                                        <strong>Descripción del Servicio Solicitado:</strong>
                                        <div style="white-space:pre-line; margin-top:6px; padding-left:10px;">
                                            {{ campos.descripcion_servicio }}
                                        </div>
                                    </div>

                                    <!-- Descripción del Motivo (Proveedor Externo) -->
                                    <div style="padding:6px 8px; min-height:80px;">
                                        <strong>Descripción del motivo por el cual se solicita proveedor (a)
                                            externo</strong>
                                        <div style="white-space:pre-line; margin-top:6px; padding-left:10px;">
                                            {{ campos.motivo_proveedor_externo }}
                                        </div>
                                    </div>
                                </div>


                                <!-- PIE DE PÁGINA (C.C.P Y LEYENDA) -->
                                <div class="mantenimiento-pie-fijo">
                                    <div v-if="notaCcp" class="texto-ccp" style="line-height: 1.2;" v-html="notaCcp">
                                    </div>
                                    <div class="text-center"
                                        style="font-size:9.5px; font-weight:bold; margin-top:1.5rem;">
                                        Toda copia en PAPEL es un "Documento No Controlado"
                                    </div>
                                </div>

                            </div>

                            <!-- Sin plantilla -->
                            <div v-else class="text-muted text-center py-5">
                                <i class="bi bi-file-earmark" style="font-size:3rem"></i>
                                <p class="mt-2">Selecciona un tipo de documento para ver la vista previa</p>
                            </div>

                            <!-- FIRMA ELECTRÓNICA Y QR -->
                            <div v-if="firmaElectronica" class="firma-electronica-pdf">
                                <div class="firma-electronica-hash">
                                    <strong>Firma electrónica:</strong><br>
                                    {{ firmaElectronica }}
                                </div>

                                <div v-if="qrFirma" class="firma-electronica-qr">
                                    <img :src="qrFirma" alt="Código QR de validación">
                                </div>
                            </div>
                            <!-- Pie de pagina logo -->

                            <div v-if="plantilla && tipo !== 'mantenimiento'" class="w-100 text-center pie-fijo"
                                style="font-size: 10px; line-height: 1.3;">
                                <img :src="pieImgActual" alt="Pie de página" class="pie-doc-img">
                            </div>
                        </div>
                        <div v-if="combinarIncidencias && subtipo === 'memorandum-solventacion-faltas'"
                            class="bg-white border rounded documento-carta combo-segunda-incidencia"
                            :style="estiloDocumento" v-html="vistaPreviaSegundaIncidencia">
                        </div>


                    </div>



                    <div class="d-flex gap-2 mt-3" v-if="plantilla">
                        <button class="btn btn-success btn-sm" @click="imprimirDocumento">
                            <i class="bi bi-printer me-1"></i> Imprimir
                        </button>
                        <button class="btn btn-primary btn-sm" @click="imprimirDocumento">
                            <i class="bi bi-download me-1"></i> Descargar PDF
                        </button>
                    </div>

                </div>




            </div>

        </div>
    </AdminLayout>
</template>

<style scoped>
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
