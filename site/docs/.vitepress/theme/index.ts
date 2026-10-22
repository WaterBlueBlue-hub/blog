import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import { withBase } from 'vitepress'
import './custom.css'
import FluidTank from './components/FluidTank.vue'
import FluidFloat from './components/FluidFloat.vue'
import HeroGrass from './components/HeroGrass.vue'
import GameGrove from './components/GameGrove.vue'
import SakuraPetals from './components/SakuraPetals.vue'
import ContactButtons from './components/ContactButtons.vue'
import PetAssistant from './components/PetAssistant.vue'
import ProjectFeed from './components/ProjectFeed.vue'
import ArticleFeed from './components/ArticleFeed.vue'
import NoteFeed from './components/NoteFeed.vue'
import PaperLibrary from './components/PaperLibrary.vue'

export default {
  extends: DefaultTheme,
  // 全站背景樱花：挂在布局最上层的一个固定画布（层级由 CSS 控制，正文在它上面）
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-top': () => h(SakuraPetals),
      'home-hero-info-before': () =>
        h('div', { class: 'hero-portrait' }, [
          h('img', {
            src: withBase('/avatar.webp'),
            alt: 'WaterBlueBlue',
            width: 88,
            height: 88,
          }),
        ]),
      'home-hero-info-after': () => [h(HeroGrass), h(GameGrove)],
      'home-hero-actions-after': () => h(ContactButtons),
      'home-hero-image': () => h(FluidFloat),
      'layout-bottom': () => h(PetAssistant),
    }),
  enhanceApp(ctx: any) {
    ctx.app.component('FluidTank', FluidTank)
    ctx.app.component('FluidFloat', FluidFloat)
    ctx.app.component('PetAssistant', PetAssistant)
    ctx.app.component('ProjectFeed', ProjectFeed)
    ctx.app.component('ArticleFeed', ArticleFeed)
    ctx.app.component('NoteFeed', NoteFeed)
    ctx.app.component('PaperLibrary', PaperLibrary)
  },
}
