import "./style.css";
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import Options from "./Options.vue";
import pinia from "./stores";

const app = createApp(Options);
app.use(ElementPlus);
app.use(pinia);
app.mount("#app");
