<script setup>
import { ref } from 'vue'
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

let leftJson = ref(`{"status":200,"text":"","data":[{"news_id":51184,"title":"iPhone X Review: Innovative future with real black technology","source":"Netease phone"},{"news_id":51183,"title":"Traffic paradise: How to design streets for people and unmanned vehicles in the future?","source":"Netease smart","link":"http://netease.smart/traffic-paradise/1235"},{"news_id":51182,"title":"Teslamask's American Business Relations: The government does not pay billions to build factories","source":"AI Finance","members":["Daniel","Mike","John"]}],"data2":[{"news_id":51184,"title":"iPhone X Review: Innovative future with real black technology","source":"Netease phone"},{"news_id":51183,"title":"Traffic paradise: How to design streets for people and unmanned vehicles in the future?","source":"Netease smart","link":"http://netease.smart/traffic-paradise/1235"},{"news_id":51182,"title":"Teslamask's American Business Relations: The government does not pay billions to build factories","source":"AI Finance","members":["Daniel","Mike","John"]}]}`)
let rightJson = ref(`{"status":2100,"cc":"haha","text":"","error":null,"data":[{"newsdasd_id":51184,"title":"iPhone X Review: Innovative future with real asdablack technology","source":"Netease phone"},{"news_id":51183,"title":"Traffic paradiadsse: How to design streets for people and unmanned vehicles in the future?","source":"Netease smart","link":"http://netease.smart/traffic-paradise/123asda5"},{"news_id":51182,"title":"Teslamask's American Business Relations: The government does not pay billions to build factories","source":"AI Finance","aa":["Daniel","Mike","Johasdasn"]}]}`)

let jsonShowDialog = ref(false)
let jsonShowData = ref(JSON.stringify({}))

let tipShow = ref(false)
let tipMsg = ref("")

// 左侧
function formatterLeftJson() {
  if (parseLeftJson()) {
    leftJson.value = JSON.stringify(JSON.parse(leftJson.value), null, 2)
  }
}
function parseLeftJson() {
  try {
    JSON.parse(leftJson.value);
    return true
  } catch (e) {
    tipMsg.value = e
    tipShow.value = true
    return false;
  }
}
function removeEscapingLeftJson() {
  leftJson.value = unescapeJsonString(leftJson.value)
}
function addEscapingLeftJson() {
  leftJson.value = escapeJsonString(leftJson.value)
}
function copyLeftJson() {
  copyText(leftJson.value)
}

function openLeftViewer() {
  if (parseLeftJson()) {
    jsonShowData.value = JSON.parse(leftJson.value)
    jsonShowDialog.value = true
  }
}
function cleanLeftJson() {
  leftJson.value = ""
}
function compressLeftJson() {
  if (parseLeftJson()) {
    leftJson.value = JSON.stringify(JSON.parse(leftJson.value))
  }
}

// 右侧
function formatterRightJson() {
  if (parseRightJson()) {
    rightJson.value = JSON.stringify(JSON.parse(rightJson.value), null, 2)
  }
}
function parseRightJson() {
  try {
    JSON.parse(rightJson.value);
    return true
  } catch (e) {
    tipMsg.value = e
    tipShow.value = true
    return false;
  }
}
function removeEscapingRightJson() {
  rightJson.value = unescapeJsonString(rightJson.value)
}
function addEscapingRightJson() {
  rightJson.value = escapeJsonString(rightJson.value)
}
function copyRightJson() {
  copyText(rightJson.value)
}

function openRightViewer() {
  if (parseRightJson()) {
    jsonShowData.value = JSON.parse(rightJson.value)
    jsonShowDialog.value = true
  }
}
function cleanRightJson() {
  rightJson.value = ""
}

function compressRightJson() {
  if (parseRightJson()) {
    rightJson.value = JSON.stringify(JSON.parse(rightJson.value))
  }
}

