<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const root = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | undefined

function layout() {
  if (!root.value) return
  const hero = root.value.closest('.VPHero') as HTMLElement | null
  const container = hero?.querySelector('.container') as HTMLElement | null
  const main = root.value.parentElement
  if (!hero || !container || !main) return

  const heroRect = hero.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const mainRect = main.getBoundingClientRect()

  root.value.style.left = `${containerRect.left - mainRect.left}px`
  root.value.style.top = `${heroRect.bottom - mainRect.top - 94}px`
  root.value.style.width = `${containerRect.width}px`
}

onMounted(async () => {
  await nextTick()
  layout()
  requestAnimationFrame(layout)

  const hero = root.value?.closest('.VPHero')
  const container = hero?.querySelector('.container')
  resizeObserver = new ResizeObserver(layout)
  if (hero) resizeObserver.observe(hero)
  if (container) resizeObserver.observe(container)
  window.addEventListener('resize', layout)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', layout)
})
</script>

<template>
  <div ref="root" class="game-grove" aria-hidden="true">
    <div class="game-grove__scene game-grove__scene--terraria">
      <span class="terraria-bench">
        <i class="terraria-bench__top" />
        <i class="terraria-bench__leg terraria-bench__leg--left" />
        <i class="terraria-bench__leg terraria-bench__leg--right" />
        <i class="terraria-bench__torch" />
      </span>
      <img
        class="game-grove__sprite game-grove__guide"
        :src="withBase('/game-grove/terraria-guide.png')"
        alt=""
      />
      <span class="game-grove__label game-grove__label--terraria">泰拉瑞亚</span>
    </div>

    <div class="game-grove__scene game-grove__scene--stardew">
      <span class="game-grove__junimo game-grove__junimo--blue">
        <img :src="withBase('/game-grove/stardew-junimo-blue.png')" alt="" />
      </span>
      <span class="game-grove__junimo game-grove__junimo--orange">
        <img :src="withBase('/game-grove/stardew-junimo-orange.png')" alt="" />
      </span>
      <span class="game-grove__junimo game-grove__junimo--purple">
        <img :src="withBase('/game-grove/stardew-junimo-purple.png')" alt="" />
      </span>
      <img
        class="game-grove__star"
        :src="withBase('/game-grove/stardew-junimo-star.png')"
        alt=""
      />
      <img
        class="game-grove__sprite game-grove__junimo-hut"
        :src="withBase('/game-grove/stardew-junimo-hut.png')"
        alt=""
      />
      <span class="game-grove__label game-grove__label--stardew">星露谷物语</span>
    </div>

    <div class="game-grove__scene game-grove__scene--minecraft">
      <img
        class="game-grove__block game-grove__block--leaves"
        :src="withBase('/game-grove/minecraft-cherry-leaves.png')"
        alt=""
      />
      <img
        class="game-grove__block game-grove__block--table"
        :src="withBase('/game-grove/minecraft-crafting-table.png')"
        alt=""
      />
      <img
        class="game-grove__block game-grove__block--stone"
        :src="withBase('/game-grove/minecraft-stone.png')"
        alt=""
      />
      <span class="game-grove__label game-grove__label--minecraft">我的世界</span>
    </div>
  </div>
</template>

<style scoped>
.game-grove {
  position: absolute;
  z-index: 1;
  height: 112px;
  pointer-events: none;
}

.game-grove__scene {
  position: absolute;
  bottom: 0;
  width: 150px;
  height: 96px;
  animation: grove-drift 5.2s ease-in-out infinite;
}

.game-grove__scene::after {
  content: '';
  position: absolute;
  right: 24px;
  bottom: 17px;
  left: 24px;
  height: 10px;
  border-radius: 50%;
  background: rgba(81, 74, 91, 0.1);
  filter: blur(4px);
}

.game-grove__scene--terraria {
  left: 27%;
  animation-delay: -1.4s;
}

.game-grove__scene--stardew {
  left: 46%;
  animation-delay: -3.2s;
}

.game-grove__scene--minecraft {
  left: 66%;
  animation-delay: -0.6s;
}

