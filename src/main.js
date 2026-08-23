import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

//bootstrap
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

// estilo plantilla
import "./assets/css/style.css";

//noto tipografiaa
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans/400-italic.css";
import "@fontsource/noto-sans/700-italic.css";

const app = createApp(App);

app.use(router);

app.mount("#app");
