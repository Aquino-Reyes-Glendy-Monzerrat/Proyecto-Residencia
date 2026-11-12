<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import {
    getGrados, agregarGrado, actualizarGrado, eliminarGrado,
    getCcpOpciones, agregarCcpOpcion, actualizarCcpOpcion, eliminarCcpOpcion,
    getTiposIncidencia, agregarTipoIncidencia, actualizarTipoIncidencia, eliminarTipoIncidencia,
    getActividadesComplementarias, agregarActividadComplementaria, actualizarActividadComplementaria, eliminarActividadComplementaria,
} from '../services/api.js'
import { useCatalogo } from '@/composables/useCatalogo.js'

// ─── GRADOS ─── (lista + formulario, ver useCatalogo.js)
const {
    lista: grados, cargando: cargandoGrados, guardando: guardandoGrado, form: formGrado, editandoId: editandoGradoId,
    editar: editarGrado, cancelarEdicion: cancelarEdicionGrado, guardar: guardarGrado, eliminar: eliminarGradoConfirm,
} = useCatalogo({
    api: { listar: getGrados, agregar: agregarGrado, actualizar: actualizarGrado, eliminar: eliminarGrado },
    vacio: () => ({ valor: '' }),
    desdeRegistro: (g) => ({ valor: g.valor }),
    validar: (f) => (!f.valor.trim() ? 'Escribe un valor' : ''),
    aDatos: (f) => ({ valor: f.valor.trim() }),
    textoEliminar: (g) => `¿Eliminar "${g.valor}" del catálogo de grados?`,
})

// ─── CCP OPCIONES ─── (aquí el formulario es solo el texto de la etiqueta)
const {
    lista: ccpOpciones, cargando: cargandoCcp, guardando: guardandoCcp, form: formCcp, editandoId: editandoCcpId,
    editar: editarCcp, cancelarEdicion: cancelarEdicionCcp, guardar: guardarCcp, eliminar: eliminarCcpConfirm,
} = useCatalogo({
    api: { listar: getCcpOpciones, agregar: agregarCcpOpcion, actualizar: actualizarCcpOpcion, eliminar: eliminarCcpOpcion },
    vacio: () => '',
    desdeRegistro: (c) => c.etiqueta,
    validar: (texto) => (!texto.trim() ? 'Escribe una etiqueta' : ''),
    aDatos: (texto) => ({ etiqueta: texto.trim() }),
    textoEliminar: (c) => `¿Eliminar "${c.etiqueta}" del catálogo de notas de copia?`,
})

//  TIPOS DE INCIDENCIA 
const {
    lista: tiposIncidencia, cargando: cargandoTipos, guardando: guardandoTipo, form: formTipo, editandoId: editandoTipoId,
    editar: editarTipo, cancelarEdicion: cancelarEdicionTipo, guardar: guardarTipo, eliminar: eliminarTipoConfirm,
} = useCatalogo({
    api: { listar: getTiposIncidencia, agregar: agregarTipoIncidencia, actualizar: actualizarTipoIncidencia, eliminar: eliminarTipoIncidencia },
    vacio: () => ({ valor: '' }),
    desdeRegistro: (t) => ({ valor: t.valor }),
    validar: (f) => (!f.valor.trim() ? 'Escribe el tipo de incidencia' : ''),
    aDatos: (f) => ({ valor: f.valor.trim() }),
    textoEliminar: (t) => `¿Eliminar "${t.valor}" del catálogo de tipos de incidencia?`,
    ordenar: (a, b) => a.valor.localeCompare(b.valor, 'es'),
})


//actividaeds complementarias
const {
    lista: actividades, cargando: cargandoActividades, guardando: guardandoActividad, form: formActividad, editandoId: editandoActividadId,
    editar: editarActividad, cancelarEdicion: cancelarEdicionActividad, guardar: guardarActividad, eliminar: eliminarActividadConfirm,
} = useCatalogo({
    api: { listar: getActividadesComplementarias, agregar: agregarActividadComplementaria, actualizar: actualizarActividadComplementaria, eliminar: eliminarActividadComplementaria },
    vacio: () => ({ valor: '' }),
    desdeRegistro: (a) => ({ valor: a.valor }),
    validar: (f) => (!f.valor.trim() ? 'Escribe el tipo de actividad' : ''),
    aDatos: (f) => ({ valor: f.valor.trim() }),
    textoEliminar: (a) => `¿Eliminar "${a.valor}" del catálogo de actividades complementarias?`,
    ordenar: (a, b) => a.valor.localeCompare(b.valor, 'es'),
})

