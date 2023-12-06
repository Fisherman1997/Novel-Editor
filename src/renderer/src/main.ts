import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import App from './App.vue'

async function bootstrap() {
    const app = createApp(App)
    // setElComponents(app)
    app.use(createPinia())
    app.mount('#app')
}
bootstrap();
