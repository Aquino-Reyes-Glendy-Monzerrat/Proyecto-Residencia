<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import { ref, computed, watch, onMounted } from 'vue'
import {
    getDocentes, getGruposTutoria, agregarGrupoTutoria,
    actualizarGrupoTutoria, eliminarGrupoTutoria, agregarDocumento,
    getPlantilla, getFirmantes, getConfiguracion, getDocumentos, actualizarDocumento
} from '../services/api.js'
import headerImg from '@/assets/images/logo-encabezado.png'
import pieImg from '@/assets/images/pie.png'
import { useSesion } from '../composables/UseSesion.js'
import { formatearFolio } from '@/utils/folio.js'

const { usuarioActivo } = useSesion()

// Mismo texto que NuevoDocumento.vue — se arma en lote, no por form.
const CIUDAD_FECHA = 'Chetumal, Quintana Roo,'
function fechaConBarras(fechaStr) {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr + 'T00:00:00')
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const anio = fecha.getFullYear()
    return `${dia}/${mes}/${anio}`
}

const CARRERAS = {
    I: { nombre: 'Ing. en Sistemas Computacionales', siglas: 'ISIC', color: 'hsl(173 100% 65%)' },
    K: { nombre: 'Ing. en Tecnologías de la Información y Comunicaciones', siglas: 'ITIC', color: 'hsl(213 94% 78%)' },
    W: { nombre: 'Ing. en Desarrollo de Aplicaciones', siglas: 'IDAP', color: 'hsl(0 91% 82%)' },
}
const PERIODOS = {
    'ENE-JUN': { label: 'Enero - Junio', semestres: [2, 4, 6, 8] },
    'AGO-DIC': { label: 'Agosto - Diciembre', semestres: [1, 3, 5, 7, 9] },
}
const cargando = ref(true)
const docentes = ref([])
const grupos = ref([])

const periodoActual = ref('AGO-DIC')
const carreraFiltro = ref('TODAS')
const filtroDocentes = ref('todos') // 'todos' | 'asignados' | 'sin-asignar'
const buscarDocente = ref('')

const docenteSeleccionado = ref(null)   // id docente en modo "relación"
const grupoEditSeleccionado = ref(null) // clave del grupo en modo "edición/eliminación"

// Si se selecciona un grupo (sin docente activo), resalta a su(s)
// tutor(es) en la lista — puede haber varios.
const docentesDelGrupoSeleccionado = computed(() => {
    if (!grupoEditSeleccionado.value || docenteSeleccionado.value) return []
    const g = grupos.value.find(x => x.clave === grupoEditSeleccionado.value)
    return g?.docenteIds || []
})

const plantillaTutorias = ref(null)
const listaFirmantes = ref([])
const config = ref(null)

async function cargarTodo() {
    cargando.value = true
    docentes.value = (await getDocentes()).map((d, i) => ({ ...d, colorIndex: i }))
    grupos.value = await getGruposTutoria()
    plantillaTutorias.value = await getPlantilla('tutorias')
    listaFirmantes.value = await getFirmantes()
    config.value = await getConfiguracion()

    // Mismas variables que VerDocumento.vue, o .documento-carta se
    // queda sin márgenes institucionales configurados.
    const num = v => String(v).replace(',', '.')
    document.documentElement.style.setProperty('--margen-superior', num(config.value.estilo.margen_superior) + 'cm')
    document.documentElement.style.setProperty('--margen-derecho', num(config.value.estilo.margen_derecho) + 'cm')
    document.documentElement.style.setProperty('--margen-inferior', num(config.value.estilo.margen_inferior) + 'cm')
    document.documentElement.style.setProperty('--margen-izquierdo', num(config.value.estilo.margen_izquierdo) + 'cm')

    cargando.value = false
}
onMounted(cargarTodo)

// Quita todos los grupos del docente activo, sin tocar a los demás.
async function quitarGruposDelSeleccionado() {
    if (!docenteSeleccionado.value) return
    const suyos = gruposDeDocente(docenteSeleccionado.value)
    if (suyos.length === 0) return
    const nombre = docentes.value.find(d => d.id === docenteSeleccionado.value)?.nombre || 'este docente'
    if (!confirm(`¿Quitarle sus ${suyos.length} grupo${suyos.length === 1 ? '' : 's'} a ${nombre}?`)) return
    for (const g of suyos) {
        // Solo saca a ESTE docente — otros tutores del grupo quedan.
        const nuevos = (g.docenteIds || []).filter(id => id !== docenteSeleccionado.value)
        await actualizarGrupoTutoria(g.id, { docenteIds: nuevos })
        g.docenteIds = nuevos
    }
}

// Quita el tutor de todos los grupos del periodo, para empezar de cero.
async function limpiarTodosLosTutores() {
    const asignados = gruposDelPeriodo.value.filter(g => tieneTutor(g))
    if (asignados.length === 0) {
        alert('No hay tutores asignados en este periodo.')
        return
    }
    if (!confirm(`¿Quitar TODOS los tutores de los ${asignados.length} grupos con tutor en ${PERIODOS[periodoActual.value].label}? Los grupos NO se borran, solo se quedan sin tutor.`)) return
    for (const g of asignados) {
        await actualizarGrupoTutoria(g.id, { docenteIds: [] })
        g.docenteIds = []
    }
}

