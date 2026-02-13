<script setup>
</script>

<template>
  <v-main class="ma-6">
    <v-container>
      <v-row justify="center">
        <v-col cols="12" md="8" class="text-center">
          <v-icon size="80" color="indigo-darken-3" class="mb-4">mdi-code-json</v-icon>
          <h1 class="text-h3 font-weight-bold mb-4">Awesome JSON</h1>
          <p class="text-h6 text-medium-emphasis mb-8">强大的在线 JSON 工具集</p>
          <v-row justify="center" class="ga-4">
            <v-col cols="12" sm="4">
              <v-card variant="outlined" class="pa-4" hover to="/diff">
                <v-icon size="40" color="indigo" class="mb-2">mdi-file-compare</v-icon>
                <h3 class="text-h6 mb-1">JSON Diff</h3>
                <p class="text-body-2 text-medium-emphasis">对比两段 JSON 的差异，支持差异高亮和跳转</p>
              </v-card>
            </v-col>
            <v-col cols="12" sm="4">
              <v-card variant="outlined" class="pa-4 text-medium-emphasis">
                <v-icon size="40" class="mb-2">mdi-tools</v-icon>
                <h3 class="text-h6 mb-1">更多功能</h3>
                <p class="text-body-2">敬请期待...</p>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>
