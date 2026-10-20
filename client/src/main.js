import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/onest';
import './styles/base.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';

createApp(App).use(router).mount('#app');