// Color por docente: "ángulo dorado" (137.508°), reparte tonos parejo
// sin necesitar una lista fija de colores.
const ANGULO_DORADO = 137.508
function hueDocente(docenteId) {
    const d = docentes.value.find(x => x.id === docenteId)
    return d ? (d.colorIndex * ANGULO_DORADO) % 360 : 0
}
function colorDocente(docenteId, alpha = 1) {
    return `hsla(${hueDocente(docenteId).toFixed(1)}, 68%, 65%, ${alpha})`
}
function initials(nombre) {
    return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}
function claveGrupo(c, s, l) {
    return `${c}${s}${l}`.toUpperCase()
}

// Relación N:N grupo↔docentes — grupo.docenteIds es siempre un
// array. Estas 3 funciones son el único lugar que lee esa relación.
function esTutorDe(grupo, docenteId) {
    return (grupo.docenteIds || []).includes(docenteId)
}
function docentesDeGrupo(grupo) {
    return (grupo.docenteIds || [])
        .map(id => docentes.value.find(d => d.id === id))
        .filter(Boolean)
}
function tieneTutor(grupo) {
    return (grupo.docenteIds || []).length > 0
}

const gruposDelPeriodo = computed(() => grupos.value.filter(g => g.periodo === periodoActual.value))
function gruposDeDocente(docenteId) {
    return gruposDelPeriodo.value.filter(g => esTutorDe(g, docenteId))
}

const gruposFiltrados = computed(() => {
    let lista = gruposDelPeriodo.value
    if (carreraFiltro.value !== 'TODAS') lista = lista.filter(g => g.carrera === carreraFiltro.value)
    return [...lista].sort((a, b) =>
        a.carrera === b.carrera
            ? (a.semestre === b.semestre ? a.letra.localeCompare(b.letra) : a.semestre - b.semestre)
            : a.carrera.localeCompare(b.carrera)
    )
})

// Vista "Todas": cada carrera ocupa su propia franja, sin mezclarse.
const gruposPorCarreraParaTodas = computed(() => {
    if (carreraFiltro.value !== 'TODAS') return []
    return Object.keys(CARRERAS)
        .map(key => ({
            carrera: key,
            grupos: gruposDelPeriodo.value
                .filter(g => g.carrera === key)
                .sort((a, b) => a.semestre === b.semestre ? a.letra.localeCompare(b.letra) : a.semestre - b.semestre)
        }))
        .filter(x => x.grupos.length > 0)
})

// Vista por carrera: una columna por semestre, en orden real.
const gruposPorSemestre = computed(() => {
    if (carreraFiltro.value === 'TODAS') return []
    return PERIODOS[periodoActual.value].semestres
        .map(s => ({
            semestre: s,
            grupos: gruposDelPeriodo.value
                .filter(g => g.carrera === carreraFiltro.value && g.semestre === s)
                .sort((a, b) => a.letra.localeCompare(b.letra))
        }))
        .filter(x => x.grupos.length > 0)
})

const docentesFiltrados = computed(() => {
    const q = buscarDocente.value.trim().toLowerCase()
    let lista = docentes.value.filter(d => d.nombre.toLowerCase().includes(q))
    if (filtroDocentes.value === 'asignados') lista = lista.filter(d => gruposDeDocente(d.id).length > 0)
    if (filtroDocentes.value === 'sin-asignar') lista = lista.filter(d => gruposDeDocente(d.id).length === 0)
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
})

function seleccionarDocente(id) {
    docenteSeleccionado.value = docenteSeleccionado.value === id ? null : id
    grupoEditSeleccionado.value = null
}

async function toggleAsignacion(grupo) {
    if (!docenteSeleccionado.value) return
    const actuales = grupo.docenteIds || []
    const nuevos = actuales.includes(docenteSeleccionado.value)
        ? actuales.filter(id => id !== docenteSeleccionado.value)
        : [...actuales, docenteSeleccionado.value]
    await actualizarGrupoTutoria(grupo.id, { docenteIds: nuevos })
    grupo.docenteIds = nuevos
}

function clickCuadrito(grupo) {
    if (docenteSeleccionado.value) {
        toggleAsignacion(grupo)
    } else {
        grupoEditSeleccionado.value = grupoEditSeleccionado.value === grupo.clave ? null : grupo.clave
    }
}

// Crear/editar grupos: una fila por semestre, con letras ya marcadas
// si existen — el mismo panel sirve para crear y editar.
const panelCrearAbierto = ref(false)
const filasPorCarrera = ref({}) // { I: [{semestre, letras}], K: [...], W: [...] }