.game-grove__sprite,
.game-grove__junimo img,
.game-grove__block {
  position: absolute;
  display: block;
  image-rendering: pixelated;
  filter: drop-shadow(0 5px 4px rgba(67, 48, 70, 0.18));
  user-select: none;
}

.game-grove__label {
  position: absolute;
  z-index: 3;
  bottom: 0;
  left: 50%;
  padding: 3px 8px 4px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 5px;
  background: rgba(42, 44, 57, 0.7);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 5px 13px -8px rgba(31, 31, 44, 0.7);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.7px;
  line-height: 1;
  white-space: nowrap;
  transform: translateX(-50%);
}

.game-grove__label--terraria {
  border-color: rgba(224, 190, 142, 0.62);
}

.game-grove__label--stardew {
  border-color: rgba(170, 217, 137, 0.66);
}

.game-grove__label--minecraft {
  border-color: rgba(235, 175, 201, 0.66);
}

.game-grove__guide {
  bottom: 18px;
  left: 82px;
  width: 36px;
  height: 64px;
}

.terraria-bench {
  position: absolute;
  bottom: 18px;
  left: 27px;
  width: 62px;
  height: 58px;
}

.terraria-bench__top {
  position: absolute;
  top: 17px;
  left: 0;
  width: 58px;
  height: 13px;
  border: 2px solid #4d3021;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 48%),
    repeating-linear-gradient(90deg, #a66d3c 0 12px, #82522e 12px 15px);
  box-shadow:
    inset 0 -4px #674029,
    3px 4px 0 rgba(62, 40, 31, 0.24);
}

.terraria-bench__leg {
  position: absolute;
  top: 32px;
  width: 8px;
  height: 25px;
  background: #724328;
  box-shadow: inset -3px 0 #4f2e20;
}

.terraria-bench__leg--left {
  left: 5px;
}

.terraria-bench__leg--right {
  right: 6px;
}

.terraria-bench__torch {
  position: absolute;
  top: -13px;
  right: 4px;
  width: 5px;
  height: 25px;
  background: #6c4529;
  box-shadow:
    -3px -8px 0 1px #ffd35c,
    -6px -12px 0 0 rgba(255, 181, 78, 0.76),
    3px -8px 0 0 rgba(255, 239, 148, 0.66);
}

.game-grove__junimo-hut {
  bottom: 17px;
  left: 36px;
  width: 68px;
  height: 68px;
}

.game-grove__junimo {
  position: absolute;
  z-index: 2;
  width: 24px;
  height: 24px;
  animation: grove-sway 2.8s ease-in-out infinite;
}

.game-grove__junimo img {
  position: static;
  width: 100%;
  height: 100%;
}

.game-grove__junimo--blue {
  bottom: 30px;
  left: 20px;
}

.game-grove__junimo--orange {
  right: 19px;
  bottom: 24px;
  animation-delay: -0.8s;
}

.game-grove__junimo--purple {
  right: 5px;
  bottom: 48px;
  animation-delay: -1.7s;
}

.game-grove__star {
  position: absolute;
  z-index: 2;
  top: 7px;
  left: 27px;
  width: 18px;
  height: 18px;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 3px rgba(122, 81, 35, 0.28));
  animation: grove-star 3.2s ease-in-out infinite;
}

.game-grove__block {
  width: 39px;
  height: 39px;
  object-fit: contain;
}

.game-grove__block--leaves {
  top: 10px;
  left: 14px;
  width: 48px;
  height: 48px;
}

.game-grove__block--table {
  bottom: 28px;
  left: 42px;
  z-index: 2;
}

.game-grove__block--stone {
  right: 21px;
  bottom: 18px;
  width: 44px;
  height: 44px;
}

@keyframes grove-drift {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes grove-sway {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-2px) rotate(2deg);
  }
}

@keyframes grove-star {
  0%,
  100% {
    transform: translateY(0) rotate(-3deg);
  }
  50% {
    transform: translateY(-4px) rotate(3deg);
  }
}

@media (max-width: 1180px) {
  .game-grove {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-grove__scene,
  .game-grove__junimo,
  .game-grove__star {
    animation: none;
  }
}
</style>
