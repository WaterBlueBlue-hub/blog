import DefaultTheme from 'vitepress/theme'
import './custom.css'
import FluidTank from './components/FluidTank.vue'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx: any) {
    ctx.app.component('FluidTank', FluidTank)
  },
}
