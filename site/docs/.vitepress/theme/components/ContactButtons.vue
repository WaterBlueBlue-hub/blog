<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

type Contact = {
  id: string
  label: string
  value: string
  icon: string
  pending?: boolean
}

/**
 * 账号集中放在这里：以后换号只改 value。
 */
const contacts: Contact[] = [
  { id: 'qq', label: 'QQ', value: '205908757', icon: 'qq' },
  { id: 'wechat', label: '微信', value: 'ikun1122333322111', icon: 'wechat' },
  { id: 'github', label: 'GitHub', value: 'WaterBlueBlue-hub', icon: 'github' },
  { id: 'email', label: '邮箱', value: '205908757@qq.com', icon: 'email' },
  { id: 'bilibili', label: 'B站', value: 'https://space.bilibili.com/494748666', icon: 'bilibili' },
  { id: 'limbus', label: '边狱', value: 'J907031978', icon: 'limbus' },
]

/* Simple Icons（CC0）里的品牌路径；邮箱是通用信封 */
const paths: Record<string, string> = {
  qq: 'M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673',
  wechat:
    'M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  bilibili:
    'M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z',
  email:
    'M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2-.5 7.8 6.1L19.8 5H4.2Zm15.8 1.7-7.3 5.7a1 1 0 0 1-1.4 0L4 6.7V18.5c0 .3.2.5.5.5h15c.3 0 .5-.2.5-.5V6.7Z',
}

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(text: string) {
  toast.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1900)
}

function fallbackCopy(value: string) {
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  area.style.pointerEvents = 'none'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

async function copyContact(item: Contact) {
  if (!item.value) {
    showToast(`${item.label}账号待补充`)
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.value)
    } else {
      fallbackCopy(item.value)
    }
    showToast(`已复制 ${item.label}：${item.value}`)
  } catch {
    try {
      fallbackCopy(item.value)
      showToast(`已复制 ${item.label}：${item.value}`)
    } catch {
      showToast('复制失败，请手动选择账号')
    }
  }
}

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="contact-row" aria-label="联系方式">
    <button
      v-for="item in contacts"
      :key="item.id"
      type="button"
      class="contact-item"
      :class="{ 'is-pending': item.pending }"
      :aria-label="item.value ? `${item.label}：${item.value}，点击复制` : `${item.label}：待补充`"
      :title="item.value ? `${item.label}：${item.value}（点击复制）` : `${item.label}：待补充`"
      @click="copyContact(item)"
    >
      <span class="contact-icon">
        <img v-if="item.icon === 'limbus'" src="/icons/limbus.webp" alt="" />
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path :d="paths[item.icon]" />
        </svg>
      </span>
      <span class="contact-label">{{ item.label }}</span>
    </button>

    <Transition name="contact-toast">
      <div v-if="toast" class="contact-toast" role="status" aria-live="polite">
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.contact-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
}

.contact-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 46px;
  padding: 0;
  border: 0;
  background: none;
  color: #475569;
  font: inherit;
  line-height: 1;
  cursor: pointer;
}

.contact-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 10px 24px -20px rgba(80, 40, 60, 0.65);
  -webkit-backdrop-filter: blur(10px) saturate(1.12);
  backdrop-filter: blur(10px) saturate(1.12);
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.contact-icon svg {
  width: 19px;
  height: 19px;
  fill: currentColor;
}

.contact-icon img {
  width: 27px;
  height: 27px;
  object-fit: contain;
}

.contact-label {
  max-width: 56px;
  overflow: hidden;
  color: var(--vp-c-text-2);
  font-size: 10.5px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-item:hover .contact-icon,
.contact-item:focus-visible .contact-icon {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  background: rgba(255, 255, 255, 0.74);
  color: var(--vp-c-brand-1);
  box-shadow: 0 14px 28px -20px rgba(47, 109, 246, 0.55);
}

.contact-item:hover .contact-label,
.contact-item:focus-visible .contact-label {
  color: var(--vp-c-brand-1);
}

.contact-item:focus-visible {
  outline: none;
}

.contact-item.is-pending .contact-icon {
  opacity: 0.62;
  border-style: dashed;
}

.dark .contact-item {
  color: rgba(255, 255, 255, 0.78);
}

.dark .contact-icon {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(16, 18, 30, 0.5);
  box-shadow: 0 12px 26px -20px rgba(0, 0, 0, 0.8);
}

.dark .contact-item:hover .contact-icon,
.dark .contact-item:focus-visible .contact-icon {
  border-color: var(--vp-c-brand-2);
  background: rgba(255, 255, 255, 0.14);
  color: var(--vp-c-brand-2);
}

.contact-toast {
  position: fixed;
  left: 50%;
  bottom: 30px;
  z-index: 1000;
  max-width: min(86vw, 420px);
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(20, 24, 36, 0.84);
  color: #fff;
  box-shadow: 0 16px 40px -22px rgba(0, 0, 0, 0.7);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  pointer-events: none;
  transform: translateX(-50%);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.contact-toast-enter-active,
.contact-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.contact-toast-enter-from,
.contact-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 959px) {
  .contact-row {
    justify-content: center;
  }
}
</style>