// U es fijo siempre; D solo desde 7º semestre. Ninguna forma parte
// de la secuencia +/-, para no liberarla por accidente.
function letrasFijasPara(semestre) {
    return semestre >= 7 ? ['U', 'D'] : ['U']
}
// A,B,C,E,F... es una sola pila que maneja +/- de principio a fin,
// reconstruida hasta la letra más alta guardada (saltando la D).
function construirSecuenciaBase(letrasExistentes) {
    const relevantes = letrasExistentes.filter(l => l !== 'U' && l !== 'D')
    if (relevantes.length === 0) return ['A', 'B', 'C']
    const maxCodigo = Math.max(...relevantes.map(l => l.charCodeAt(0)))
    const secuencia = []
    for (let codigo = 'A'.charCodeAt(0); codigo <= maxCodigo; codigo++) {
        const letra = String.fromCharCode(codigo)
        if (letra !== 'D') secuencia.push(letra)
    }
    return secuencia
}
function construirFilasCrear() {
    const semestres = PERIODOS[periodoActual.value].semestres
    filasPorCarrera.value = Object.fromEntries(
        Object.keys(CARRERAS).map(key => [
            key,
            semestres.map(s => {
                const letras = gruposDelPeriodo.value
                    .filter(g => g.carrera === key && g.semestre === s)
                    .map(g => g.letra)
                return { semestre: s, letras, secuencia: construirSecuenciaBase(letras) }
            })
        ])
    )
}
function abrirPanelCrear() {
    panelCrearAbierto.value = true
    construirFilasCrear()
}
function cerrarPanelCrear() {
    panelCrearAbierto.value = false
    filasPorCarrera.value = {}
}
// Si cambia el periodo con el panel abierto, se reconstruye solo.
watch(periodoActual, () => {
    if (panelCrearAbierto.value) construirFilasCrear()
})
function toggleLetraFila(fila, letra) {
    const i = fila.letras.indexOf(letra)
    if (i === -1) fila.letras.push(letra)
    else fila.letras.splice(i, 1)
}
// Todas las letras de esta fila, para pintar chips y guardar.
function letrasDeFila(fila) {
    return [...letrasFijasPara(fila.semestre), ...fila.secuencia]
}
// "+" agrega la siguiente letra libre, saltando la D. Se detiene en Z.
function agregarLetraFila(fila) {
    const ultima = fila.secuencia[fila.secuencia.length - 1]
    if (ultima === 'Z') {
        alert('Ya se llegó a la Z — no hay más letras disponibles para este semestre.')
        return
    }
    let codigo = (ultima ? ultima.charCodeAt(0) : 'A'.charCodeAt(0) - 1) + 1
    if (String.fromCharCode(codigo) === 'D') codigo++
    fila.secuencia.push(String.fromCharCode(codigo))
}
// "-" quita la última letra, aunque sea de las 3 base — y la
// desmarca si tenía grupo (se borra al Guardar).
function quitarLetraFila(fila) {
    if (fila.secuencia.length === 0) return
    const quitada = fila.secuencia.pop()
    fila.letras = fila.letras.filter(l => l !== quitada)
}

async function guardarGruposNuevos() {
    let creados = 0
    let eliminados = 0
    for (const carrera of Object.keys(filasPorCarrera.value)) {
        for (const fila of filasPorCarrera.value[carrera]) {
            const existentes = gruposDelPeriodo.value.filter(g => g.carrera === carrera && g.semestre === fila.semestre)

            // Crear los marcados que no existían.
            for (const letra of fila.letras) {
                if (existentes.some(g => g.letra === letra)) continue
                const clave = claveGrupo(carrera, fila.semestre, letra)
                // No se manda "id" — json-server genera el suyo.
                const nuevo = await agregarGrupoTutoria({
                    clave, carrera, semestre: fila.semestre, letra,
                    periodo: periodoActual.value, docenteIds: []
                })
                grupos.value.push(nuevo)
                creados++
            }

            // Borrar los desmarcados que ya existían.
            for (const g of existentes) {
                if (fila.letras.includes(g.letra)) continue
                if ((g.docenteIds || []).length > 0) {
                    const nombresTutores = docentesDeGrupo(g).map(d => d.nombre).join(', ') || 'un docente'
                    if (!confirm(`El grupo ${g.clave} tiene como tutor(es) a ${nombresTutores}. ¿Quitarlo de todos modos?`)) {
                        fila.letras.push(g.letra) // se deja marcado, no se toca
                        continue
                    }
                }
                await eliminarGrupoTutoria(g.id)
                grupos.value = grupos.value.filter(x => x.id !== g.id)
                eliminados++
            }
        }
    }
    const partes = []
    if (creados > 0) partes.push(`${creados} grupo${creados === 1 ? '' : 's'} nuevo${creados === 1 ? '' : 's'}`)
    if (eliminados > 0) partes.push(`${eliminados} grupo${eliminados === 1 ? '' : 's'} eliminado${eliminados === 1 ? '' : 's'}`)
    alert(partes.length ? `Listo: ${partes.join(', ')}.` : 'No hubo cambios.')
}

// Editar un grupo se hace desde "Agregar grupos" (sirve para las 2).
async function eliminarGrupoSeleccionado() {
    const g = grupos.value.find(x => x.clave === grupoEditSeleccionado.value)
    if (!g) return
    if (!confirm(`¿Eliminar el grupo ${g.clave}? Esta acción no se puede deshacer.`)) return
    await eliminarGrupoTutoria(g.id)
    grupos.value = grupos.value.filter(x => x.id !== g.id)
    grupoEditSeleccionado.value = null
}

