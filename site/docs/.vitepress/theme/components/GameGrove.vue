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
  const grass = hero.querySelector('.hero-grass') as HTMLElement | null
  const flowerRoot = grass?.getBoundingClientRect().bottom
    ?? heroRect.bottom - Math.max(46, Math.min(72, window.innerWidth * 0.05)) / 2 + 4

  root.value.style.left = `${containerRect.left - mainRect.left}px`
  root.value.style.top = `${flowerRoot - mainRect.top - 102}px`
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
    <img
      class="game-grove__ground"
      :src="withBase('/game-grove/pixel-ground.png')"
      alt=""
    />

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
      <img
        class="game-grove__sprite game-grove__steve"
        :src="withBase('/game-grove/minecraft-steve.png')"
        alt=""
      />
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

.game-grove__ground {
  position: absolute;
  z-index: 0;
  top: 95px;
  left: 0;
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  opacity: 0.96;
  pointer-events: none;
  user-select: none;
}

.game-grove__scene {
  position: absolute;
  z-index: 2;
  bottom: 0;
  width: 166px;
  height: 96px;
  animation: grove-drift 5.2s ease-in-out infinite;
}

.game-grove__scene::after {
  content: '';
  position: absolute;
  right: 24px;
  bottom: 6px;
  left: 24px;
  height: 7px;
  border-radius: 50%;
  background: rgba(81, 74, 91, 0.1);
  filter: blur(4px);
}

.game-grove__scene--stardew {
  left: 46%;
  animation-delay: -3.2s;
}

.game-grove__scene--minecraft {
  left: 65%;
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

.game-grove__junimo-hut {
  bottom: 10px;
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
  top: 0;
  left: 10px;
  width: 48px;
  height: 48px;
}

.game-grove__block--table {
  bottom: 10px;
  left: 38px;
  z-index: 2;
}

.game-grove__block--stone {
  right: 10px;
  bottom: 10px;
  width: 39px;
  height: 39px;
}

.game-grove__steve {
  bottom: 10px;
  left: 86px;
  width: 35px;
  height: 79px;
  animation: grove-idle 3.8s ease-in-out infinite;
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

@keyframes grove-idle {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
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
  .game-grove__star,
  .game-grove__steve {
    animation: none;
  }
}
</style>
