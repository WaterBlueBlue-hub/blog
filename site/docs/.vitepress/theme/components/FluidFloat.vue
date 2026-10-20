<script setup lang="ts">
import FluidTank from './FluidTank.vue'
</script>

<template>
  <aside class="fluid-float" aria-label="流体演示">
    <FluidTank compact />
  </aside>
</template>

<style scoped>
.fluid-float {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 30;
  width: 390px;
  height: 240px;
}

@media (max-width: 1200px) {
  .fluid-float {
    right: 16px;
    bottom: 16px;
    width: 330px;
    height: 205px;
  }
}

@media (max-width: 720px) {
  .fluid-float {
    display: none;
  }
}

@media print {
  .fluid-float {
    display: none;
  }
}
</style>
