import { createApp } from 'vue'
import { createPinia } from 'pinia'
// import { setElComponents } from './utils/element_puls'
import App from './App.vue'

async function bootstrap() {
    const app = createApp(App)
    // setElComponents(app)
    app.use(createPinia())
    app.mount('#app')
}
bootstrap();
