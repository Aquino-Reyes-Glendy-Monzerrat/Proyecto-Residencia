<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlantilla, buscarAlumno, buscarDocente, buscarEgresado, agregarDocumento, getFirmantes, getGrados, getDestinatarios, getDocumentoPorId, actualizarDocumento, getBitacoraPorId, finalizarBitacora } from '../services/api.js'
import NotaCcp from '@/components/NotaCcp.vue'
import SelectorFolio from '@/components/SelectorFolio.vue'
import { useFolio } from '../composables/UseFolio.js'
import { useTextoDocumento } from '../composables/useTextoDocumento.js'
import { getConfiguracion, consumirSiguienteFolio, marcarFolioReservado } from '../services/api.js'
import headerImg from '@/assets/images/logo-encabezado.png'
import pieImg from '@/assets/images/pie.png'
import { useSesion } from '@/composables/UseSesion.js'
import { formatearFolio } from '@/utils/folio.js'

const config = ref(null)


const CIUDAD_FECHA = 'Chetumal, Quintana Roo,'

const { fechaATexto, rangoFechasATexto, mesAnioATexto, horaATexto, renderPlantilla } = useTextoDocumento()


function fechaConBarras(fechaStr) {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr + 'T00:00:00')
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const anio = fecha.getFullYear()
    return `${dia}/${mes}/${anio}`
}

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

