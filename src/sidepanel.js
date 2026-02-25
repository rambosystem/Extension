import "./style.css";
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import Sidepanel from "./views/Sidepanel.vue";
import pinia from "./lokalise/stores";

const app = createApp(Sidepanel);
app.use(ElementPlus);
app.use(pinia);
app.mount("#app");
