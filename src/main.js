import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

//bootstrap
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

// estilo plantilla
import "./assets/css/style.css";

// tipografiaas
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans/400-italic.css";
import "@fontsource/noto-sans/700-italic.css";

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/400-italic.css'
import '@fontsource/montserrat/700-italic.css'

import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/400-italic.css'
import '@fontsource/roboto/700-italic.css'

import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/open-sans/400-italic.css'
import '@fontsource/open-sans/700-italic.css'

import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/lato/400-italic.css'
import '@fontsource/lato/700-italic.css'

import '@fontsource/poppins/400.css'
import '@fontsource/poppins/700.css'
import '@fontsource/poppins/400-italic.css'
import '@fontsource/poppins/700-italic.css'

const app = createApp(App);

app.use(router);

app.mount("#app");
