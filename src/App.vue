<script setup>
import { useRouter } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'

const router = useRouter()

function onBeforeUnload(e) {
  const textareas = document.querySelectorAll('textarea')
  const taHasContent = Array.from(textareas).some(el => el.value.trim())

  const cmContents = document.querySelectorAll('.cm-content')
  const cmHasContent = Array.from(cmContents).some(el => {
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.cm-placeholder').forEach(p => p.remove())
    return clone.textContent.trim()
  })

  if (cmHasContent || taHasContent) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <v-app>
    <v-app-bar :elevation="2">
      <template v-slot:prepend>
        <v-img class="ml-4" :width="45" aspect-ratio="4/3" cover src="/favicon.ico"
          title="Awesome JSON" style="cursor: pointer;" @click="router.push('/')"></v-img>
      </template>
      <v-app-bar-title class="font-weight-bold" style="flex: 0 0 auto; max-width: fit-content;">AWESOME JSON</v-app-bar-title>

      <div class="ml-6 d-flex align-center flex-nowrap">
        <v-btn variant="text" to="/" prepend-icon="mdi-pencil-box-outline" exact
          :color="$route.path === '/' ? 'indigo-darken-3' : undefined"
          :class="{ 'font-weight-bold': $route.path === '/' }">编辑</v-btn>
        <v-btn variant="text" to="/diff" prepend-icon="mdi-file-swap-outline"
          :color="$route.path === '/diff' ? 'indigo-darken-3' : undefined"
          :class="{ 'font-weight-bold': $route.path === '/diff' }">DIFF</v-btn>
      </div>

      <v-spacer />
    </v-app-bar>

    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </v-app>
</template>

<style>
.json-viewer-tree {
  padding: 12px;
}
.json-viewer-tree .vjs-tree-node {
  padding-left: 0 !important;
}
.json-viewer-tree .vjs-node-index {
  position: static;
  text-align: right;
  margin-right: 4px;
  flex-shrink: 0;
  color: #999;
  user-select: none;
}
</style>
