/** @format */

import { Plugin } from '../plugin'
// fs-extra替代 Node内置 fs 模块
import { readFile } from 'fs-extra'
import { ServerContext } from '../server/index'
import { isVue } from '../utils'
import createDebug from 'debug'
import {
  parse,
  compileTemplate,
  compileScript,
  rewriteDefault,
} from '@vue/compiler-sfc'
const debug = createDebug('dev')
const doParse = (code, id) => {
  return parse(code, {
    filename: id,
    sourceMap: true,
  })
}
const doScript = (descriptor, id) => {
  let scriptCode = `const _sfc_main = {}`
  let map: any
  const script = compileScript(descriptor, {
    id,
    sourceMap: true,
  })

  if ((!script.lang || script.lang === 'ts') && !script.src) {
    scriptCode = rewriteDefault(
      script.content,
      '_sfc_main',
      script.lang === 'ts'
        ? ['typescript']
        : script.lang === 'tsx'
        ? ['typescript', 'jsx']
        : undefined,
    )
    map = script.map
  } else {
    // 有 src 的情况不看
    // if (script.src) {
    //   await linkSrcToDescriptor(script.src, descriptor, pluginContext)
    // }
    // const src = script.src || descriptor.filename
    // const langFallback = 'js'
    // const attrsQuery = attrsToQuery(script.attrs, langFallback)
    // const srcQuery = script.src ? `&src` : ``
    // const query = `?vue&type=script${srcQuery}${attrsQuery}`
    // const request = JSON.stringify(src + query)
    // scriptCode =
    //   `import _sfc_main from ${request}\n` + `export * from ${request}` // support named exports
  }
  return {
    code: scriptCode,
    map: map as any,
  }
}
const doTemplate = (descriptor, id) => {
  const hasScoped = descriptor.styles.some((s) => s.scoped)
  const template: any = descriptor.template!
  const result = compileTemplate({
    source: template.content,
    filename: id,
    id: descriptor.id,
    scoped: hasScoped,
    compilerOptions: {
      sourceMap: true,
      scopeId: hasScoped ? `data-v-${id}` : undefined,
    },
  })
  return {
    ...result,
    code: result.code.replace(
      /\nexport (function|const) (render|ssrRender)/,
      '\n$1 _sfc_$2',
    ),
  }
}
export function vueHMRPlugin(): Plugin {
  let serverContext: ServerContext
  return {
    name: 'm-vite:vue-hot',
    configureServer(s) {
      serverContext = s
    },
    resolveId() {
      return null
    },
    async load(id) {
      if (isVue(id)) {
        // 读取 vue 文件
        return readFile(id, 'utf-8')
      }
    },
    async transform(code, id) {
      if (isVue(id) && !id.includes('node_modules')) {
        // 解析 vue 文件
        const { descriptor, errors } = doParse(code, id)

        // 错误处理
        if (errors.length) {
          errors.forEach((error) => debug(error))
          return null
        }
        // 处理 js
        let { code: scriptCode, map } = doScript(descriptor, id)
        // 处理 template
        let { code: templateCode, map: templateMap } = doTemplate(
          descriptor,
          id,
        )
        // 处理 style
        const hasScoped = descriptor.styles.some((s) => s.scoped)
        return { code: '1' }
      }
      return null
    },
  }
}
