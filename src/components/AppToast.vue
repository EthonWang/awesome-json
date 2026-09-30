<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  message: { type: String, default: '' },
  type: { type: String, default: 'info' },
})

const emit = defineEmits(['update:modelValue'])

const icons = {
  success: 'mdi-check-circle-outline',
  error: 'mdi-alert-circle-outline',
  warning: 'mdi-alert-outline',
  info: 'mdi-information-outline',
}
</script>

<template>
  <v-snackbar
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :color="type"
    variant="tonal"
    location="bottom right"
    :timeout="type === 'error' ? 5000 : 3000"
    :role="type === 'error' ? 'alert' : 'status'"
  >
    <div class="d-flex align-center ga-2">
      <v-icon :icon="icons[type] || icons.info" size="20" />
      <span>{{ message }}</span>
    </div>
    <template #actions>
      <v-btn icon="mdi-close" variant="text" size="small" aria-label="关闭提示" @click="emit('update:modelValue', false)" />
    </template>
  </v-snackbar>
</template>