// Decide a dónde va una Comisión Externa al editar: si nunca se
// rechazó, a la Subdirectora por primera vez; si ya se rechazó, se
// reenvía a ella; si edita Secretaria/Apoyo, siempre al Jefe de Depto.
const destinoAlGuardarEdicion = computed(() => {
    if (subtipo.value !== 'comision-externa') return null
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
        fecha_documento: '',
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
        fecha_egreso: '',
        total_dias: '',
        texto_libre: '',
        nombre_curso: '',
        lugar_evento: '',
        horario: '',
        producto: '',
        tipo_actividad: '',
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
        nombre_solicitante_mant: 'Manuel Abraham Zapata Encalada',
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
const listaDestinatarios = ref([])
const listaGrados = ref([])

// Busca por "clave" (identificador estable) — único lugar para datos
// de un firmante, tanto en la firma como en "¿quién captura?".
function buscarPorClave(clave) {
    return listaFirmantes.value.find(p => p.clave === clave) || null
}

// Mismo mecanismo, para destinatarios (a quién va dirigido el oficio).
function buscarDestinatarioPorClave(clave) {
    return listaDestinatarios.value.find(p => p.clave === clave) || null
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
    busquedaPersona.value = ''
    sugerencias.value = []
    mostrarSugerencias.value = false
    documentoGuardado.value = false
}

// Vuelca config.estilo a variables CSS (reutilizado en
// FormatoDocumento.vue).
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
const { folioSeleccionado, mostrarReservados, folioMostradoTexto, reservadosConTexto } = useFolio(categoriaFolio, config)

onMounted(async () => {
    config.value = await getConfiguracion()
    aplicarVariablesDocumento(config.value.estilo)

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
    }

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
    listaDestinatarios.value = await getDestinatarios()
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
    html = html.replaceAll('{fecha_inicio_texto}', fechaATexto(campos.value.fecha_inicio))
    html = html.replaceAll('{fecha_fin_texto}', fechaATexto(campos.value.fecha_fin))
    html = html.replaceAll('{fecha_egreso_texto}', fechaATexto(campos.value.fecha_egreso))
    html = html.replaceAll('{fecha_egreso_mes_texto}', mesAnioATexto(campos.value.fecha_egreso)) //rev
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

async function guardarEnHistorial() {
    if (documentoGuardado.value) return true
    cargando.value = true
    try {
        // Resuelve el número de oficio ANTES de armar el HTML final,
        // solo al crear (avanza el contador o marca el reservado usado).
        if (!idEdicion && categoriaFolio.value) {
            let numeroFolio
            if (folioSeleccionado.value === 'automatico') {
                const resultado = await consumirSiguienteFolio(categoriaFolio.value)
                numeroFolio = resultado.numero
            } else {
                numeroFolio = folioSeleccionado.value
                await marcarFolioReservado(categoriaFolio.value, numeroFolio, true)
            }
            campos.value.numero_oficio = String(numeroFolio).padStart(3, '0')
            // Espera a que la vista previa se repinte con el número
            // ya resuelto, si no el innerHTML captura el valor viejo.
            await nextTick()
        }

        const htmlCompleto = document.querySelector('.documento-carta')?.innerHTML || vistaPrevia.value
        const requiereAprobacion = subtipo.value === 'comision-externa'
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
                // Avisa que hace falta reenviar si ya se había
                // enviado o aprobado antes de esta edición.
                actualizacion.editadoTrasEnvio = !!(docOriginal.value?.solicitoRevision || docOriginal.value?.revisionJefeDepto === 'aprobado')
                // Corrección ya resuelta — se apaga sola y se limpia
                // la nota, vuelve a ser turno del Jefe de Depto.
                actualizacion.esperandoCorreccionSecretaria = false
                actualizacion.notaAlCompartir = ''
            }
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
            const creado = await agregarDocumento({
                ...datosDocumento,
                creadoPor: usuarioActivo?.id,
                estado: estadoInicial,
                observaciones: '',
                motivoCancelacion: '',
                revisionJefeDepto: 'sin_revisar',
                observacionJefeDepto: '',
                solicitoRevision: false
            })
            documentoId = creado?.id
        }

        // Si viene de una tarea, se marca finalizada y se liga.
        if (bitacoraId && documentoId) {
            await finalizarBitacora(bitacoraId, documentoId)
        }

        documentoGuardado.value = true
        return true
    } catch (e) {
        alert('Error al generar el documento')
        return false
    } finally {
        cargando.value = false
    }
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

async function generarDocumento() {
    const ok = await guardarEnHistorial()
    if (ok) avisarYRedirigir()
}

async function imprimirDocumento() {
    const ok = await guardarEnHistorial()
    if (ok) {
        // Imprimir antes de redirigir, o el navegador cierra el diálogo.
        window.print()
        avisarYRedirigir()
    }
}
</script>

<template>
    <AdminLayout>
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

                        <div class="alert alert-info small">
                            Este documento se generó desde el módulo <strong>Tutorías</strong>. Aquí solo
                            se completan o corrigen datos — para cambiar los grupos asignados, hazlo
                            desde Tutorías y vuelve a generar.
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_documento">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Número de oficio <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="campos.numero_oficio">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del docente</label>
                            <input type="text" class="form-control" v-model="campos.nombre_destinatario">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Grado / abreviatura</label>
                            <input type="text" class="form-control" v-model="campos.grado_docente">
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Grupos (solo lectura)</label>
                            <textarea class="form-control" rows="2" readonly>{{ campos.lista_grupos }}</textarea>
                        </div>

                        <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                            <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-file-earmark-check me-2"></i>
                            {{ cargando ? 'Guardando...' : 'Guardar cambios' }}
                        </button>
                    </template>

                    <!-- ── COMISIÓN ── -->

                    <template v-if="tipo === 'comision'">

                        <div class="mb-4">
                            <label class="form-label fw-semibold">Tipo de comisión <span
                                    class="text-danger">*</span></label>
                            <div class="d-flex flex-column gap-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        value="comision-externa" id="subtipoExterna">
                                    <label class="form-check-label" for="subtipoExterna">Comisión Externa</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        value="comision-interna" id="subtipoInterna">
                                    <label class="form-check-label" for="subtipoInterna">Comisión Interna</label>
                                </div>
                            </div>
                        </div>

                        <template v-if="subtipo">
                            <div class="mb-3">
                                <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" v-model="campos.fecha_documento">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                                <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                    v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                    v-model:mostrar-reservados="mostrarReservados" />
                                <div v-else class="input-group">
                                    <input type="text" class="form-control" v-model="campos.numero_oficio">
                                </div>
                            </div>

                            <div class="mb-3 position-relative">
                                <label class="form-label">Nombre del docente <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" v-model="busquedaPersona"
                                    placeholder="Escribe el nombre..." @input="buscarEnBD(busquedaPersona)"
                                    autocomplete="off">
                                <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
                                    style="top:100%">
                                    <li v-for="p in sugerencias" :key="p.id"
                                        class="list-group-item list-group-item-action" @click="seleccionarPersona(p)"
                                        style="cursor:pointer">
                                        {{ p.nombre }} — {{ p.cargo || p.carrera }}
                                    </li>
                                </ul>
                                <div v-if="campos.grado_docente" class="form-text">
                                    Grado: <strong>{{ campos.grado_docente }}</strong> (se toma del docente
                                    seleccionado)
                                </div>
                            </div>


                            <div class="mb-3" v-if="subtipo === 'comision-externa'">
                                <label class="form-label">Ciudad destino <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" v-model="campos.ciudad_destino">
                            </div>

                            <!-- CURSO externa -->
                            <template v-if="subtipo === 'comision-externa'">
                                <div class="mb-3">
                                    <label class="form-label">Tipo de actividad <span
                                            class="text-danger">*</span></label>
                                    <select class="form-select" v-model="campos.tipo_actividad">
                                        <option value="">Selecciona...</option>
                                        <option value="Curso">Curso</option>
                                        <option value="Curso-Taller">Curso-Taller</option>
                                        <option value="Taller">Taller</option>
                                        <option value="Congreso">Congreso</option>
                                        <option value="Seminario">Seminario</option>
                                        <option value="Diplomado">Diplomado</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nombre del {{ campos.tipo_actividad || 'curso' }} <span
                                            class="text-danger">*</span></label>
                                    <input type="text" class="form-control" v-model="campos.nombre_curso"
                                        :placeholder="'Nombre del ' + (campos.tipo_actividad || 'curso')">
                                </div>
                                <div class="row g-2 mb-3">
                                    <div class="col">
                                        <label class="form-label">Fecha inicio <span
                                                class="text-danger">*</span></label>
                                        <input type="date" class="form-control" v-model="campos.fecha_inicio">
                                    </div>
                                    <div class="col">
                                        <label class="form-label">Fecha fin <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" v-model="campos.fecha_fin">
                                    </div>
                                </div>
                            </template>

                            <!-- COMISIÓN  interna -->
                            <template v-if="subtipo === 'comision-interna'">
                                <div class="mb-3">
                                    <label class="form-label">Fecha del evento <span
                                            class="text-danger">*</span></label>
                                    <input type="date" class="form-control" v-model="campos.fecha">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Lugar del evento <span
                                            class="text-danger">*</span></label>
                                    <input type="text" class="form-control" v-model="campos.lugar_evento"
                                        placeholder="Ej: a X lugar">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Motivo / finalidad <span
                                            class="text-danger">*</span></label>
                                    <textarea class="form-control" rows="3" v-model="campos.motivo"
                                        placeholder="Describe el motivo de la comisión..."></textarea>
                                </div>
                            </template>

                            <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                                :personas="personasComisionCcp" />

                            <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                                <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-file-earmark-check me-2"></i>
                                {{ cargando ? 'Generando...' : 'Generar Documento' }}
                            </button>
                        </template>

                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona el tipo de comisión para continuar</p>
                        </div>
                    </template>

                    <!-- ── MEMORÁNDUM ── -->
                    <template v-else-if="tipo === 'memorandum'">
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Tipo de memorándum <span
                                    class="text-danger">*</span></label>
                            <div class="d-flex flex-column gap-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        value="memorandum-solventacion-faltas" id="subtipoSolventacion">
                                    <label class="form-check-label" for="subtipoSolventacion">Solventación de
                                        Faltas</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        value="memorandum-compactacion-horario" id="subtipoCompactacion">
                                    <label class="form-check-label" for="subtipoCompactacion">Compactación de
                                        horario</label>
                                </div>
                            </div>
                        </div>

                        <template v-if="subtipo">
                            <div class="mb-3">
                                <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" v-model="campos.fecha_documento">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                                <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                    v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                    v-model:mostrar-reservados="mostrarReservados" />
                                <div v-else class="input-group">
                                    <input type="text" class="form-control" v-model="campos.numero_oficio">
                                </div>
                            </div>

                            <div class="mb-3 position-relative">
                                <label class="form-label">Nombre del docente <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" v-model="busquedaPersona"
                                    placeholder="Escribe el nombre..." @input="buscarEnBD(busquedaPersona)"
                                    autocomplete="off">
                                <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
                                    style="top:100%">
                                    <li v-for="p in sugerencias" :key="p.id"
                                        class="list-group-item list-group-item-action" @click="seleccionarPersona(p)"
                                        style="cursor:pointer">
                                        {{ p.nombre }} — {{ p.cargo || p.carrera }}
                                    </li>
                                </ul>
                            </div>
                            <div class="mb-3" v-if="subtipo === 'memorandum-compactacion-horario'">
                                <label class="form-label">Fecha inicio <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" v-model="campos.fecha_inicio">
                            </div>
                            <div class="mb-3" v-if="subtipo === 'memorandum-compactacion-horario'">
                                <label class="form-label">Fecha fin <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" v-model="campos.fecha_fin">
                            </div>
                            <div class="mb-3" v-if="subtipo === 'memorandum-compactacion-horario'">
                                <label class="form-label">Hora de entrada <span class="text-danger">*</span></label>
                                <input type="time" class="form-control" v-model="campos.hora_entrada">
                            </div>
                            <div class="mb-3" v-if="subtipo === 'memorandum-compactacion-horario'">
                                <label class="form-label">Hora de salida <span class="text-danger">*</span></label>
                                <input type="time" class="form-control" v-model="campos.hora_salida">
                            </div>

                            <div class="mb-3" v-if="subtipo === 'memorandum-solventacion-faltas'">
                                <label class="form-label">Motivo <span class="text-danger">*</span></label>
                                <textarea class="form-control" rows="2" v-model="campos.motivo"
                                    placeholder="Ej: se encontraba en asesorías con sus alumnos de residencias"></textarea>
                            </div>

                            <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                                :personas="personasJefeDeptoYElaboran" />

                            <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                                <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-file-earmark-check me-2"></i>
                                {{ cargando ? 'Generando...' : 'Generar Documento' }}
                            </button>
                        </template>

                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona el tipo de memorándum para continuar</p>
                        </div>
                    </template>

                    <!-- ── ALUMNOS: Residencia y SS (Aceptación / Terminación) ── -->
                    <template v-else-if="tipo === 'aceptacion' || tipo === 'terminacion'">
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Tipo <span class="text-danger">*</span></label>
                            <div class="d-flex flex-column gap-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        :value="`${tipo}-residencia`" id="subtipoResidencia">
                                    <label class="form-check-label" for="subtipoResidencia">Residencia
                                        Profesional</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" v-model="subtipo"
                                        :value="`${tipo}-servicio-social`" id="subtipoServicioSocial">
                                    <label class="form-check-label" for="subtipoServicioSocial">Servicio
                                        Social</label>
                                </div>
                            </div>
                        </div>

                        <template v-if="subtipo">
                            <div class="mb-3">
                                <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                                <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                    v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                    v-model:mostrar-reservados="mostrarReservados" />
                                <div v-else class="input-group">
                                    <input type="text" class="form-control" v-model="campos.numero_oficio">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" v-model="campos.fecha_documento">
                            </div>
                            <div class="mb-3 position-relative">
                                <label class="form-label">Número de control <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" v-model="busquedaPersona"
                                    placeholder="Escribe el número de control..." @input="buscarEnBD(busquedaPersona)"
                                    autocomplete="off">
                                <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
                                    style="top:100%">
                                    <li v-for="p in sugerencias" :key="p.id"
                                        class="list-group-item list-group-item-action" @click="seleccionarPersona(p)"
                                        style="cursor:pointer">
                                        {{ p.numero_control }} — {{ p.nombre }}
                                    </li>
                                </ul>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nombre del estudiante</label>
                                <input type="text" class="form-control" v-model="campos.nombre_estudiante" readonly>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Carrera</label>
                                <input type="text" class="form-control" v-model="campos.carrera" readonly>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">
                                    {{ subtipo.includes('residencia') ? 'Nombre del proyecto' : 'Nombre del programa' }}
                                    <span class="text-danger">*</span>
                                </label>
                                <input v-if="subtipo.includes('residencia')" type="text" class="form-control"
                                    v-model="campos.nombre_proyecto">
                                <input v-else type="text" class="form-control" v-model="campos.nombre_programa">
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col">
                                    <label class="form-label">Fecha inicio <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" v-model="campos.fecha_inicio">
                                </div>
                                <div class="col">
                                    <label class="form-label">Fecha fin <span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" v-model="campos.fecha_fin">
                                </div>
                            </div>

                            <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                                :personas="personasJefeDeptoYElaboran" />

                            <button class="btn btn-primary w-100 mt-2" @click="generarDocumento"
                                :disabled="cargando">
                                <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                                <i v-else class="bi bi-file-earmark-check me-2"></i>
                                {{ cargando ? 'Generando...' : 'Generar Documento' }}
                            </button>
                        </template>

                        <div v-else class="text-muted text-center py-3">
                            <i class="bi bi-arrow-up-circle" style="font-size:2rem"></i>
                            <p class="mt-2">Selecciona Residencia o Servicio Social para continuar</p>
                        </div>
                    </template>

                    <!-- ── LIBERACIÓN DE PROYECTO ── -->
                    <template v-else-if="tipo === 'liberacion-proyecto'">
                        <div class="mb-3">
                            <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_documento">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                            <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <div v-else class="input-group">
                                <input type="text" class="form-control" v-model="campos.numero_oficio">
                            </div>
                        </div>
                        <div class="mb-3 position-relative">
                            <label class="form-label">Número de control <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="busquedaPersona"
                                placeholder="Escribe el número de control..." @input="buscarEnBD(busquedaPersona)"
                                autocomplete="off">
                            <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
                                style="top:100%">
                                <li v-for="p in sugerencias" :key="p.id" class="list-group-item list-group-item-action"
                                    @click="seleccionarPersona(p)" style="cursor:pointer">
                                    {{ p.numero_control }} — {{ p.nombre }}
                                </li>
                            </ul>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del estudiante</label>
                            <input type="text" class="form-control" v-model="campos.nombre_estudiante" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Carrera</label>
                            <input type="text" class="form-control" v-model="campos.carrera" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del proyecto <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="campos.nombre_proyecto">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Producto <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="campos.producto"
                                placeholder="Ej: Proyecto de Residencia Profesional">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del asesor <span
                                    class="text-muted small">(opcional)</span></label>
                            <input type="text" class="form-control" v-model="campos.nombre_asesor">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del revisor 1 <span
                                    class="text-muted small">(opcional)</span></label>
                            <input type="text" class="form-control" v-model="campos.nombre_revisor">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del revisor 2 <span
                                    class="text-muted small">(opcional)</span></label>
                            <input type="text" class="form-control" v-model="campos.nombre_revisor2">
                        </div>


                        <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                            :personas="personasJefeDeptoYElaboran" />

                        <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                            <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-file-earmark-check me-2"></i>
                            {{ cargando ? 'Generando...' : 'Generar Documento' }}
                        </button>
                    </template>

                    <!-- ── REVISIÓN DE TESIS ── -->
                    <template v-else-if="tipo === 'revision-tesis'">
                        <div class="mb-3">
                            <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                            <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <div v-else class="input-group">
                                <input type="text" class="form-control" v-model="campos.numero_oficio">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_documento">
                        </div>



                        <div class="mb-3 position-relative">
                            <label class="form-label">Número de control <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="busquedaPersona"
                                placeholder="Escribe el número de control..." @input="buscarEnBD(busquedaPersona)"
                                autocomplete="off">
                            <ul v-if="mostrarSugerencias" class="list-group position-absolute w-100 z-3"
                                style="top:100%">
                                <li v-for="p in sugerencias" :key="p.id" class="list-group-item list-group-item-action"
                                    @click="seleccionarPersona(p)" style="cursor:pointer">
                                    {{ p.numero_control }} — {{ p.nombre }}
                                </li>
                            </ul>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del egresado</label>
                            <input type="text" class="form-control" v-model="campos.nombre_estudiante" readonly>
                        </div>



                        <div class="mb-3">
                            <label class="form-label">Fecha de egreso <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_egreso">
                        </div>

                        <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                            :personas="personasJefeDeptoYElaboran" />


                        <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                            <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-file-earmark-check me-2"></i>
                            {{ cargando ? 'Generando...' : 'Generar Documento' }}
                        </button>
                    </template>

                    <!-- ── OTROS ── -->
                    <template v-else-if="tipo === 'otros'">
                        <div class="mb-3">
                            <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                            <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <div v-else class="input-group">
                                <input type="text" class="form-control" v-model="campos.numero_oficio" placeholder="XXX">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Fecha del documento <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_documento">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Grado <span class="text-muted small">(opcional)</span></label>
                            <select class="form-select" v-model="campos.grado_docente">
                                <option value="">Selecciona...</option>
                                <option v-for="g in listaGrados" :key="g.id" :value="g.valor">{{ g.valor }}{{
                                    g.descripcion ? ' — ' + g.descripcion : '' }}</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre del destinatario <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="campos.nombre_destinatario"
                                placeholder="Nombre completo de a quién va dirigido">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Puesto <span class="text-muted small">(opcional)</span></label>
                            <input type="text" class="form-control" v-model="campos.puesto_destinatario"
                                placeholder="Ej: DIRECTOR DEL DEPARTAMENTO DE...">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contenido del documento <span class="text-danger">*</span></label>
                            <textarea class="form-control" rows="6" v-model="campos.texto_libre"
                                placeholder="Escribe el contenido del documento..."></textarea>

                        </div>

                        <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                            :personas="personasJefeDeptoYElaboran" />



                        <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                            <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-file-earmark-check me-2"></i>
                            {{ cargando ? 'Generando...' : 'Generar Documento' }}
                        </button>
                    </template>

                    <!-- ── MANTENIMIENTO ── -->
                    <template v-else-if="tipo === 'mantenimiento'">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Tipo de servicio <span
                                    class="text-danger">*</span></label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" v-model="campos.tipo_servicio"
                                    value="interno" id="servInterno">
                                <label class="form-check-label" for="servInterno">Servicio Interno</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" v-model="campos.tipo_servicio"
                                    value="externo" id="servExterno">
                                <label class="form-check-label" for="servExterno">Servicio Externo</label>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-semibold">Categoría <span class="text-danger">*</span></label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox"
                                    v-model="campos.categoria_recursos_materiales" id="catRecursos">
                                <label class="form-check-label" for="catRecursos">Recursos Materiales y
                                    Servicios</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox"
                                    v-model="campos.categoria_mantenimiento_equipo" id="catEquipo">
                                <label class="form-check-label" for="catEquipo">Mantenimiento de Equipo</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox"
                                    v-model="campos.categoria_centro_computo" id="catComputo">
                                <label class="form-check-label" for="catComputo">Centro de Cómputo</label>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Folio del oficio <span class="text-danger">*</span></label>
                            <SelectorFolio v-if="!idEdicion" :folio-mostrado-texto="folioMostradoTexto"
                                v-model:folio-seleccionado="folioSeleccionado" :reservados="reservadosConTexto"
                                v-model:mostrar-reservados="mostrarReservados" />
                            <div v-else class="input-group">
                                <input type="text" class="form-control" v-model="campos.numero_oficio">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Área Solicitante</label>
                            <input type="text" class="form-control" v-model="campos.area_solicitante">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Nombre del Solicitante</label>
                            <input type="text" class="form-control" v-model="campos.nombre_solicitante_mant">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Fecha de solicitud <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="campos.fecha_solicitud_mant">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Descripción del servicio solicitado <span
                                    class="text-danger">*</span></label>
                            <textarea class="form-control" rows="4" v-model="campos.descripcion_servicio"
                                placeholder="Ej: Equipo de aire acondicionado marca Lennox 1450400002-12-00036"></textarea>
                        </div>

                        <div class="mb-3" v-if="campos.tipo_servicio === 'externo'">
                            <label class="form-label">Motivo por el cual se solicita proveedor externo</label>
                            <textarea class="form-control" rows="2"
                                v-model="campos.motivo_proveedor_externo"></textarea>
                        </div>

                        <NotaCcp v-model:destinos="campos.ccp_destinos" v-model:iniciales="campos.ccp_iniciales"
                            :personas="personasJefeDeptoYElaboran" />

                        <button class="btn btn-primary w-100 mt-2" @click="generarDocumento" :disabled="cargando">
                            <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-file-earmark-check me-2"></i>
                            {{ cargando ? 'Generando...' : 'Generar Documento' }}
                        </button>
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
                    <div class="preview-scale-outer">
                        <div class="bg-white border rounded documento-carta">
                            <!-- Encabezado institucional -->
                            <div class="w-100 mb-3 pb-2  encabezado-doc " v-if="tipo !== 'mantenimiento'">
                                <img :src="headerImg" class="header-doc-img" alt="Encabezado Institucional SEP TecNM">
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
                                    <div class="text-end mb-3 texto-encabezado">
                                        {{ CIUDAD_FECHA }} <span class="fecha-resaltada">{{
                                            campos.fecha_documento ?
                                                fechaConBarras(campos.fecha_documento) : 'DD/MM/AAAA' }}</span><br>
                                        <strong>MEMORANDUM NO: {{ numeroOficioCompleto() }}</strong>
                                    </div>
                                    <br>
                                    <div class="mb-3 texto-destinatario">
                                        <strong>{{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.grado }} {{
                                            buscarDestinatarioPorClave('jefe_recursos_humanos')?.nombre }}</strong><br>
                                        <strong>{{ buscarDestinatarioPorClave('jefe_recursos_humanos')?.puesto
                                            }}</strong>
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
                                    <template v-if="subtipo === 'comision-externa'">
                                        <strong>{{ buscarPorClave('director')?.grado }} {{
                                            buscarPorClave('director')?.nombre }}</strong><br>
                                        <strong>{{ buscarPorClave('director')?.puesto }}</strong>
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
                                    Por este medio informo que ha sido liberado el siguiente proyecto para la titulación
                                    integral:
                                </p>
                                <table class="texto-cuerpo"
                                    style="width:100%; border-collapse:collapse; margin-bottom:1rem;">
                                    <tr>
                                        <td class="doc-celda" style="width:40%;"><strong>Nombre del estudiante y/o
                                                egresado:</strong></td>
                                        <td class="doc-celda">{{ (campos.nombre_estudiante || '—').toUpperCase() }}</td>
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
                                        <td class="doc-celda">{{ (campos.nombre_proyecto || '—').toUpperCase() }}</td>
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
                                            <strong>{{ campos.nombre_asesor || '' }}</strong>
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
                                            <strong>Nombre del Documento:</strong> Formato para Solicitud de
                                            Mantenimiento
                                            Correctivo y/o Preventivo Interno o Externo
                                        </td>
                                        <td class="doc-celda-iso" style="width:30%;">
                                            <strong>Fecha de Aprobación:</strong> 22 noviembre 2022
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="doc-celda-iso">
                                            <strong>Revisión:</strong> 4
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="border:1px solid #000; padding:0;">
                                            <table style="width:100%; border-collapse:collapse; border:none;">
                                                <tr>
                                                    <td class="texto-ccp"
                                                        style="width:50%; border-right:1px solid #000; padding:4px; vertical-align:top;">
                                                        <strong>Sistema Integral de Gestión:</strong><br>
                                                        ISO 9001:2015<br>
                                                        ISO 14001:2015<br>
                                                        ISO 45001:2018
                                                    </td>
                                                    <td class="texto-ccp"
                                                        style="width:50%; padding:4px; vertical-align:top;">
                                                        <strong>Referencia a la Norma:</strong><br>
                                                        ISO 9001:2015: 7.1.3<br>
                                                        ISO 14001:2015: 8.1
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

                            <!-- Pie de pagina logo -->

                            <div v-if="plantilla && tipo !== 'mantenimiento'" class="w-100 text-center pie-fijo"
                                style="font-size: 10px; line-height: 1.3;">
                                <img :src="pieImg" alt="Pie de página" class="pie-doc-img">
                            </div>
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