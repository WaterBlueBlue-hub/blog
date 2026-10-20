import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './custom.css'
import FluidTank from './components/FluidTank.vue'
import FluidFloat from './components/FluidFloat.vue'
import SakuraPetals from './components/SakuraPetals.vue'
import ContactButtons from './components/ContactButtons.vue'

export default {
  extends: DefaultTheme,
  // 全站背景樱花：挂在布局最上层的一个固定画布（层级由 CSS 控制，正文在它上面）
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-top': () => h(SakuraPetals),
      'home-hero-actions-after': () => h(ContactButtons),
      'home-hero-image': () => h(FluidFloat),
    }),
  enhanceApp(ctx: any) {
    ctx.app.component('FluidTank', FluidTank)
    ctx.app.component('FluidFloat', FluidFloat)
  },
}
