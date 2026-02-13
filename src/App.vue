<script setup>
import { useRouter } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'

const router = useRouter()

function onBeforeUnload(e) {
  const editors = document.querySelectorAll('.cm-content')
  const hasContent = Array.from(editors).some(el => el.textContent.trim())
  if (hasContent) {
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

      <div class="ml-16" style="padding-left: 120px;">
        <v-btn variant="text" to="/" prepend-icon="mdi-home" exact
          :color="$route.path === '/' ? 'indigo-darken-3' : undefined"
          :class="{ 'font-weight-bold': $route.path === '/' }">主页</v-btn>
        <v-btn variant="text" to="/diff" prepend-icon="mdi-file-compare"
          :color="$route.path === '/diff' ? 'indigo-darken-3' : undefined"
          :class="{ 'font-weight-bold': $route.path === '/diff' }">DIFF</v-btn>
      </div>

      <v-spacer />

      <template v-slot:append>
        <v-btn icon="mdi-github" variant="text" href="https://github.com/EthonWang/awesome-json" target="_blank"></v-btn>
      </template>
    </v-app-bar>

    <router-view />
  </v-app>
</template>

<style>
.json-viewer-tree {
  padding: 12px;
}
.json-viewer-tree .vjs-tree-node {
  padding-left: 50px !important;
}
.json-viewer-tree .vjs-node-index {
  width: 40px;
  text-align: right;
  margin-right: 8px;
}
</style>
