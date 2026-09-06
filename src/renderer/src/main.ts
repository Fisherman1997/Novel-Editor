import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/global.less'
import App from './App.vue'
import { setupErrorHandler } from './utils/errorHandler'

async function bootstrap() {
  const app = createApp(App)

  // 安装插件
  app.use(createPinia())
  app.use(ElementPlus)

  // 设置错误处理
  setupErrorHandler(app)

  // 挂载应用
  app.mount('#app')
}

bootstrap()
