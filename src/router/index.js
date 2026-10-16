import { createRouter, createWebHistory } from "vue-router";
import { useSesion } from "@/composables/UseSesion.js";
import Bienvenida from "../views/Bienvenida.vue";
import Dashboard from "../views/Dashboard.vue";
import BitacoraSecApo from "@/views/BitacoraSecApo.vue";
import Bitacora from "@/views/Bitacora.vue";
import EditarPlantilla from "@/views/EditarPlantilla.vue";
import Usuarios from "@/views/Usuarios.vue";
import NuevoDocumento from "@/views/NuevoDocumento.vue";
import EditarPlantillaDetalle from "@/views/EditarPlantillaDetalle.vue";
import FormatoDocumento from "@/views/FormatoDocumento.vue";
import VerDocumento from "@/views/VerDocumento.vue";
import FirmantesDestinatarios from "@/views/Firmantesdestinatarios.vue";
import FolioNumeracion from "@/views/FolioNumeracion.vue";
import Catalogo from "@/views/Catalogo.vue";
import Docentes from "@/views/Docentes.vue";
import BandejaAprobacion from "@/views/BandejaAprobacion.vue";
import Horarios from "@/views/Horarios.vue";
import Tutorias from "@/views/Tutorias.vue";

// Pantalla de inicio de cada rol 
export function inicioDe(rol) {
  return ["director", "subdirectora"].includes(rol) ? "bandejaaprobacion" : "dashboard";
}


function soloPara(roles, rutas) {
  return rutas.map((ruta) => ({ ...ruta, meta: { requiresAuth: true, roles } }));
}

const routes = [
  { path: "/", name: "bienvenida", component: Bienvenida },

  // qquienes elaboran documentos
  ...soloPara(["admin", "secretaria", "apoyo"], [
    { path: "/dashboard", name: "dashboard", component: Dashboard },
    { path: "/nuevo-documento/:tipo", name: "nuevo-documento", component: NuevoDocumento },
    { path: "/nuevo-documento/:tipo/editar/:id", name: "editar-documento", component: NuevoDocumento },
    { path: "/bitacorasecapo/ver/:id", name: "ver-documento", component: VerDocumento },
  ]),

  // solo admin 
  ...soloPara(["admin"], [
    { path: "/bitacora", name: "bitacora", component: Bitacora },
    { path: "/usuarios", name: "usuarios", component: Usuarios },
    { path: "/editarPlantilla", name: "editarPlantilla", component: EditarPlantilla },
    { path: "/editar-plantilla/:tipo", name: "editar-plantilla-detalle", component: EditarPlantillaDetalle },
    { path: "/formatodoc", name: "formatodoc", component: FormatoDocumento },
    { path: "/firmantes-destinatarios", name: "firmantes-destinatarios", component: FirmantesDestinatarios },
    { path: "/firmantes", redirect: "/firmantes-destinatarios" },
    { path: "/destinatarios", redirect: "/firmantes-destinatarios" },
    { path: "/docentes", name: "docentes", component: Docentes },
    { path: "/folionumeracion", name: "folionumeracion", component: FolioNumeracion },
    { path: "/catalogo", name: "catalogo", component: Catalogo },
    { path: "/horarios", name: "horarios", component: Horarios },
    { path: "/tutorias", name: "tutorias", component: Tutorias },
  ]),

  // sec y apo
  ...soloPara(["secretaria", "apoyo"], [
    { path: "/bitacorasecapo", name: "bitacorasecapo", component: BitacoraSecApo },
  ]),

  // dir /sub
  ...soloPara(["director", "subdirectora"], [
    { path: "/bandejaaprobacion", name: "bandejaaprobacion", component: BandejaAprobacion },
  ]),

  {
    path: "/:pathMatch(.*)*",
    name: "Error404",
    component: () => import("@/views/Error404.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});


router.beforeEach((to) => {
  const usuario = useSesion().getUsuarioActivo();

  if (to.meta.requiresAuth && !usuario) {
    return { name: "bienvenida", query: { redirect: to.fullPath } };
  }
  if (to.name === "bienvenida" && usuario) {
    return { name: inicioDe(usuario.rol) };
  }
  if (to.meta.roles && !to.meta.roles.includes(usuario.rol)) {
    return { name: inicioDe(usuario.rol) };
  }
  return true;
});

export default router;