</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">

            <div class="row g-4">
                <!-- ── GRADOS (abrev) ── -->
                <div class="col-12 col-lg-4">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">
                            {{ editandoGradoId ? 'Editar grado' : 'Agregar grado' }}
                        </h6>

                        <div v-if="editandoGradoId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando <strong>{{ formGrado.valor }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionGrado" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label">Grado</label>
                                <input type="text" class="form-control" v-model="formGrado.valor" placeholder="Ej: M.T.I."
                                    @keyup.enter="guardarGrado">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoGrado" @click="guardarGrado">
                                {{ editandoGradoId ? 'Guardar' : 'Agregar' }}
                            </button>
                            <button v-if="editandoGradoId" class="btn btn-outline-secondary" @click="cancelarEdicionGrado">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Grados registrados</h6>

                        <div v-if="cargandoGrados" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="grados.length === 0" class="text-muted text-center py-4">
                            Todavía no hay grados registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="g in grados" :key="g.id" :class="{ 'table-active': editandoGradoId === g.id }">
                                    <td>{{ g.valor }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarGrado(g)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarGradoConfirm(g)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- ── CCP OPCIONES  ── -->
                <div class="col-12 col-lg-8">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">
                            {{ editandoCcpId ? 'Editar destino' : 'Agregar destino de nota de copia' }}
                        </h6>

                        <div v-if="editandoCcpId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando <strong>{{ formCcp }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionCcp" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label">Destino</label>
                                <input type="text" class="form-control" v-model="formCcp" placeholder="Ej: Departamento de Planeación"
                                    @keyup.enter="guardarCcp">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoCcp" @click="guardarCcp">
                                {{ editandoCcpId ? 'Guardar' : 'Agregar' }}
                            </button>
                            <button v-if="editandoCcpId" class="btn btn-outline-secondary" @click="cancelarEdicionCcp">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Destinos registrados</h6>
                        

                        <div v-if="cargandoCcp" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="ccpOpciones.length === 0" class="text-muted text-center py-4">
                            Todavía no hay destinos registrados.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Destino</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="c in ccpOpciones" :key="c.id" :class="{ 'table-active': editandoCcpId === c.id }">
                                    <td>{{ c.etiqueta }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarCcp(c)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarCcpConfirm(c)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                                       </div>
                </div>

                <!-- ── TIPOS DE INCIDENCIA ── -->
                <div class="col-12 col-lg-7">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">{{ editandoTipoId ? 'Editar tipo de incidencia' : 'Agregar tipo de incidencia' }}</h6>
                        <div v-if="editandoTipoId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span><i class="bi bi-pencil-square me-1"></i> Editando <strong>{{ formTipo.valor }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionTipo" aria-label="Cancelar edición"></button>
                        </div>
                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label" for="nuevoTipoIncidencia">Tipo de incidencia</label>
                                <input id="nuevoTipoIncidencia" type="text" class="form-control" v-model="formTipo.valor"
                                    placeholder="Ej: Motivos personales…" @keyup.enter="guardarTipo">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoTipo" @click="guardarTipo">{{ editandoTipoId ? 'Guardar' : 'Agregar' }}</button>
                            <button v-if="editandoTipoId" class="btn btn-outline-secondary" @click="cancelarEdicionTipo">Cancelar</button>
                        </div>
                    </div>
                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Tipos de incidencia registrados</h6>
                        <div v-if="cargandoTipos" class="text-center py-4"><span class="spinner-border"></span></div>
                        <div v-else-if="tiposIncidencia.length === 0" class="text-muted text-center py-4">Todavía no hay tipos de incidencia registrados.</div>
                        <table v-else class="table align-middle">
                            <thead><tr><th>Tipo de incidencia</th><th class="text-end">Acciones</th></tr></thead>
                            <tbody>
                                <tr v-for="t in tiposIncidencia" :key="t.id" :class="{ 'table-active': editandoTipoId === t.id }">
                                    <td>{{ t.valor }}</td>
                                    <td class="text-end text-nowrap">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarTipo(t)" :aria-label="`Editar ${t.valor}`"><i class="bi bi-pencil"></i></button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarTipoConfirm(t)" :aria-label="`Eliminar ${t.valor}`"><i class="bi bi-trash"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                
                <!-- activideades complememntarias -->
                <div class="col-12 col-lg-5">
                    <div class="panel p-4 mb-3">
                        <h6 class="text-muted mb-3">
                            {{ editandoActividadId ? 'Editar actividad complementaria' : 'Agregar actividad complementaria' }}
                        </h6>

                        <div v-if="editandoActividadId" class="alert alert-warning d-flex justify-content-between align-items-center py-2 mb-3">
                            <span>Editando <strong>{{ formActividad.valor }}</strong></span>
                            <button type="button" class="btn-close" @click="cancelarEdicionActividad" aria-label="Cancelar edición"></button>
                        </div>

                        <div class="d-flex gap-2 align-items-end">
                            <div class="flex-fill">
                                <label class="form-label" for="nuevaActividad">Tipo de actividad</label>
                                <input id="nuevaActividad" type="text" class="form-control" v-model="formActividad.valor"
                                    placeholder="Ej: Cursos en línea" @keyup.enter="guardarActividad">
                            </div>
                            <button class="btn btn-primary" :disabled="guardandoActividad" @click="guardarActividad">
                                {{ editandoActividadId ? 'Guardar' : 'Agregar' }}
                            </button>
                            <button v-if="editandoActividadId" class="btn btn-outline-secondary" @click="cancelarEdicionActividad">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="panel p-4">
                        <h6 class="text-muted mb-3">Actividades complementarias registradas</h6>
                        

                        <div v-if="cargandoActividades" class="text-center py-4">
                            <span class="spinner-border"></span>
                        </div>

                        <div v-else-if="actividades.length === 0" class="text-muted text-center py-4">
                            Todavía no hay actividades registradas.
                        </div>

                        <table v-else class="table align-middle">
                            <thead>
                                <tr>
                                    <th>Tipo de actividad</th>
                                    <th class="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="a in actividades" :key="a.id" :class="{ 'table-active': editandoActividadId === a.id }">
                                    <td>{{ a.valor }}</td>
                                    <td class="text-end text-nowrap">
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editarActividad(a)" :aria-label="`Editar ${a.valor}`">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="eliminarActividadConfirm(a)" :aria-label="`Eliminar ${a.valor}`">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </AdminLayout>
</template>