// Generar documentos en lote
const generando = ref(false)
// Arma el HTML con el mismo encabezado, firma y pie que
// NuevoDocumento.vue, pero construido aquí directo (lote, no form).
// Mismo patrón que "comisionado_texto": sin sexo capturado, usa "(a)".
function textoSegunSexo(sexo, masculino, femenino, generico) {
    if (sexo === 'M') return masculino
    if (sexo === 'F') return femenino
    return generico
}

function construirCuerpoHTML(docente, listaTexto, fechaDocumento, numeroOficio, cantidadGrupos) {
    const fechaTexto = fechaConBarras(fechaDocumento)
    const anio = config.value?.folio?.anio || new Date().getFullYear()
    const prefijo = config.value?.folio?.prefijo_default || 'P'
    const oficioCompleto = formatearFolio(numeroOficio, prefijo, anio)
    const jefeDepto = listaFirmantes.value.find(p => p.clave === 'jefe_depto')
    const nombreDoc = (docente?.nombre || '').toUpperCase()
    const gradoDoc = docente?.abreviatura || ''
    const asignadoTexto = textoSegunSexo(docente?.sexo, 'asignado', 'asignada', 'asignado(a)')
    const tutorTexto = textoSegunSexo(docente?.sexo, 'tutor', 'tutora', 'tutor(a)')
    // Singular/plural según cuántos grupos, en vez de una frase
    // genérica forzada.
    const grupoOGrupos = cantidadGrupos === 1 ? 'el siguiente grupo' : 'los siguientes grupos'
    // El periodo lleva el año ("Agosto - Diciembre de 2026").
    const periodoConAnio = `${PERIODOS[periodoActual.value].label} de ${anio}`

    let cuerpoTexto = plantillaTutorias.value?.cuerpo || ''
    cuerpoTexto = cuerpoTexto
        .replaceAll('{periodo_texto}', periodoConAnio)
        .replaceAll('{lista_grupos}', listaTexto)
        .replaceAll('{asignado_texto}', asignadoTexto)
        .replaceAll('{tutor_texto}', tutorTexto)
        .replaceAll('{grupo_o_grupos}', grupoOGrupos)

    return `<div class="w-100 mb-3 pb-2 encabezado-doc">
    <img src="${headerImg}" class="header-doc-img" alt="Encabezado Institucional SEP TecNM">
</div>
<div class="text-end mb-3 texto-encabezado">
    ${CIUDAD_FECHA} <span class="fecha-resaltada">${fechaTexto}</span><br>
    Oficio No. ${oficioCompleto}
</div>
<div class="mb-3 texto-destinatario">
    <strong>${gradoDoc ? gradoDoc + ' ' : ''}${nombreDoc}</strong><br>
    <strong>PRESENTE</strong>
</div>
<div class="texto-cuerpo">${cuerpoTexto}</div>
<div class="mt-4 texto-firma">
    <strong class="atentamente-spaced">ATENTAMENTE</strong><br>
    <div class="texto-lema">Excelencia en Educación Tecnológica®</div>
    <div class="texto-lema-secundario">Cultura, Ciencia y Tecnología para la Superación de México®</div>
    <br><br>
    <strong>${jefeDepto?.grado || ''} ${jefeDepto?.nombre || ''}</strong><br>
    <strong>${jefeDepto?.puesto || ''}</strong>
</div>
<div class="w-100 text-center pie-fijo" style="font-size: 10px; line-height: 1.3;">
    <img src="${pieImg}" alt="Pie de página" class="pie-doc-img">
</div>`
}

