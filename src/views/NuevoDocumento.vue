<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    getPlantilla, buscarAlumno, buscarDocente, buscarEgresado, agregarDocumento, getFirmantes, getDocentes, getGrados, getDestinatarios, getDocumentoPorId, actualizarDocumento,
    getBitacoraPorId, finalizarBitacora, enviarDocumentoARH
} from '../services/api.js'
import { useFolio } from '../composables/UseFolio.js'
import { useTextoDocumento } from '../composables/useTextoDocumento.js'
import { getConfiguracion } from '../services/api.js'
// import headerImg from '@/assets/images/logo-encabezado.png'
// import pieImg from '@/assets/images/pie.png'
import { useSesion } from '@/composables/UseSesion.js'
import { formatearFolio, imprimirConNombre, folioRealDe, datosFolioDe, camposDeFolio, folioActual } from '@/utils/folio.js'
import { textoSegunSexo } from '@/utils/sexo.js'
import { useMemosJuntos } from '@/composables/useMemosJuntos.js'
import { useImagenesDocumento } from '../composables/useImagenesDocumento.js'
import { useFirmasDocumento } from '../composables/useFirmasDocumento.js'
import { useMantenimientoUnaHoja } from '@/composables/useMantenimientoUnaHoja.js'

// Formularios de cada tipo de documento (components/Documentos/).
import DatosDocumento from '@/components/Documentos/DatosDocumento.vue'
import BuscarDocente from '@/components/Documentos/BuscarDocente.vue'
import PieDocumento from '@/components/Documentos/PieDocumento.vue'
import TipoComision from '@/components/Documentos/Comision/TipoComision.vue'
import ComisionExterna from '@/components/Documentos/Comision/ComisionExterna.vue'
import ComisionInterna from '@/components/Documentos/Comision/ComisionInterna.vue'
import TipoMemorandum from '@/components/Documentos/memorandum/TipoMemorandum.vue'
import CompactacionHorario from '@/components/Documentos/memorandum/CompactacionHorario.vue'

import ModoDocentes from '@/components/Documentos/memorandum/ModoDocentes.vue'
import LoteDocentes from '@/components/Documentos/memorandum/LoteDocentes.vue'
import NavegadorLote from '@/components/Documentos/memorandum/NavegadorLote.vue'
import ProgresoLote from '@/components/Documentos/memorandum/ProgresoLote.vue'
import ResultadoLote from '@/components/Documentos/memorandum/ResultadoLote.vue'
import { useLoteCompactacion } from '@/composables/useLoteCompactacion.js'

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

import TipoConstancia from '@/components/Documentos/alumnos/TipoConstancia.vue'
import FormularioConstanciaTutorado from '@/components/Documentos/alumnos/FormularioConstanciaTutorado.vue'
import VistaConstanciaTutorado from '@/components/Documentos/alumnos/VistaConstanciaTutorado.vue'

import OficioCompactacion from '@/components/Documentos/compactacion/OficioCompactacion.vue'
import VistaOficioCompactacion from '@/components/Documentos/compactacion/VistaOficioCompactacion.vue'
import { encabezadoDependenciaHTML, destinatarioHTML, lineasCcpHTML, CIUDAD_FECHA } from '@/utils/encabezadoOficio.js'
import { escaparHTML } from '@/utils/html.js'

import { enCorreccion, esTipoParaRH } from '@/utils/estadoDocumento.js'
import { fotoDeEstilo, estiloDe, variablesDeEstilo } from '@/utils/estiloDocumento.js'
import { fechaConBarras, fechaHoy } from '@/utils/fechas.js'
import { textoIncidencia } from '@/utils/incidencias.js'
import { TIPO_OFICIO_COMPACTACION, PLANTILLA_OFICIO_COMPACTACION, filasIncluidas, motivoNoGenerar  } from '@/utils/oficioCompactacion.js'
import { TIPO_CONSTANCIAS, SUBTIPO_ACTIVIDAD, motivoNoGenerarConstancia } from '@/utils/constanciaCreditos.js'