function escapeJsonString(str) {
  return str.replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function unescapeJsonString(str) {
  return str.replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function copyText(dataStr) {
  navigator.clipboard.writeText(dataStr).then(() => {
    this.copySuccess = true;
    setTimeout(() => {
      this.copySuccess = false;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}


</script>

<template>

  <v-app>
    <v-app-bar :elevation="2" scroll-behavior="hide collapse">
      <template v-slot:prepend>
        <v-img class="ml-4" :width="45" aspect-ratio="4/3" cover src="/favicon.ico"
          title="powered by vue-json-pretty and jdd"></v-img>
      </template>

      <v-app-bar-title>AWESOME JSON</v-app-bar-title>
    </v-app-bar>

    <v-main class="ma-6">

      <div>
        <v-btn prepend-icon="mdi-file-compare" id="compare" color="indigo-darken-3" size="large">
          DIFF
        </v-btn>
      </div>

      <v-row>
        <!-- 左边 -->
        <v-col cols="12" md="6">
          <div class="d-flex mb-4 mt-4">
            <v-btn class="mr-1" density="comfortable" @click="formatterLeftJson">
              格式化
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="openLeftViewer">
              可视化
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="removeEscapingLeftJson">
              去转义
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="addEscapingLeftJson">
              转义
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="compressLeftJson">
              压缩
            </v-btn>
            <v-btn class="mr-1" color="secondary" density="comfortable" @click="copyLeftJson">
              复制
            </v-btn>
            <v-btn class="mr-1 " color="red" density="comfortable" @click="cleanLeftJson">
              清空
            </v-btn>
          </div>
          <v-sheet rounded="lg">
            <div>
              <v-textarea id="textarealeft" label="Left JSON" variant="outlined" rows="10" no-resize
                v-model="leftJson"></v-textarea>
              <pre id="errorLeft" class="error"></pre>
            </div>
          </v-sheet>
        </v-col>

        <!-- 右边 -->
        <v-col cols="12" md="6">
          <div class="d-flex mb-4 mt-4">
            <v-btn class="mr-1" density="comfortable" @click="formatterRightJson">
              格式化
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="openRightViewer">
              可视化
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="removeEscapingRightJson">
              去转义
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="addEscapingRightJson">
              转义
            </v-btn>
            <v-btn class="mr-1" density="comfortable" @click="compressRightJson">
              压缩
            </v-btn>
            <v-btn class="mr-1" color="secondary" density="comfortable" @click="copyRightJson">
              复制
            </v-btn>
            <v-btn class="mr-1 " color="red" density="comfortable" @click="cleanRightJson">
              清空
            </v-btn>
          </div>
          <v-sheet rounded="lg">
            <v-textarea id="textarearight" label="Right JSON" variant="outlined" rows="10" no-resize
              v-model="rightJson"></v-textarea>
            <pre id="errorRight" class="error"></pre>
          </v-sheet>
        </v-col>
      </v-row>


      <div class="initContainer">
      </div>


      <div class="diffcontainer ">
        <div id="report" class="">
        </div>
        <div>
          <pre id="out" class="left codeBlock "></pre>
          <pre id="out2" class="right codeBlock "></pre>
        </div>
        <ul id="toolbar" class="toolbar"></ul>

      </div>

    </v-main>

    <!-- json可视化 -->
    <v-dialog v-model="jsonShowDialog" min-width="80vw" min-height="80vh">
      <v-card prepend-icon="mdi-format-list-bulleted-type">
        <template v-slot:text>
          <vue-json-pretty :data=jsonShowData :deep="5" :show-double-quotes=true :show-length=true :virtual=true
            :height=500 :show-line=true :show-line-number=true :collapsed-on-click-brackets=true :show-icon=true
            :show-key-value-space=true style="position: relative" />
        </template>
        <template v-slot:actions>
          <v-btn class="ms-auto" icon="mdi-close" @click="leftJsonDialog = false"></v-btn>
        </template>
      </v-card>
    </v-dialog>

    <!-- 提示信息 -->
    <v-snackbar v-model="tipShow" :timeout=2000>
      {{ tipMsg }}
    </v-snackbar>
  </v-app>



</template>

<style scoped></style>