async function generarDocumentos() {
    const asignados = gruposDelPeriodo.value.filter(g => tieneTutor(g))
    if (asignados.length === 0) {
        alert('No hay grupos asignados en este periodo todavía.')
        return
    }
    // Un grupo compartido: cada docente arma su propia lista y
    // su propio oficio, nunca se juntan.
    const porDocente = {}
    asignados.forEach(g => {
        g.docenteIds.forEach(docenteId => {
            if (!porDocente[docenteId]) porDocente[docenteId] = []
            porDocente[docenteId].push(g)
        })
    })

    // Evita duplicar: si el docente no cambió su lista de grupos, su
    // documento se deja igual; si cambió, se actualiza en el mismo.
    // Empareja por docenteId — docs de antes no lo tienen, no se tocan.
    const todosLosDocs = await getDocumentos()
    const existentesPorDocente = {}
    todosLosDocs
        .filter(d => d.tipo === 'tutorias' && d.campos?.periodo === periodoActual.value && d.docenteId)
        .forEach(d => { existentesPorDocente[d.docenteId] = d })

    // Docentes que se quedaron sin grupo tras la corrección — su
    // documento no se borra solo, solo se avisa.
    const idsAsignadosHoy = new Set(Object.keys(porDocente))
    const huerfanos = Object.values(existentesPorDocente).filter(d => !idsAsignadosHoy.has(d.docenteId))

    if (!confirm(`Vas a generar los documentos de ${Object.keys(porDocente).length} docente(s) con grupos asignados en este periodo.\n\nSi un docente no tuvo cambios, su documento actual no se toca.\nSi cambió su lista de grupos, se actualiza ese documento.\nSi es nuevo, se crea uno.\n\n¿Continuar?`)) return

    generando.value = true
    const hoy = new Date().toISOString().split('T')[0]
    let creados = 0, actualizados = 0, sinCambios = 0

    for (const docenteId of Object.keys(porDocente)) {
        const docente = docentes.value.find(d => d.id === docenteId)
        const susGrupos = porDocente[docenteId].sort((a, b) => a.clave.localeCompare(b.clave))
        const listaTexto = susGrupos.map(g => g.clave).join(', ')
        const existente = existentesPorDocente[docenteId]

        if (existente && existente.campos?.lista_grupos === listaTexto) {
            sinCambios++
            continue
        }

        const camposNuevos = {
            nombre_destinatario: docente?.nombre?.toUpperCase() || '',
            grado_docente: docente?.abreviatura || '',
            periodo: periodoActual.value,
            periodo_texto: PERIODOS[periodoActual.value].label,
            lista_grupos: listaTexto,
            asignado_texto: textoSegunSexo(docente?.sexo, 'asignado', 'asignada', 'asignado(a)'),
            tutor_texto: textoSegunSexo(docente?.sexo, 'tutor', 'tutora', 'tutor(a)'),
        }

        if (existente) {
            // Cambió su lista — se actualiza el mismo documento,
            // conservando fecha y número de oficio ya asignados.
            const fechaConservada = existente.campos?.fecha_documento || hoy
            const oficioConservado = existente.campos?.numero_oficio || ''
            await actualizarDocumento(existente.id, {
                cuerpo: construirCuerpoHTML(docente, listaTexto, fechaConservada, oficioConservado, susGrupos.length),
                campos: { ...existente.campos, ...camposNuevos }
            })
            actualizados++
        } else {
            await agregarDocumento({
                tipo: 'tutorias',
                tipoRuta: 'tutorias',
                docenteId,
                asunto: plantillaTutorias.value?.asunto || 'Asignación de Tutorías',
                cuerpo: construirCuerpoHTML(docente, listaTexto, hoy, '', susGrupos.length),
                creadoPor: usuarioActivo?.id,
                estado: 'generado',
                revisionJefeDepto: 'sin_revisar',
                solicitoRevision: false,
                campos: {
                    ...camposNuevos,
                    fecha_documento: hoy,
                    numero_oficio: '',
                }
            })
            creados++
        }
    }
    generando.value = false

    let mensaje = `Listo — ${creados} nuevo(s), ${actualizados} actualizado(s), ${sinCambios} sin cambios (se dejaron igual).`
    if (huerfanos.length > 0) {
        const nombres = huerfanos.map(d => d.campos?.nombre_destinatario || '?').join(', ')
        mensaje += `\n\nOjo: ${huerfanos.length} documento(s) de esta corrección ya no tienen ningún grupo asignado (${nombres}) — no se borraron solos, revísalos en Bitácora si ya no aplican.`
    }
    alert(mensaje)
}


// Ver / imprimir todos los generados de este periodo juntos
const mostrarImpresion = ref(false)
const documentosParaImprimir = ref([])
const cargandoImpresion = ref(false)

async function abrirImpresion() {
    cargandoImpresion.value = true
    mostrarImpresion.value = true
    const todos = await getDocumentos()
    documentosParaImprimir.value = todos
        .filter(d => d.tipo === 'tutorias' && d.campos?.periodo === periodoActual.value)
        .sort((a, b) => (a.campos?.nombre_destinatario || '').localeCompare(b.campos?.nombre_destinatario || '', 'es'))
    cargandoImpresion.value = false
}
function cerrarImpresion() {
    mostrarImpresion.value = false
}
function imprimirTodos() {
    window.print()
}
</script>