const config = ref(null)
const folioVigente = computed(() => folioActual(config.value))

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
const { headerImgActual, pieImgActual } = useImagenesDocumento(config, docOriginal)
const documentoIdSegundo = ref(null)

// Al editar un memo que es parte de un par: su pareja, solo para el
// aviso que reemplaza a la casilla de "2 incidencias".
const parejaEdicion = ref(null)

const textoParejaEdicion = computed(() => {
    if (!parejaEdicion.value || !config.value) return ''
    return folioRealDe(parejaEdicion.value, folioVigente.value.prefijo, folioVigente.value.anio) || parejaEdicion.value.folio
})

// Formato de la vista previa (y de lo que se imprime): al editar, el
// del propio documento; al crear, el actual de la configuración.
const estiloDocumento = computed(() => variablesDeEstilo(estiloDe(docOriginal.value, config.value)))

// memso y concentrado van a rh
const esDocRH = computed(() => esTipoParaRH(subtipo.value || tipo, campos.value.enviar_rh))

// Decide a dónde va una Comisión Externa al editar: si nunca se
// rechazó, a la Subdirectora por primera vez; si ya se rechazó, se
// reenvía a ella; si edita Secretaria/Apoyo, siempre al Jefe de Depto.
const destinoAlGuardarEdicion = computed(() => {
    const esComisionConCadena = subtipo.value === 'comision-externa' ||
        (subtipo.value === 'comision-interna' && campos.value.para_jefe_depto)
    if (!esComisionConCadena && !esDocRH.value) return null
    if (usuarioActivo?.rol !== 'admin') {
        return {
            estado: 'pendiente_jefeDepto',
            avisoAntes: 'Al guardar, se envía al Jefe de Depto para su revisión.',
            mensajeDespues: 'Documento corregido y enviado al Jefe de Depto para revisión',
            rutaDespues: '/bitacorasecapo'
        }
    }

    //para rh, si corrige  Admin, se firma y se reenvaa solo
    if (esDocRH.value) {
        return {
            estado: 'pendiente_jefeDepto',
            avisoAntes: 'Al guardar, se firma y se envía a Recursos Humanos.',
            mensajeDespues: 'Documento corregido, firmado y enviado a Recursos Humanos',
            rutaDespues: '/bitacora'
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

        // solventación de faltas
        tipo_incidencia: '',
        fecha_incidencia: '',

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
        fecha_solicitud_mant: fechaHoy(),
        descripcion_servicio: '',
        motivo_proveedor_externo: '',
        categoria_recursos_materiales: false,

        puesto_destinatario: '',
        // Oficio de compactaciin
        compactacion_desde: '',
        compactacion_hasta: '',
        filas_compactacion: [],
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
        if (lote.activo) lote.reiniciar()

    const eranDos = combinarIncidencias.value
    limpiarCombo()
    combinarIncidencias.value = eranDos

    busquedaPersona.value = ''
    sugerencias.value = []
    mostrarSugerencias.value = false
    documentoGuardado.value = false



}



// Todos comparten el contador 'general' excepto memos
// y Tutorías (no consume folio automático aquí, se llena a mano).
const TIPOS_FOLIO_GENERAL = [
    'comision', 'liberacion-proyecto',
    'aceptacion', 'terminacion',
    'revision-tesis', 'otros', 'mantenimiento',
    'constancia-creditos', 'oficio-compactacion',
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
    combinarIncidencias, motivo2, fecha2, tipo2, fechaIncidencia2,
    folioSeleccionado2, mostrarReservados2, folioMostradoTexto2, reservadosConTexto2,
    resolverNumeroFolio2, guardarSegundoYVincular, limpiarCombo,
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
        // Tarea "Compactación concentrado": abre directo en Varios docentes.
    if (!idEdicion && route.query.modo === 'varios' && subtipo.value === 'memorandum-compactacion-horario') {
        cambiarModoLote(true)
    }
    // Si viene de una tarea de Bitácora, solo es referencia — no
    // precarga campos del formulario.
    if (bitacoraId) {
        tareaBitacora.value = await getBitacoraPorId(bitacoraId)
    }

    // Comisión/Memorándum/Aceptación/Terminación tienen subtipo — su
    // plantilla real se resuelve en el watch(subtipo) de abajo.
    // El Oficio de compactación no tiene plantilla editable: su texto es fijo.
    if (tipo === TIPO_OFICIO_COMPACTACION) {
        plantilla.value = PLANTILLA_OFICIO_COMPACTACION
    } else if (!['comision', 'memorandum', 'aceptacion', 'terminacion', TIPO_CONSTANCIAS].includes(tipo)) {
        plantilla.value = await getPlantilla(tipo)
    }

    listaGrados.value = await getGrados()
    listaFirmantes.value = await getFirmantes()
    listaDocentes.value = await getDocentes()
    listaDestinatarios.value = await getDestinatarios()

    if (!campos.value.nombre_solicitante_mant) campos.value.nombre_solicitante_mant = nombreJefeDepto()
})


const tiposAlumno = ['aceptacion', 'terminacion', 'liberacion-proyecto', TIPO_CONSTANCIAS]

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



// ── Memo de compactación para varios docentes (useLoteCompactacion.js) ──
// Cada memo pasa por el mismo guardarFirmarYEnviar() que uno individual.
function limpiarDocenteLote() {
    Object.assign(campos.value, { nombre_destinatario: '', nombre_solicitante: '', sexo_destinatario: '', grado_docente: '' })
    // Sin folio de un memo anterior en la vista previa.
    const iniciales = camposIniciales()
    ;['numero_oficio', 'anio_folio', 'prefijo_folio'].forEach(c => { campos.value[c] = iniciales[c] })
    busquedaPersona.value = ''
    quitarFirmaDeLaVista()
}

// La vista previa muestra la firma del último memo firmado; se quita para
// que el siguiente no se guarde con una firma que no es suya.
function quitarFirmaDeLaVista() {
    firmaElectronica.value = ''
    qrFirma.value = ''
}

async function generarUnoDelLote() {
    quitarFirmaDeLaVista()
    documentoGuardado.value = false
    folioSeleccionado.value = 'automatico'
    await nextTick()
    const id = await guardarFirmarYEnviar()
    return { id, folio: numeroOficioCompleto() }
}

const lote = reactive(useLoteCompactacion({
    campos, config, categoriaFolio,
    aplicarDocente: seleccionarPersona,
    limpiarDocente: limpiarDocenteLote,
    generarUno: generarUnoDelLote,
}))
const esLote = computed(() => lote.activo && subtipo.value === 'memorandum-compactacion-horario' && !idEdicion)
const rutaBitacora = usuarioActivo?.rol === 'admin' ? '/bitacora' : '/bitacorasecapo'

function cambiarModoLote(varios) {
    folioSeleccionado.value = 'automatico' 
    mostrarReservados.value = false
    lote.cambiarModo(varios)
}






async function generarLote() {
    const falta = lote.motivoNoGenerar()
    if (falta) return alert(falta)
    if (!confirm(`Se generarán ${lote.total} memos (${lote.rangoFolios}). ¿Continuar?`)) return
    await lote.generar()
}



// of compactacion solo los docentes seleccionados para incluir
const filasOficioCompactacion = computed(() => filasIncluidas(campos.value.filas_compactacion))

const notaCcp = computed(() => lineasCcpHTML(campos.value.ccp_destinos, campos.value.ccp_iniciales))



// oficio maantenimiento 
const hojaPreview = ref(null)
const { cabe: cabeEnUnaHoja } = useMantenimientoUnaHoja({
    hoja: hojaPreview,
    activo: () => tipo === 'mantenimiento',
    observar: () => [campos.value, notaCcp.value, estiloDocumento.value],
})

// Tutorías: encabezado y destinatario iguales a los que arma la vista
// Tutorías (utils/encabezadoOficio.js), para que al editar se vea igual.
const encabezadoTutorias = computed(() => encabezadoDependenciaHTML({
    oficio: numeroOficioCompleto(),
    fecha: campos.value.fecha_documento,
    asunto: plantilla.value?.asunto,
}))
const destinatarioTutorias = computed(() => destinatarioHTML([
    `${campos.value.grado_docente ? campos.value.grado_docente + ' ' : ''}${(campos.value.nombre_destinatario || '').toUpperCase()}`,
    'DOCENTE DE ESTE INSTITUTO',
], 'P R E S E N T E.'))


// al editar, el folio conserva el año y prefijo con que se genero
function numeroOficioCompleto() {
    const { prefijo, anio } = datosFolioDe({ ...docOriginal.value, campos: campos.value },
        folioVigente.value.prefijo, folioVigente.value.anio)
    return formatearFolio(campos.value.numero_oficio, prefijo, anio)
}

// En MAYÚSCULAS en todos los tipos excepto memorándum.
const CAMPOS_MAYUSCULAS = ['nombre_estudiante', 'nombre_destinatario', 'nombre_solicitante', 'carrera', 'nombre_proyecto']

const CAMPOS_HTML = ['grupos_carrera']

const articuloC = computed(() => textoSegunSexo(campos.value.sexo_destinatario, 'el', 'la', 'el'))

const vistaPrevia = computed(() => {
    if (!plantilla.value?.cuerpo) return ''
    let html = plantilla.value.cuerpo
    for (const [clave, valor] of Object.entries(campos.value)) {
        const enMayusculas = tipo !== 'memorandum' && CAMPOS_MAYUSCULAS.includes(clave) && typeof valor === 'string'
        let valorFinal = enMayusculas ? valor.toUpperCase() : valor
        // \n de un <textarea> no se ve en HTML, se convierte a <br>.
        if (typeof valorFinal === 'string' && !CAMPOS_HTML.includes(clave)) {
            valorFinal = escaparHTML(valorFinal).replaceAll('\n', '<br>')
        }
        html = html.replaceAll(`{${clave}}`, valorFinal || '')
    }
    html = html.replaceAll('{fecha_texto}', fechaATexto(campos.value.fecha))
    html = html.replaceAll('{incidencia_texto}', textoIncidencia(campos.value.tipo_incidencia, campos.value.fecha_incidencia))
    html = html.replaceAll('{rango_fechas}', rangoFechasATexto(campos.value.fecha_inicio, campos.value.fecha_fin))
    html = html.replaceAll('{dias_texto}', diasATexto(campos.value.fecha_inicio, campos.value.fecha_fin))
    html = html.replaceAll('{fecha_inicio_texto}', fechaATexto(campos.value.fecha_inicio))
    html = html.replaceAll('{fecha_fin_texto}', fechaATexto(campos.value.fecha_fin))


    const lugarTexto = campos.value.lugar_especifico
        ? `, ${escaparHTML(campos.value.lugar_especifico)}`
        : ''
    html = html.replaceAll('{lugar_texto}', lugarTexto)

    html = html.replaceAll('{comisionado_texto}',
        textoSegunSexo(campos.value.sexo_destinatario, 'comisionado', 'comisionada', 'comisionado(a)'))
    html = html.replaceAll('{articulo_c}', articuloC.value)
    const nombreDocente = tipo !== 'memorandum'
        ? (campos.value.nombre_destinatario || '').toUpperCase()
        : (campos.value.nombre_destinatario || '')
    html = html.replaceAll('{nombre_docente_completo}',
        escaparHTML(`${campos.value.grado_docente} ${nombreDocente}`.trim()))
    const horarioTexto = (campos.value.horario_inicio && campos.value.horario_fin)
        ? `, en el horario de ${campos.value.horario_inicio} a ${campos.value.horario_fin} hrs`
        : ''
    html = html.replaceAll('{horario_texto}', horarioTexto)
    return html
})

const numeroOficioResuelto2 = ref('')
const vistaPreviaSegundaIncidencia = computed(() => {
    if (!combinarIncidencias.value || !plantilla.value?.cuerpo) return ''
    const cuerpo = plantilla.value.cuerpo
        .replaceAll('{articulo_c}', articuloC.value)
        .replaceAll('{nombre_solicitante}', escaparHTML(campos.value.nombre_solicitante))
        .replaceAll('{incidencia_texto}', textoIncidencia(tipo2.value, fechaIncidencia2.value))
        .replaceAll('{motivo}', escaparHTML(motivo2.value).replaceAll('\n', '<br>'))

    const jefe = buscarPorClave('jefe_depto')
    const jefeRH = buscarDestinatarioPorClave('jefe_recursos_humanos')
    const fechaTexto = fecha2.value ? fechaConBarras(fecha2.value) : 'DD/MM/AAAA'

    return `
        <div class="w-100 mb-3 pb-2 encabezado-doc">
            <img src="${headerImgActual.value}" class="header-doc-img" alt="Encabezado Institucional SEP TecNM">
        </div>
        <div class="d-flex justify-content-between mb-3">
            <div class="texto-destinatario">
                <strong>${escaparHTML(jefeRH?.grado)} ${escaparHTML(jefeRH?.nombre)}</strong><br>
                <strong>${escaparHTML(jefeRH?.puesto)}</strong>
            </div>
            <div class="text-end texto-encabezado">
                ${CIUDAD_FECHA} <span class="fecha-resaltada">${fechaTexto}</span><br>
                <strong>MEMORANDUM NO: ${formatearFolio(numeroOficioResuelto2.value, folioVigente.value.prefijo, folioVigente.value.anio)}</strong>
            </div>
        </div>
        <div class="texto-cuerpo">${cuerpo}</div>
        <div class="mt-4 texto-firma">
            <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
            <div class="texto-lema">Excelencia en Educación Tecnológica®</div>
            <div class="texto-lema-secundario">Cultura, Ciencia y Tecnología para la Superación de México®</div>
            <strong>${escaparHTML(jefe?.grado)} ${escaparHTML(jefe?.nombre)}</strong><br>
            <strong>${escaparHTML(jefe?.puesto)}</strong><br>
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
            Object.assign(campos.value, camposDeFolio(await resolverNumeroFolio()))
            // Espera a que la vista previa se repinte con el número
            // ya resuelto, si no el innerHTML captura el valor viejo.
            await nextTick()
        }

        // oficio de compactacion: se guardan todas sus hojas.
        const htmlCompleto = tipo === TIPO_OFICIO_COMPACTACION
            ? document.querySelector('.hojas-oficio')?.innerHTML || ''
            : document.querySelector('.documento-carta')?.innerHTML || vistaPrevia.value
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
            } else if (esDocRH.value) {
                // Espera al Jefe; si lo creó el Admin, se envía a RH en
                // cuanto se firma (generarDocumento).
                estadoInicial = 'pendiente_jefeDepto'
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
            const folio2 = await resolverNumeroFolio2()
            numeroOficioResuelto2.value = folio2.numero
            documentoIdSegundo.value = await guardarSegundoYVincular(documentoId, datosCompletos, vistaPreviaSegundaIncidencia.value, folio2)
        }

        // Si viene de una tarea, se marca finalizada y se liga. En el lote
        // no: esa tarea se cierra con el Oficio de compactación.
        if (bitacoraId && documentoId && !lote.activo) {
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

    return await firmarYSubirDocumentoEspecial(documentoId, htmlPersonalizado)
}

function mensajeAlGenerar() {
    if (!esDocRH.value) return 'Documento generado correctamente'
    return usuarioActivo?.rol === 'admin'
        ? 'Documento generado, firmado y enviado a Recursos Humanos'
        : 'Documento generado y enviado al Jefe de Depto para su revisión'
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
        alert(mensajeAlGenerar())
        router.push(usuarioActivo?.rol === 'admin' ? '/bitacora' : '/bitacorasecapo')
    }
}

function debeFirmarDocumentoAhora() {


    // si va a rh y lo hizo sec/apo se firma hasta  que jefe aprueab
    if (esDocRH.value && usuarioActivo?.rol !== 'admin') {
        return false
    }

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

    // para generar constnacia y no marque mensaje de errro por haora
    if (tipo === TIPO_CONSTANCIAS) {
        return false
    }


    // concentrado compactacion sin firma por ahora 
    if (tipo === TIPO_OFICIO_COMPACTACION) {
        return false
    }

    // Todos los demás documentos conservan
    // su funcionamiento actual.
    return true
}

// revisar si falta algo antes d eguardar sino retornar falso y aviso
function listoParaGenerar() {
    let falta = ''
    if (tipo === TIPO_OFICIO_COMPACTACION) falta = motivoNoGenerar(campos.value)
    else if (tipo === TIPO_CONSTANCIAS) falta = motivoNoGenerarConstancia(campos.value, subtipo.value)
    else if (tipo === 'mantenimiento' && !campos.value.tipo_servicio) falta = 'Elige si el servicio es Interno o Externo.'
    else if (tipo === 'mantenimiento' && !cabeEnUnaHoja.value) falta = 'El texto ya no cabe en una hoja (junto con la firma, la nota de copia y la leyenda). Acorta la descripción o el motivo.'
    if (falta) alert(falta)
    return !falta
}


async function guardarFirmarYEnviar() {

            
        if (subtipo.value === 'memorandum-compactacion-horario' && !idEdicion) {
            campos.value.enviar_rh = !lote.activo
        }

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


        if (esDocRH.value && usuarioActivo?.rol === 'admin') {
            for (const id of [documentoId, documentoIdSegundo.value].filter(Boolean)) {
                await enviarDocumentoARH(id)
            }
        }

        return documentoId
}

async function generarDocumento() {
    if (!listoParaGenerar()) return
    try {
        cargando.value = true
        await guardarFirmarYEnviar()
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
    if (!listoParaGenerar()) return
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

        imprimirConNombre(subtipo.value || tipo, campos.value)  //no quitar ,es para  guardar el doc con nombre

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
                        {{ plantilla?.nombre || 'Nuevo Documento' }}
                    </h5>

                    <div v-if="idEdicion" class="alert alert-success py-2 mb-3">
                        <template v-if="destinoAlGuardarEdicion">
                            Estás corrigiendo un documento ya existente. {{ destinoAlGuardarEdicion.avisoAntes }}
                        </template>
                        <template v-else>
                            Estás corrigiendo un documento ya existente. Al guardar, se actualizan los cambios{{
                                bitacoraId ? ' y la tarea se vuelve a marcar como Finalizado' : '' }}.
                        </template>
                    </div>

                    <div v-if="tareaBitacora" class="alert alert-info py-2 mb-3">
                        <p class="mb-1 fw-semibold">Tarea asignada: {{
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
                        <!-- Lote de compactación ya generado: resumen y siguientes pasos -->
                        <ResultadoLote v-if="esLote && lote.terminado" :lote="lote" :campos="campos"
                        :ruta-bitacora="rutaBitacora" :bitacora-id="bitacoraId" />
                        <template v-else>
                            <TipoMemorandum v-model="subtipo" />
                            <template v-if="subtipo">
                                <ModoDocentes v-if="subtipo === 'memorandum-compactacion-horario' && !idEdicion"
                                :model-value="lote.activo" @update:model-value="cambiarModoLote" />
                            
                                <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                                    :folio-mostrado-texto="esLote ? (lote.rangoFolios || 'Elige a los docentes') : folioMostradoTexto"
                                    :reservados-con-texto="esLote ? [] : reservadosConTexto"
                                    v-model:folio-seleccionado="folioSeleccionado"
                                    v-model:mostrar-reservados="mostrarReservados" fecha-primero />
                                <BuscarDocente v-if="!esLote" v-model:busqueda-persona="busquedaPersona"
                                    :sugerencias="sugerencias" :mostrar-sugerencias="mostrarSugerencias"
                                    @buscar="buscarEnBD" @seleccionar="seleccionarPersona" />

                                    <CompactacionHorario v-if="subtipo === 'memorandum-compactacion-horario' && !esLote"
                                :campos="campos" />
                                <LoteDocentes v-if="esLote" :lote="lote" :docentes="listaDocentes" />
                          

                                <SolventacionFaltas v-if="subtipo === 'memorandum-solventacion-faltas'" :campos="campos"
                                    :id-edicion="idEdicion" :texto-pareja-edicion="textoParejaEdicion"
                                    v-model:combinar-incidencias="combinarIncidencias"
                                    :folio-mostrado-texto2="folioMostradoTexto2"
                                    v-model:folio-seleccionado2="folioSeleccionado2"
                                    :reservados-con-texto2="reservadosConTexto2"
                                    v-model:mostrar-reservados2="mostrarReservados2" v-model:fecha2="fecha2"
                                    v-model:motivo2="motivo2" v-model:tipo2="tipo2"
                                    v-model:fecha-incidencia2="fechaIncidencia2" />
                                <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran"
                                    :cargando="cargando || lote.generando"
                                    :texto="esLote ? `Generar ${lote.total || ''} memos` : 'Generar Documento'"
                                    @generar="esLote ? generarLote() : generarDocumento()" />
                            </template>
                            <div v-else class="text-muted text-center py-3">
                                <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                                <p class="mt-2">Selecciona el tipo de memorándum para continuar</p>
                            </div>
                        </template>
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
                        <LiberacionProyecto :campos="campos" :sugerencias-firmantes="sugerenciasFirmantes"
                            :campo-firmante-activo="campoFirmanteActivo"
                            :buscar-firmantes-liberacion="buscarFirmantesLiberacion"
                            :seleccionar-firmante-liberacion="seleccionarFirmanteLiberacion" />
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

                    <!-- constancia de creditos -->
                    <template v-else-if="tipo === 'constancia-creditos'">
                        <TipoConstancia v-model="subtipo" />
                        <template v-if="subtipo">
                            <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                                :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                                v-model:folio-seleccionado="folioSeleccionado"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <BuscarAlumno v-model:busqueda-persona="busquedaPersona" :sugerencias="sugerencias"
                                :mostrar-sugerencias="mostrarSugerencias" @buscar="buscarEnBD"
                                @seleccionar="seleccionarPersona" />
                            <DatosAlumnoDocumento :campos="campos" />
                            <FormularioConstanciaTutorado :campos="campos" :lista-docentes="listaDocentes"
                                :jefe="buscarPorClave('jefe_depto')" :es-actividad="subtipo === SUBTIPO_ACTIVIDAD" />
                            <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                                @generar="generarDocumento" />
                        </template>
                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona Tutoría o Actividad complementaria para continuar</p>
                        </div>
                    </template>

                    <!-- concentrado rh compactacion-->
                    <template v-else-if="tipo === 'oficio-compactacion'">
                        <DatosDocumento :campos="campos" :id-edicion="idEdicion"
                            :folio-mostrado-texto="folioMostradoTexto" :reservados-con-texto="reservadosConTexto"
                            v-model:folio-seleccionado="folioSeleccionado"
                            v-model:mostrar-reservados="mostrarReservados" fecha-primero />
                        <OficioCompactacion :campos="campos" :config="config" />
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
                        <FormularioMantenimiento :campos="campos" :cabe-en-hoja="cabeEnUnaHoja" />
                        <PieDocumento :campos="campos" :personas="personasJefeDeptoYElaboran" :cargando="cargando"
                            @generar="generarDocumento" />
                    </template>

                    <button v-if="(plantilla || subtipo) && !(esLote && lote.terminado)"
                        class="btn btn-danger w-100 mt-2" @click="limpiarFormulario" type="button">
                        <i class="bi bi-trash me-2"></i>Limpiar formulario
                    </button>

                </div>

            </div>

            <!-- COLUMNA DERECHA: VISTA PREVIA  /src/assets/images/logo-encabezado.png -->
            <div class="col-12 col-lg-7 col-preview-sticky">
                <div class="panel p-4">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <h6 class="text-muted m-0">
                            <i class="bi bi-eye me-2"></i>Vista previa
                        </h6>
                        <NavegadorLote v-if="esLote" :lote="lote" />
                    </div>
                    <div class="preview-scale-outer"
                        :class="{ 'combo-wrapper': combinarIncidencias && subtipo === 'memorandum-solventacion-faltas' }">

                        <!-- compactacion oficio-->
                        <VistaOficioCompactacion v-if="tipo === 'oficio-compactacion'" :filas="filasOficioCompactacion"
                            :fecha="campos.fecha_documento" :oficio="numeroOficioCompleto()"
                            :destinatario="buscarDestinatarioPorClave('jefe_recursos_humanos')"
                            :jefe="buscarPorClave('jefe_depto')" :nota-ccp="notaCcp" :header-img="headerImgActual"
                            :pie-img="pieImgActual" :estilo="estiloDocumento" />
                        <div v-else ref="hojaPreview" class="bg-white border rounded documento-carta"
                            :style="estiloDocumento">

                            <!-- Encabezado institucional -->
                            <div class="w-100 mb-3 pb-2  encabezado-doc " v-if="tipo !== 'mantenimiento'">
                                <img :src="headerImgActual" class="header-doc-img"
                                    alt="Encabezado Institucional SEP TecNM">
                            </div>



                            <!-- Vista previa normal -->

                            <div
                                v-if="plantilla && tipo !== 'liberacion-proyecto' && tipo !== 'mantenimiento' && tipo !== 'constancia-creditos'">

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

                                <!-- Encabezado Tutorías (igual al que genera la vista Tutorías) -->
                                <template v-else-if="tipo === 'tutorias'">
                                    <div v-html="encabezadoTutorias"></div>
                                    <div v-html="destinatarioTutorias"></div>
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

                            <!-- Vista previa Constancia  -->
                            <VistaConstanciaTutorado v-else-if="plantilla && tipo === 'constancia-creditos'"
                                :campos="campos" :cuerpo="vistaPrevia" :oficio="numeroOficioCompleto()"
                                :asunto="plantilla?.asunto"
                                :destinatario="buscarDestinatarioPorClave('jefa_servicios_escolares')"
                                :jefe="buscarPorClave('jefe_depto')" :nota-ccp="notaCcp"
                                :es-actividad="subtipo === SUBTIPO_ACTIVIDAD" />


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
                                            <img src="/images/documentos/itch.png" alt="LOGO"
                                                style="max-width:100%; max-height:140px;" />
                                        </td>

                                        <td rowspan="2" class="doc-celda-iso" style="width:55%; vertical-align:top;">
                                            <strong>Nombre del Documento:</strong> {{
                                                plantilla?.encabezadoIso?.nombreDocumento ||
                                                "Formato para Solicitud de Mantenimiento Correctivo y/o Preventivo Interno o  Externo" }}
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
        <ProgresoLote :lote="lote" />
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
