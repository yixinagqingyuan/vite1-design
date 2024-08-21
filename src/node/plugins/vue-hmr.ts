/** @format */

import { Plugin } from '../plugin'
import path from 'node:path'
// fs-extra替代 Node内置 fs 模块
import { readFile, writeFile } from 'fs-extra'
import { ServerContext } from '../server/index'
import { isVue, getHash, parseVueRequest } from '../utils'
import createDebug from 'debug'
import { transformWithEsbuild } from 'vite'
import {
  parse,
  compileTemplate,
  compileScript,
  rewriteDefault,
  SFCBlock,
  SFCDescriptor,
  SFCScriptBlock,
} from '@vue/compiler-sfc'
declare module '@vue/compiler-sfc' {
  interface SFCDescriptor {
    id: string
  }
}
const ignoreList = [
  'id',
  'index',
  'src',
  'type',
  'lang',
  'module',
  'scoped',
  'generic',
]

let clientCache = new WeakMap<SFCDescriptor, SFCScriptBlock | null>()

export function getResolvedScript(
  descriptor: SFCDescriptor,
): SFCScriptBlock | null | undefined {
  return (clientCache).get(descriptor)
}

export function setResolvedScript(
  descriptor: SFCDescriptor,
  script: SFCScriptBlock,
): void {
  clientCache.set(descriptor, script)
}

export function resolveTemplateCompilerOptions(
  descriptor: SFCDescriptor,
) {
  const resolvedScript = getResolvedScript(descriptor)
  const hasScoped = descriptor.styles.some((style) => style.scoped)

  return {
    scoped: hasScoped,
    compilerOptions: {
      sourceMap: true,
      scopeId: hasScoped ? `data-v-${descriptor.id}` : undefined,
      bindingMetadata: resolvedScript ? resolvedScript.bindings : undefined,
    },
  }
}

const debug = createDebug('dev')
const createDescriptor = (code, id) => {
  const { descriptor, errors } = parse(code, {
    filename: id,
    sourceMap: true,
  })
  descriptor.id = getHash(id)
  return { descriptor, errors }
}
function attrsToQuery(
  attrs: SFCBlock['attrs'],
  langFallback?: string,
  forceLangFallback = false,
): string {
  let query = ``
  for (const name in attrs) {
    const value = attrs[name]
    if (!ignoreList.includes(name)) {
      query += `&${encodeURIComponent(name)}${
        value ? `=${encodeURIComponent(value)}` : ``
      }`
    }
  }
  if (langFallback || attrs.lang) {
    query +=
      `lang` in attrs
        ? forceLangFallback
          ? `&lang.${langFallback}`
          : `&lang.${attrs.lang}`
        : `&lang.${langFallback}`
  }
  return query
}

const genScriptCode = (descriptor, id) => {
  const hasScoped = descriptor.styles.some((style) => style.scoped)
  let scriptCode = `const _sfc_main = {}`
  let map: any
  // console.log(descriptor,'descriptor')
  const script = compileScript(descriptor, {
    id: descriptor.id,
    isProd: false,
    sourceMap: true,
    templateOptions: {
      filename: id,
      isProd: false,
      scoped: hasScoped,
      id: descriptor.id,
      compilerOptions: {
        sourceMap: true,
      },
    },
  })
  scriptCode = script.content
  map = script.map
  setResolvedScript(descriptor,script)
  return {
    code: scriptCode,
    map: map as any,
  }
}
const genTemplateCode = (descriptor, id) => {
  const template = descriptor.template!

  const result = compileTemplate({
    source: template.content,
    filename: descriptor.filename,
    id: descriptor.id,
    ...resolveTemplateCompilerOptions(descriptor),
  })
  return {
    ...result,
    code: result.code.replace(
      /\nexport (function|const) (render|ssrRender)/,
      '\n$1 _sfc_$2',
    ),
  }
}
const genStyleCode = (descriptor, id) => {
  let stylesCode = ``
  if (descriptor.styles.length) {
    for (let i = 0; i < descriptor.styles.length; i++) {
      const style = descriptor.styles[i]
      const src = style.src || descriptor.filename
      const attrsQuery = attrsToQuery(style.attrs, 'css')
      const srcQuery = style.src
        ? style.scoped
          ? `&src=${descriptor.id}`
          : '&src=true'
        : ''
      const scopedQuery = style.scoped ? `&scoped=${descriptor.id}` : ``
      const query = `?vue&type=style&index=${i}${srcQuery}${scopedQuery}`
      const styleRequest = src + query + attrsQuery
      if (style.module) {
      } else {
        stylesCode += `\nimport ${JSON.stringify(styleRequest)}`
      }
    }
  }
  return stylesCode
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
      const { filename, query } = parseVueRequest(id)
      if (isVue(id) && !id.includes('node_modules')) {
        // 解析 vue 文件
        const { descriptor, errors } = createDescriptor(code, id)

        // 错误处理
        if (errors.length) {
          errors.forEach((error) => debug(error))
          return null
        }
        // 处理 js
        let { code: scriptCode, map } = genScriptCode(descriptor, id)
        // const outFileName = id;
        // const dir = path.dirname(id);
        // const ext = path.extname(id);
        // const baseName = path.basename(id, ext);
        // const newFileName = `${baseName}.debug.js`;
        // const newPath = path.join(dir, newFileName);
        // await writeFile(newPath, scriptCode);
        scriptCode = scriptCode.replace("export default", "const _sfc_main =");
        // 处理 template
        let { code: templateCode, map: templateMap } = genTemplateCode(
          descriptor,
          id,
        )
        // 处理 styles
        const stylesCode = genStyleCode(descriptor, id)
        const output: string[] = [scriptCode, templateCode, stylesCode]
        output.push(`_sfc_main.__hmrId = ${JSON.stringify(descriptor.id)}`)
        output.push(
          `typeof __VUE_HMR_RUNTIME__ !== 'undefined' && ` +
            `__VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main)`,
        )
        output.push(
          `import.meta.hot.accept(mod => {`,
          `  if (!mod) return`,
          `  const { default: updated, _rerender_only } = mod`,
          `  if (_rerender_only) {`,
          `    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render)`,
          `  } else {`,
          `    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)`,
          `  }`,
          `})`,
        )

        output.push(`_sfc_main.render = _sfc_render`);
        output.push(`export default _sfc_main`)

        let resolvedCode = output.join('\n')
        let resolvedMap
        const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang

        // if (
        //   lang &&
        //   /tsx?$/.test(lang) &&
        //   !descriptor.script?.src // only normal script can have src
        // ) {
        //   const { code, map } = await transformWithEsbuild(resolvedCode, id, {
        //     loader: 'ts',
        //     target: 'esnext',
        //     sourcemap: true,
        //   })
        //   resolvedCode = code
        //   resolvedMap = map as any
        // }
        return { code: resolvedCode, map: resolvedMap }
      }
      return null
    },
  }
}