<template>
    <AdminLayout>
        <div class="no-imprimir">
        <div v-if="cargando" class="text-center py-5"><span class="spinner-border"></span></div>

        <template v-else>
            <div class="row g-3 mb-3 align-items-center">
                <!-- Lado izquierdo (Alineado con la columna de Docentes - col-lg-4) -->
                <div class="col-12 col-lg-4 d-flex gap-2">
                    <div class="panel px-3 py-2 small flex-fill text-center">
                        <b class="text-info">{{ gruposDelPeriodo.length }}</b> grupos en el periodo
                    </div>
                    <div class="panel px-3 py-2 small flex-fill text-center">
                        <b :class="gruposDelPeriodo.filter(g => !tieneTutor(g)).length > 0 ? 'text-warning' : 'text-success'">
                            {{ gruposDelPeriodo.filter(g => !tieneTutor(g)).length }}
                        </b> grupos sin tutor
                    </div>
                </div>
                <!-- Lado derecho (Comienza exactamente donde inicia la sección de Grupos - col-lg-8) -->
                <div class="col-12 col-lg-8 d-flex flex-wrap align-items-center gap-2">
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn"
                            :class="periodoActual === 'ENE-JUN' ? 'btn-primary' : 'btn-outline-primary'"
                            @click="periodoActual = 'ENE-JUN'; docenteSeleccionado = null; grupoEditSeleccionado = null">
                            Enero - Junio
                        </button>
                        <button type="button" class="btn"
                            :class="periodoActual === 'AGO-DIC' ? 'btn-primary' : 'btn-outline-primary'"
                            @click="periodoActual = 'AGO-DIC'; docenteSeleccionado = null; grupoEditSeleccionado = null">
                            Agosto - Diciembre
                        </button>
                    </div>
                    <button class="btn btn-success btn-sm" :disabled="generando" @click="generarDocumentos">
                        <span v-if="generando" class="spinner-border spinner-border-sm me-1"></span>
                        <i v-else class="bi bi-file-earmark-arrow-up me-1"></i>
                        {{ generando ? 'Generando...' : 'Generar documentos' }}
                    </button>
                    <button class="btn btn-outline-primary btn-sm" @click="abrirImpresion">
                        <i class="bi bi-printer me-1"></i> Ver / Imprimir todos
                    </button>
                </div>
            </div>

            <div class="row g-3">
                <!-- ── DOCENTES ── -->
                <div class="col-12 col-lg-4">
                    <div class="panel">
                        <div class="d-flex gap-1 p-2 border-bottom">
                            <button type="button" class="btn btn-sm flex-fill"
                                :class="filtroDocentes === 'todos' ? 'btn-secondary' : 'btn-outline-secondary'"
                                @click="filtroDocentes = 'todos'">Todos</button>
                            <button type="button" class="btn btn-sm flex-fill"
                                :class="filtroDocentes === 'asignados' ? 'btn-secondary' : 'btn-outline-secondary'"
                                @click="filtroDocentes = 'asignados'">Asignados</button>
                            <button type="button" class="btn btn-sm flex-fill"
                                :class="filtroDocentes === 'sin-asignar' ? 'btn-secondary' : 'btn-outline-secondary'"
                                @click="filtroDocentes = 'sin-asignar'">Sin asignar</button>
                        </div>
                        <div class="p-2 border-bottom">
                            <input type="text" class="form-control form-control-sm" v-model="buscarDocente"
                                placeholder="Buscar docente...">
                        </div>
                        <div style="max-height: 55vh; overflow-y: auto;">
                            <div v-for="d in docentesFiltrados" :key="d.id"
                                class="d-flex align-items-center gap-2 p-2 border-bottom"
                                style="cursor: pointer; border-left: 3px solid transparent;"
                                :style="{
                                    background: d.id === docenteSeleccionado ? colorDocente(d.id, .22) : '',
                                    borderLeftColor: docentesDelGrupoSeleccionado.includes(d.id) ? colorDocente(d.id) : 'transparent'
                                }"
                                @click="seleccionarDocente(d.id)">
                                <span class="rounded-circle" :style="`width:8px;height:8px;background:${colorDocente(d.id)};flex-shrink:0;`"></span>
                                <div class="rounded-circle d-flex align-items-center justify-content-center small fw-bold"
                                    :style="`width:30px;height:30px;flex-shrink:0;` + (d.id === docenteSeleccionado ? `background:${colorDocente(d.id)};color:#0b1220;` : 'background:rgba(255,255,255,.08);')">
                                    {{ initials(d.nombre) }}
                                </div>
                                <div class="flex-fill" style="min-width:0;">
                                    <div class="small text-truncate">{{ d.nombre }}</div>
                                    <div class="small text-truncate" :style="d.id === docenteSeleccionado ? `color:${colorDocente(d.id)};` : 'color:var(--bs-secondary-color);'">
                                        {{ gruposDeDocente(d.id).length === 0 ? 'Sin grupos asignados' : gruposDeDocente(d.id).length + ' grupo(s): ' + gruposDeDocente(d.id).map(g => g.clave).join(', ') }}
                                    </div>
                                </div>
                            </div>
                            <p v-if="docentesFiltrados.length === 0" class="text-muted small text-center py-4 mb-0">Sin resultados.</p>
                        </div>
                        <div class="p-2 small text-muted border-top" :class="docenteSeleccionado ? 'text-info' : ''">
                            <template v-if="docenteSeleccionado">
                                <i class="bi bi-arrow-right-circle"></i>
                                Toca los cuadritos de la derecha para asignar o quitar sus grupos.
                                <button type="button" class="btn btn-sm btn-outline-danger ms-2 py-0"
                                    @click="quitarGruposDelSeleccionado">Quitarle todos sus grupos</button>
                            </template>
                            <template v-else>
                                
                            </template>
                        </div>
                    </div>
                </div>

                <!-- ── GRUPOS ── -->
                <div class="col-12 col-lg-8">
                    <div class="panel">
                        <div class="d-flex flex-wrap align-items-center gap-2 p-2 border-bottom">
                            <button type="button" class="btn btn-sm"
                                :class="carreraFiltro === 'TODAS' ? 'btn-dark' : 'btn-outline-secondary'"
                                @click="carreraFiltro = 'TODAS'">Todas</button>
                            <button v-for="(c, key) in CARRERAS" :key="key" type="button" class="btn btn-sm"
                                :class="carreraFiltro === key ? 'btn-dark' : 'btn-outline-secondary'"
                                @click="carreraFiltro = key">{{ c.siglas }}</button>

                            <span class="ms-auto"></span>
                            <button type="button" class="btn btn-outline-warning btn-sm" @click="limpiarTodosLosTutores">
                                <i class="bi bi-eraser"></i> Limpiar tutores
                            </button>
                            <button v-if="!panelCrearAbierto" type="button" class="btn btn-primary btn-sm" @click="abrirPanelCrear">
                                <i class="bi bi-plus-lg"></i> Agregar grupos
                            </button>
                            <button v-if="grupoEditSeleccionado && !docenteSeleccionado" type="button" class="btn btn-outline-danger btn-sm" @click="eliminarGrupoSeleccionado">
                                <i class="bi bi-trash"></i> Eliminar
                            </button>
                        </div>

                        <!-- Panel crear/editar grupos: las 3 carreras en paralelo, una
                             columna cada una — ya viene marcado lo que exista, para poder
                             agregar o quitar sin tener que abrir otra pantalla. -->
                        <div v-if="panelCrearAbierto" class="p-3 border-bottom" style="background: rgba(255,255,255,.02);">
                            <div class="row g-3">
                                <div v-for="(c, key) in CARRERAS" :key="key" class="col-12 col-md-4">
                                    <span class="badge mb-2" :style="`background:${c.color};color:#0b1220;`">{{ key }} · {{ c.siglas }}</span>
                                    <div v-for="fila in filasPorCarrera[key]" :key="fila.semestre" class="mb-2">
                                        <div class="small text-muted mb-1">Sem. {{ fila.semestre }}</div>
                                        <div class="d-flex gap-1 flex-wrap align-items-center">
                                            <button v-for="l in letrasDeFila(fila)" :key="l" type="button" class="btn btn-sm p-0"
                                                :class="fila.letras.includes(l) ? 'btn-primary' : 'btn-outline-secondary'"
                                                style="width: 30px; height: 30px;" @click="toggleLetraFila(fila, l)">{{ l }}</button>
                                            <button type="button" class="btn btn-sm btn-outline-secondary p-0"
                                                style="width: 22px; height: 22px;" title="Agregar otro grupo"
                                                @click="agregarLetraFila(fila)">+</button>
                                            <button type="button" class="btn btn-sm btn-outline-secondary p-0"
                                                style="width: 22px; height: 22px;" title="Quitar el último grupo"
                                                @click="quitarLetraFila(fila)">−</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                                <button type="button" class="btn btn-sm btn-success" @click="guardarGruposNuevos">Guardar</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" @click="cerrarPanelCrear">Cerrar</button>
                            </div>
                        </div>

                        <div class="p-3" style="max-height: 60vh; overflow-y: auto; overflow-x: auto;">
                            <!-- Vista "Todas": una franja completa por carrera -->
                            <template v-if="carreraFiltro === 'TODAS'">
                                <div v-for="grupo in gruposPorCarreraParaTodas" :key="grupo.carrera" class="mb-4">
                                    <div class="small fw-semibold mb-2" :style="`color:${CARRERAS[grupo.carrera].color};`">
                                        {{ CARRERAS[grupo.carrera].siglas }}
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 12px;">
                                        <div v-for="g in grupo.grupos" :key="g.clave"
                                            class="d-flex flex-column align-items-center justify-content-center gap-1 rounded p-2"
                                            style="aspect-ratio: 1/1; cursor: pointer; border: 2px solid rgba(255,255,255,.14); position: relative;"
                                            :style="{
                                                borderColor: tieneTutor(g) ? colorDocente(g.docenteIds[0]) : (docenteSeleccionado ? colorDocente(docenteSeleccionado, .5) : ''),
                                                background: tieneTutor(g) ? colorDocente(g.docenteIds[0], .2) : '',
                                                boxShadow: g.clave === grupoEditSeleccionado ? '0 0 0 3px rgba(59,130,246,.35)' : (esTutorDe(g, docenteSeleccionado) && docenteSeleccionado ? '0 0 0 3px rgba(255,255,255,.18)' : ''),
                                                opacity: (docenteSeleccionado && tieneTutor(g) && !esTutorDe(g, docenteSeleccionado)) ? .55 : 1
                                            }"
                                            @click="clickCuadrito(g)">
                                            <div class="fw-bold" style="font-size: 1.3rem;">{{ g.clave }}</div>
                                            <div v-if="tieneTutor(g)" class="d-flex align-items-center">
                                                <div v-for="(doc, idx) in docentesDeGrupo(g)" :key="doc.id"
                                                    class="rounded-circle d-flex align-items-center justify-content-center"
                                                    style="width:18px;height:18px;font-size:8px;font-weight:700;border:1px solid rgba(11,18,32,.6);"
                                                    :style="{ background: colorDocente(doc.id, .35), color: colorDocente(doc.id), marginLeft: idx === 0 ? '0' : '-6px' }"
                                                    :title="doc.nombre">
                                                    {{ initials(doc.nombre) }}
                                                </div>
                                            </div>
                                            <div v-else class="small text-muted fst-italic">sin tutor</div>
                                        </div>
                                    </div>
                                </div>
                                <p v-if="gruposPorCarreraParaTodas.length === 0" class="text-muted small text-center py-4">
                                    No hay grupos para este periodo. Usa "Agregar grupos".
                                </p>
                            </template>

                            <!-- Vista de una carrera: columnas por semestre, en orden -->
                            <template v-else>
                                <div class="d-flex gap-3">
                                    <div v-for="grupo in gruposPorSemestre" :key="grupo.semestre" style="min-width: 100px;">
                                        <div class="small text-muted text-center mb-2">Sem. {{ grupo.semestre }}</div>
                                        <div class="d-flex flex-column gap-2">
                                            <div v-for="g in grupo.grupos" :key="g.clave"
                                                class="d-flex flex-column align-items-center justify-content-center gap-1 rounded p-2"
                                                style="width: 100px; height: 100px; cursor: pointer; border: 2px solid rgba(255,255,255,.14); position: relative;"
                                                :style="{
                                                    borderColor: tieneTutor(g) ? colorDocente(g.docenteIds[0]) : (docenteSeleccionado ? colorDocente(docenteSeleccionado, .5) : ''),
                                                    background: tieneTutor(g) ? colorDocente(g.docenteIds[0], .2) : '',
                                                    boxShadow: g.clave === grupoEditSeleccionado ? '0 0 0 3px rgba(59,130,246,.35)' : (esTutorDe(g, docenteSeleccionado) && docenteSeleccionado ? '0 0 0 3px rgba(255,255,255,.18)' : ''),
                                                    opacity: (docenteSeleccionado && tieneTutor(g) && !esTutorDe(g, docenteSeleccionado)) ? .55 : 1
                                                }"
                                                @click="clickCuadrito(g)">
                                                <div class="fw-bold" style="font-size: 1.3rem;">{{ g.clave }}</div>
                                                <div v-if="tieneTutor(g)" class="d-flex align-items-center">
                                                    <div v-for="(doc, idx) in docentesDeGrupo(g)" :key="doc.id"
                                                        class="rounded-circle d-flex align-items-center justify-content-center"
                                                        style="width:18px;height:18px;font-size:8px;font-weight:700;border:1px solid rgba(11,18,32,.6);"
                                                        :style="{ background: colorDocente(doc.id, .35), color: colorDocente(doc.id), marginLeft: idx === 0 ? '0' : '-6px' }"
                                                        :title="doc.nombre">
                                                        {{ initials(doc.nombre) }}
                                                    </div>
                                                </div>
                                                <div v-else class="small text-muted fst-italic">sin tutor</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p v-if="gruposPorSemestre.length === 0" class="text-muted small text-center py-4">
                                    No hay grupos para esta carrera en este periodo. Usa "Agregar grupos".
                                </p>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </template>
        </div>

        <!-- Modal: ver / imprimir todos los generados de este periodo -->
        <div v-if="mostrarImpresion" class="modal-impresion">
            <div class="no-print d-flex justify-content-between align-items-center p-3 border-bottom bg-dark">
                <h6 class="text-white m-0">
                    Tutorías — {{ periodoActual === 'ENE-JUN' ? 'Enero - Junio' : 'Agosto - Diciembre' }}
                    <span class="text-white-50 small">
                        ({{ documentosParaImprimir.length }} documento{{ documentosParaImprimir.length === 1 ? '' : 's' }})
                    </span>
                </h6>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-light btn-sm" @click="cerrarImpresion">
                        <i class="bi bi-x-lg"></i> Cerrar
                    </button>
                    <button class="btn btn-primary btn-sm" :disabled="documentosParaImprimir.length === 0" @click="imprimirTodos">
                        <i class="bi bi-printer me-1"></i> Imprimir / Guardar PDF (todos)
                    </button>
                </div>
            </div>

            <div v-if="cargandoImpresion" class="text-center py-5"><span class="spinner-border"></span></div>
            <div v-else class="p-4">
                <p v-if="documentosParaImprimir.length === 0" class="text-muted text-center py-5 no-print">
                    No hay documentos de Tutorías generados para este periodo todavía.
                </p>
                <template v-for="(doc, i) in documentosParaImprimir" :key="doc.id">
                    <div class="bg-white border rounded p-4 documento-carta"
                        :style="i < documentosParaImprimir.length - 1 ? 'page-break-after: always;' : ''"
                        style="color:#333;" v-html="doc.cuerpo"></div>
                </template>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.modal-impresion {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .85);
    z-index: 1050;
    overflow-y: auto;
}
@media print {
    .no-imprimir {
        display: none !important;
    }
    .modal-impresion {
        position: static !important;
        background: none !important;
        overflow: visible !important;
    }
}
</style>