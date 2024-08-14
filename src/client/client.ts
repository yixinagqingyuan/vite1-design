/** @format */
// 主要就是做热更新用的
console.log('[vite] connecting...')
// ws 接收消息
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, 'vite-hmr')
socket.addEventListener('message', async ({ data }) => {
  handleMessage(JSON.parse(data)).catch(console.error)
})

interface Update {
  type: 'js-update' | 'css-update'
  path: string
  acceptedPath: string
  timestamp: number
}

async function handleMessage(payload: any) {
  // 判断类型， 表示链接成功
  switch (payload.type) {
    case 'connected':
      console.log(`[vite] connected.`)
      setInterval(() => socket.send('ping'), 1000)
      break
    // 主要热跟新逻辑
    case 'update':
      payload.updates.forEach((update: Update) => {
        if (update.type === 'js-update') {
          fetchUpdate(update)
        }
      })
      break
  }
}

interface HotModule {
  id: string
  callbacks: HotCallback[]
}

interface HotCallback {
  deps: string[]
  fn: (modules: object[]) => void
}

const hotModulesMap = new Map<string, HotModule>()
const pruneMap = new Map<string, (data: any) => void | Promise<void>>()

export const createHotContext = (ownerPath: string) => {
  const mod = hotModulesMap.get(ownerPath)
  if (mod) {
    mod.callbacks = []
  }

  function acceptDeps(deps: string[], callback: any) {
    const mod: HotModule = hotModulesMap.get(ownerPath) || {
      id: ownerPath,
      callbacks: [],
    }
    mod.callbacks.push({
      deps,
      fn: callback,
    })
    hotModulesMap.set(ownerPath, mod)
  }

  return {
    //import.meta.hot.accept 会找到这个方法
    accept(deps: any) {
      if (typeof deps === 'function' || !deps) {
        acceptDeps([ownerPath], ([mod]) => deps && deps(mod))
      }
    },
    prune(cb: (data: any) => void) {
      pruneMap.set(ownerPath, cb)
    },
  }
}
// 热更新逻辑
async function fetchUpdate({ path, timestamp }: Update) {
  const mod = hotModulesMap.get(path)
  if (!mod) return

  const moduleMap = new Map()
  const modulesToUpdate = new Set<string>()

  modulesToUpdate.add(path)

  await Promise.all(
    Array.from(modulesToUpdate).map(async (dep) => {
      const [path, query] = dep.split(`?`)
      try {
        // 这里会去请求新的文件,导入之后直接执行
        const newMod = await import(
          path + `?t=${timestamp}${query ? `&${query}` : ''}`
        )
        moduleMap.set(dep, newMod)
      } catch (e) {}
    }),
  )

  return () => {
    for (const { deps, fn } of mod.callbacks) {
      fn(deps.map((dep: any) => moduleMap.get(dep)))
    }
    console.log(`[vite] hot updated: ${path}`)
  }
}

const sheetsMap = new Map()

export function updateStyle(id: string, content: string) {
  let style = sheetsMap.get(id)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.innerHTML = content
    document.head.appendChild(style)
  } else {
    style.innerHTML = content
  }
  sheetsMap.set(id, style)
}

export function removeStyle(id: string): void {
  const style = sheetsMap.get(id)
  if (style) {
    document.head.removeChild(style)
  }
  sheetsMap.delete(id)
}
