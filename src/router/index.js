import { createRouter, createWebHistory } from "vue-router";
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
import Firmantes from "@/views/Firmantes.vue";
import Destinatarios from "@/views/Destinatarios.vue";
import FolioNumeracion from "@/views/FolioNumeracion.vue";
import Catalogo from "@/views/Catalogo.vue";
import Docentes from "@/views/Docentes.vue";
import BandejaAprobacion from "@/views/BandejaAprobacion.vue";
import Horarios from "@/views/Horarios.vue";
import Tutorias from "@/views/Tutorias.vue";

const routes = [
  {
    path: "/",
    name: "bienvenida",
    component: Bienvenida,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
  },
  {
    path: "/bitacorasecapo",
    name: "bitacorasecapo",
    component: BitacoraSecApo,
  },
  {
    path: "/bitacora",
    name: "bitacora",
    component: Bitacora,
  },
  {
    path: "/editarPlantilla",
    name: "editarPlantilla",
    component: EditarPlantilla,
  },
  {
    path: "/usuarios",
    name: "usuarios",
    component: Usuarios,
  },
  {
    path: "/:pathMatch(.*)*",
    name: "Error404",
    component: () => import("@/views/Error404.vue"),
  },
  {
    path: "/nuevo-documento/:tipo",
    name: "nuevo-documento",
    component: NuevoDocumento,
  },
  {
    path: "/nuevo-documento/:tipo/editar/:id",
    name: "editar-documento",
    component: NuevoDocumento,
  },
  {
    path: "/editar-plantilla/:tipo",
    name: "editar-plantilla-detalle",
    component: EditarPlantillaDetalle,
  },
  {
    path: "/formatodoc",
    name: "formatodoc",
    component: FormatoDocumento,
  },
  {
    path: "/bitacorasecapo/ver/:id",
    name: "ver-documento",
    component: VerDocumento,
  },
  {
    path: "/firmantes",
    name: "firmantes",
    component: Firmantes,
  },
  {
    path: "/destinatarios",
    name: "destinatarios",
    component: Destinatarios,
  },
  {
    path: "/folionumeracion",
    name: "folionumeracion",
    component: FolioNumeracion,
  },
  {
    path: "/catalogo",
    name: "catalogo",
    component: Catalogo,
  },
  {
    path: "/docentes",
    name: "docentes",
    component: Docentes,
  },
  {
    path: "/bandejaaprobacion",
    name: "bandejaaprobacion",
    component: BandejaAprobacion,
  },
  {
    path: "/horarios",
    name: "horarios",
    component: Horarios,
  },
  {
    path: "/tutorias",
    name: "tutorias",
    component: Tutorias,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;