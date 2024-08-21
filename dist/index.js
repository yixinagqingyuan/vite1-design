var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

// src/node/cli.ts
var import_cac = __toESM(require("cac"));

// src/node/server/index.ts
var import_connect = __toESM(require("connect"));

// src/node/optimizer/index.ts
var import_esbuild = require("esbuild");
var import_picocolors = require("picocolors");
var import_path4 = __toESM(require("path"));

// src/node/constants.ts
var import_path = __toESM(require("path"));
var EXTERNAL_TYPES = [
  "css",
  "less",
  "sass",
  "scss",
  "styl",
  "stylus",
  "pcss",
  "postcss",
  "vue",
  "svelte",
  "marko",
  "astro",
  "png",
  "jpe?g",
  "gif",
  "svg",
  "ico",
  "webp",
  "avif"
];
var JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/;
var BARE_IMPORT_RE = /^[\w@][^:]/;
var QEURY_RE = /\?.*$/s;
var HASH_RE = /#.*$/s;
var PRE_BUNDLE_DIR = import_path.default.join("node_modules", ".m-vite");
var DEFAULT_EXTERSIONS = [".tsx", ".ts", ".jsx", "js"];
var CLIENT_PUBLIC_PATH = "/@vite/client";
var HMR_PORT = 24678;

// src/node/optimizer/scanPlugin.ts
function scanPlugin(deps) {
  return {
    name: "esbuild:scan-deps",
    setup(build2) {
      build2.onResolve({ filter: new RegExp(`\\.(${EXTERNAL_TYPES.join("|")})$`) }, (resolveInfo) => {
        return {
          path: resolveInfo.path,
          external: true
        };
      });
      build2.onResolve({
        filter: BARE_IMPORT_RE
      }, (resolveInfo) => {
        const { path: id } = resolveInfo;
        deps.add(id);
        return {
          path: id,
          external: true
        };
      });
    }
  };
}

// src/node/optimizer/preBundlePlugin.ts
var import_es_module_lexer = require("es-module-lexer");
var import_path3 = __toESM(require("path"));
var import_resolve = __toESM(require("resolve"));
var import_fs_extra = __toESM(require("fs-extra"));
var import_debug = __toESM(require("debug"));

// src/node/utils.ts
var import_path2 = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_node_crypto = require("crypto");
var INTERNAL_LIST = [CLIENT_PUBLIC_PATH, "/@react-refresh"];
var cleanUrl = (url) => url.replace(HASH_RE, "").replace(QEURY_RE, "");
var isCSSRequest = (id) => cleanUrl(id).endsWith(".css");
var isJSRequest = (id) => {
  id = cleanUrl(id);
  if (JS_TYPES_RE.test(id)) {
    return true;
  }
  if (!import_path2.default.extname(id) && !id.endsWith("/")) {
    return true;
  }
  return false;
};
var isVue = (id) => {
  return id.endsWith(".vue");
};
function isImportRequest(url) {
  return url.endsWith("?import");
}
function isInternalRequest(url) {
  return INTERNAL_LIST.includes(url);
}
function removeImportQuery(url) {
  return url.replace(/\?import$/, "");
}
function getShortName(file, root) {
  return file.startsWith(root + "/") ? import_path2.default.posix.relative(root, file) : file;
}
function slash(p) {
  return p.replace(/\\/g, "/");
}
function normalizePath(id) {
  return import_path2.default.posix.normalize(isWindows ? slash(id) : id);
}
var isWindows = import_os.default.platform() === "win32";
function getHash(text) {
  return (0, import_node_crypto.createHash)("sha256").update(text).digest("hex").substring(0, 8);
}
function parseVueRequest(id) {
  const [filename, rawQuery] = id.split(`?`, 2);
  const query = Object.fromEntries(new URLSearchParams(rawQuery));
  if (query.vue != null) {
    query.vue = true;
  }
  if (query.index != null) {
    query.index = Number(query.index);
  }
  if (query.raw != null) {
    query.raw = true;
  }
  if (query.url != null) {
    query.url = true;
  }
  if (query.scoped != null) {
    query.scoped = true;
  }
  return {
    filename,
    query
  };
}

// src/node/optimizer/preBundlePlugin.ts
var debug = (0, import_debug.default)("dev");
function preBundlePlugin(deps) {
  return {
    name: "esbuild:pre-bundle",
    setup(build2) {
      build2.onResolve({
        filter: BARE_IMPORT_RE
      }, (resolveInfo) => {
        const { path: id, importer } = resolveInfo;
        const isEntry = !importer;
        if (deps.has(id)) {
          return isEntry ? {
            path: id,
            namespace: "dep"
          } : {
            path: import_resolve.default.sync(id, { basedir: process.cwd() })
          };
        }
      });
      build2.onLoad({
        filter: /.*/,
        namespace: "dep"
      }, async (loadInfo) => {
        await import_es_module_lexer.init;
        const id = loadInfo.path;
        const root = process.cwd();
        const entryPath = normalizePath(import_resolve.default.sync(id, { basedir: root }));
        const code = await import_fs_extra.default.readFile(entryPath, "utf-8");
        const [imports, exports] = await (0, import_es_module_lexer.parse)(code);
        let proxyModule = [];
        if (!imports.length && !exports.length) {
          const res = require(entryPath);
          const specifiers = Object.keys(res);
          proxyModule.push(`export { ${specifiers.join(",")} } from "${entryPath}"`, `export default require("${entryPath}")`);
        } else {
          if (exports.includes("default")) {
            proxyModule.push(`import d from "${entryPath}";export default d`);
          }
          proxyModule.push(`export * from "${entryPath}"`);
        }
        debug("\u4EE3\u7406\u6A21\u5757\u5185\u5BB9: %o", proxyModule.join("\n"));
        const loader = import_path3.default.extname(entryPath).slice(1);
        return {
          loader,
          contents: proxyModule.join("\n"),
          resolveDir: root
        };
      });
    }
  };
}

// src/node/optimizer/index.ts
async function optimize(root, file) {
  const entry = import_path4.default.resolve(root, file);
  const deps = /* @__PURE__ */ new Set();
  await (0, import_esbuild.build)({
    entryPoints: [entry],
    bundle: true,
    write: false,
    plugins: [scanPlugin(deps)]
  });
  console.log(`${(0, import_picocolors.green)("\u9700\u8981\u9884\u6784\u5EFA\u7684\u4F9D\u8D56")}:
${[...deps].map(import_picocolors.green).map((item) => `  ${item}`).join("\n")}
`);
  await (0, import_esbuild.build)({
    entryPoints: [...deps],
    write: true,
    bundle: true,
    format: "esm",
    splitting: true,
    outdir: import_path4.default.resolve(root, PRE_BUNDLE_DIR),
    plugins: [preBundlePlugin(deps)]
  });
}

// src/node/server/index.ts
var import_picocolors4 = require("picocolors");

// src/node/server/middlewares/transform.ts
var import_debug2 = __toESM(require("debug"));
var debug2 = (0, import_debug2.default)("dev");
async function transformRequest(url, serverContext) {
  const { moduleGraph, pluginContainer } = serverContext;
  url = cleanUrl(url);
  let mod = await moduleGraph.getModuleByUrl(url);
  if (mod && mod.transformResult) {
    return mod.transformResult;
  }
  const resolvedResult = await pluginContainer.resolveId(url);
  let transformResult;
  if (resolvedResult?.id) {
    let code = await pluginContainer.load(resolvedResult.id);
    if (typeof code === "object" && code !== null) {
      code = code.code;
    }
    mod = await moduleGraph.ensureEntryFromUrl(url);
    if (code) {
      transformResult = await pluginContainer.transform(code, resolvedResult?.id);
    }
  }
  if (mod) {
    mod.transformResult = transformResult;
  }
  return transformResult;
}
function transformMiddleware(serverContext) {
  return async (req, res, next) => {
    if (req.method !== "GET" || !req.url) {
      return next();
    }
    const url = req.url;
    debug2("transformMiddleware: %s", url);
    if (isJSRequest(url) || isVue(url) || isCSSRequest(url) || isImportRequest(url)) {
      let result = await transformRequest(url, serverContext);
      if (!result) {
        return next();
      }
      if (result && typeof result !== "string") {
        result = result.code;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      return res.end(result);
    }
    return next();
  };
}

// src/node/ModuleGraph.ts
var ModuleNode = class {
  constructor(url) {
    this.id = null;
    this.importers = /* @__PURE__ */ new Set();
    this.importedModules = /* @__PURE__ */ new Set();
    this.transformResult = null;
    this.lastHMRTimestamp = 0;
    this.url = url;
  }
};
var ModuleGraph = class {
  constructor(resolveId) {
    this.resolveId = resolveId;
    this.urlToModuleMap = /* @__PURE__ */ new Map();
    this.idToModuleMap = /* @__PURE__ */ new Map();
  }
  getModuleById(id) {
    return this.idToModuleMap.get(id);
  }
  async getModuleByUrl(rawUrl) {
    const { url } = await this._resolve(rawUrl);
    return this.urlToModuleMap.get(url);
  }
  async ensureEntryFromUrl(rawUrl) {
    const { url, resolvedId } = await this._resolve(rawUrl);
    if (this.urlToModuleMap.has(url)) {
      return this.urlToModuleMap.get(url);
    }
    const mod = new ModuleNode(url);
    mod.id = resolvedId;
    this.urlToModuleMap.set(url, mod);
    this.idToModuleMap.set(resolvedId, mod);
    return mod;
  }
  async updateModuleInfo(mod, importedModules) {
    const prevImports = mod.importedModules;
    for (const curImports of importedModules) {
      const dep = typeof curImports === "string" ? await this.ensureEntryFromUrl(cleanUrl(curImports)) : curImports;
      if (dep) {
        mod.importedModules.add(dep);
        dep.importers.add(mod);
      }
    }
    for (const prevImport of prevImports) {
      if (!importedModules.has(prevImport.url)) {
        prevImport.importers.delete(mod);
      }
    }
  }
  invalidateModule(file) {
    const mod = this.idToModuleMap.get(file);
    if (mod) {
      mod.lastHMRTimestamp = Date.now();
      mod.transformResult = null;
      mod.importers.forEach((importer) => {
        this.invalidateModule(importer.id);
      });
    }
  }
  async _resolve(url) {
    const resolved = await this.resolveId(url);
    const resolvedId = resolved?.id || url;
    return { url, resolvedId };
  }
};

// src/node/pluginContainer.ts
var createPluginContainer = (plugins) => {
  class Context {
    async resolve(id, importer) {
      let out = await pluginContainer.resolveId(id, importer);
      if (typeof out === "string")
        out = { id: out };
      return out;
    }
  }
  const pluginContainer = {
    async resolveId(id, importer) {
      const ctx = new Context();
      for (const plugin of plugins) {
        if (plugin.resolveId) {
          const newId = await plugin.resolveId.call(ctx, id, importer);
          if (newId) {
            id = typeof newId === "string" ? newId : newId.id;
            return { id };
          }
        }
      }
      return null;
    },
    async load(id) {
      const ctx = new Context();
      for (const plugin of plugins) {
        if (plugin.load) {
          const result = await plugin.load.call(ctx, id);
          if (result) {
            return result;
          }
        }
      }
      return null;
    },
    async transform(code, id) {
      const ctx = new Context();
      for (const plugin of plugins) {
        if (plugin.transform) {
          const result = await plugin.transform.call(ctx, code, id);
          if (!result)
            continue;
          if (typeof result === "string") {
            code = result;
          } else if (result.code) {
            code = result.code;
          }
        }
      }
      return { code };
    }
  };
  return pluginContainer;
};

// src/node/plugins/esbuild.ts
var import_fs_extra2 = require("fs-extra");
var import_esbuild2 = __toESM(require("esbuild"));
var import_path5 = __toESM(require("path"));
function esbuildTransformPlugin() {
  return {
    name: "m-vite:esbuild-transform",
    async load(id) {
      if (isJSRequest(id)) {
        try {
          const code = await (0, import_fs_extra2.readFile)(id, "utf-8");
          return code;
        } catch (e) {
          return null;
        }
      }
    },
    async transform(code, id) {
      if (isJSRequest(id)) {
        const extname = import_path5.default.extname(id).slice(1);
        const { code: transformedCode, map } = await import_esbuild2.default.transform(code, {
          target: "esnext",
          format: "esm",
          sourcemap: true,
          loader: extname
        });
        return {
          code: transformedCode,
          map
        };
      }
      return null;
    }
  };
}

// src/node/plugins/resolve.ts
var import_resolve2 = __toESM(require("resolve"));
var import_path6 = __toESM(require("path"));
var import_fs_extra3 = require("fs-extra");
function resolvePlugin() {
  let serverContext;
  return {
    name: "m-vite:resolve",
    configureServer(s) {
      serverContext = s;
    },
    async resolveId(id, importer) {
      id = removeImportQuery(cleanUrl(id));
      if (isInternalRequest(id)) {
        return null;
      }
      if (import_path6.default.isAbsolute(id)) {
        if (await (0, import_fs_extra3.pathExists)(id)) {
          return { id };
        }
        id = import_path6.default.join(serverContext.root, id);
        if (await (0, import_fs_extra3.pathExists)(id)) {
          return { id };
        }
      } else if (id.startsWith(".")) {
        if (!importer) {
          throw new Error("`importer` should not be undefined");
        }
        const hasExtension = import_path6.default.extname(id).length > 1;
        let resolvedId;
        if (hasExtension) {
          resolvedId = normalizePath(import_resolve2.default.sync(id, { basedir: import_path6.default.dirname(importer) }));
          if (await (0, import_fs_extra3.pathExists)(resolvedId)) {
            return { id: resolvedId };
          }
        } else {
          for (const extname of DEFAULT_EXTERSIONS) {
            try {
              const withExtension = `${id}${extname}`;
              resolvedId = normalizePath(import_resolve2.default.sync(withExtension, {
                basedir: import_path6.default.dirname(importer)
              }));
              if (await (0, import_fs_extra3.pathExists)(resolvedId)) {
                return { id: resolvedId };
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      return null;
    }
  };
}

// src/node/plugins/importAnalysis.ts
var import_es_module_lexer2 = require("es-module-lexer");
var import_magic_string = __toESM(require("magic-string"));
var import_path7 = __toESM(require("path"));
function importAnalysisPlugin() {
  let serverContext;
  return {
    name: "m-vite:import-analysis",
    configureServer(s) {
      serverContext = s;
    },
    async transform(code, id) {
      if ((!isJSRequest(id) || isInternalRequest(id)) && !isVue(id)) {
        return null;
      }
      await import_es_module_lexer2.init;
      const importedModules = /* @__PURE__ */ new Set();
      const [imports] = (0, import_es_module_lexer2.parse)(code);
      const ms = new import_magic_string.default(code);
      const resolve3 = async (id2, importer) => {
        const resolved = await serverContext.pluginContainer.resolveId(id2, normalizePath(importer));
        if (!resolved) {
          return;
        }
        const cleanedId = cleanUrl(resolved.id);
        const mod = moduleGraph.getModuleById(cleanedId);
        let resolvedId = `/${getShortName(resolved.id, serverContext.root)}`;
        if (mod && mod.lastHMRTimestamp > 0) {
        }
        return resolvedId;
      };
      const { moduleGraph } = serverContext;
      const curMod = moduleGraph.getModuleById(id);
      for (const importInfo of imports) {
        const { s: modStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource || isInternalRequest(modSource))
          continue;
        if (modSource.endsWith(".svg")) {
          const resolvedUrl = await resolve3(modSource, id);
          ms.overwrite(modStart, modEnd, `${resolvedUrl}?import`);
          continue;
        }
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(import_path7.default.join("/", PRE_BUNDLE_DIR, `${modSource}.js`));
          ms.overwrite(modStart, modEnd, bundlePath);
          importedModules.add(bundlePath);
        } else if (modSource.startsWith(".") || modSource.startsWith("/")) {
          const resolved = await resolve3(modSource, id);
          if (resolved) {
            ms.overwrite(modStart, modEnd, resolved);
            importedModules.add(resolved);
          }
        }
      }
      if (!id.includes("node_modules")) {
        ms.prepend(`import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";import.meta.hot = __vite__createHotContext(${JSON.stringify(cleanUrl(curMod.url))});`);
      }
      moduleGraph.updateModuleInfo(curMod, importedModules);
      return {
        code: ms.toString(),
        map: ms.generateMap()
      };
    }
  };
}

// src/node/plugins/css.ts
var import_fs_extra4 = require("fs-extra");
function cssPlugin() {
  let serverContext;
  return {
    name: "m-vite:css",
    configureServer(s) {
      serverContext = s;
    },
    load(id) {
      if (id.endsWith(".css")) {
        return (0, import_fs_extra4.readFile)(id, "utf-8");
      }
    },
    async transform(code, id) {
      if (id.endsWith(".css")) {
        const jsContent = `
import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";
import.meta.hot = __vite__createHotContext("/${getShortName(id, serverContext.root)}");
import { updateStyle, removeStyle } from "${CLIENT_PUBLIC_PATH}"
const id = '${id}';
const css = \`${code.replace(/\n/g, "")}\`;

updateStyle(id, css);
import.meta.hot.accept();
export default css;
import.meta.hot.prune(() => removeStyle(id));`.trim();
        return {
          code: jsContent
        };
      }
      return null;
    }
  };
}

// src/node/plugins/assets.ts
function assetPlugin() {
  let serverContext;
  return {
    name: "m-vite:asset",
    configureServer(s) {
      serverContext = s;
    },
    async load(id) {
      const cleanedId = removeImportQuery(cleanUrl(id));
      const resolvedId = `/${getShortName(normalizePath(id), serverContext.root)}`;
      if (cleanedId.endsWith(".svg")) {
        return {
          code: `export default "${resolvedId}"`
        };
      }
    }
  };
}

// src/node/plugins/clientInject.ts
var import_fs_extra5 = __toESM(require("fs-extra"));
var import_path8 = __toESM(require("path"));
function clientInjectPlugin() {
  let serverContext;
  return {
    name: "m-vite:client-inject",
    configureServer(s) {
      serverContext = s;
    },
    resolveId(id) {
      if (id === CLIENT_PUBLIC_PATH) {
        return { id };
      }
      return null;
    },
    async load(id) {
      if (id === CLIENT_PUBLIC_PATH) {
        const realPath = import_path8.default.join(serverContext.root, "node_modules", "mini-vite", "dist", "client.mjs");
        const code = await import_fs_extra5.default.readFile(realPath, "utf-8");
        return {
          code: code.replace("__HMR_PORT__", JSON.stringify(HMR_PORT))
        };
      }
    },
    transformIndexHtml(raw) {
      return raw.replace(/(<head[^>]*>)/i, `$1<script type="module" src="${CLIENT_PUBLIC_PATH}"><\/script>`);
    }
  };
}

// src/node/plugins/react-hmr.ts
var import_fs = __toESM(require("fs"));
var import_path9 = __toESM(require("path"));
var import_core = require("@babel/core");
function loadPlugin(path11) {
  return import(path11).then((module2) => module2.default || module2);
}
var RUNTIME_PUBLIC_PATH = "/@react-refresh";
var runtimeFilePath = import_path9.default.resolve(__dirname, "..", "node_modules", "react-refresh/cjs/react-refresh-runtime.development.js");
var runtimeCode = `
const exports = {}
${import_fs.default.readFileSync(runtimeFilePath, "utf-8")}
function debounce(fn, delay) {
  let handle
  return () => {
    clearTimeout(handle)
    handle = setTimeout(fn, delay)
  }
}
exports.performReactRefresh = debounce(exports.performReactRefresh, 16)
export default exports
`;
var preambleCode = `
import RefreshRuntime from "${RUNTIME_PUBLIC_PATH}"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
`;
var header = `
import RefreshRuntime from "${RUNTIME_PUBLIC_PATH}";

let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot) {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    RefreshRuntime.register(type, __SOURCE__ + " " + id)
  };
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}`.replace(/[\n]+/gm, "");
var footer = `
if (import.meta.hot) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
  import.meta.hot.accept();
  if (!window.__vite_plugin_react_timeout) {
    window.__vite_plugin_react_timeout = setTimeout(() => {
      window.__vite_plugin_react_timeout = 0;
      RefreshRuntime.performReactRefresh();
    }, 30);
  }
}`;
function reactHMRPlugin() {
  let serverContext;
  return {
    name: "m-vite:react-refresh",
    configureServer(s) {
      serverContext = s;
    },
    resolveId(id) {
      if (id === RUNTIME_PUBLIC_PATH) {
        return { id };
      }
      return null;
    },
    async load(id) {
      if (id === RUNTIME_PUBLIC_PATH) {
        return runtimeCode.replace("process.env.NODE_ENV", JSON.stringify("development"));
      }
    },
    async transform(code, id) {
      if (isJSRequest(id) && !id.includes("node_modules")) {
        if (serverContext.type == "react") {
          const reactRefreshPlugin = await loadPlugin("react-refresh/babel");
          const transformedCode = await (0, import_core.transformAsync)(code, {
            plugins: [reactRefreshPlugin]
          });
          return {
            code: header.replace("__SOURCE__", JSON.stringify(id)) + transformedCode.code + footer
          };
        }
      }
      return null;
    },
    transformIndexHtml(raw) {
      if (serverContext.type == "react") {
        return raw.replace(/(<head[^>]*>)/i, `$1<script type="module">${preambleCode}<\/script>`);
      }
      return raw;
    }
  };
}

// src/node/plugins/vue-hmr.ts
var import_fs_extra6 = require("fs-extra");
var import_debug3 = __toESM(require("debug"));
var import_compiler_sfc = require("@vue/compiler-sfc");
var ignoreList = [
  "id",
  "index",
  "src",
  "type",
  "lang",
  "module",
  "scoped",
  "generic"
];
var clientCache = /* @__PURE__ */ new WeakMap();
function getResolvedScript(descriptor) {
  return clientCache.get(descriptor);
}
function setResolvedScript(descriptor, script) {
  clientCache.set(descriptor, script);
}
function resolveTemplateCompilerOptions(descriptor) {
  const resolvedScript = getResolvedScript(descriptor);
  const hasScoped = descriptor.styles.some((style) => style.scoped);
  return {
    scoped: hasScoped,
    compilerOptions: {
      sourceMap: true,
      scopeId: hasScoped ? `data-v-${descriptor.id}` : void 0,
      bindingMetadata: resolvedScript ? resolvedScript.bindings : void 0
    }
  };
}
var debug3 = (0, import_debug3.default)("dev");
var createDescriptor = (code, id) => {
  const { descriptor, errors } = (0, import_compiler_sfc.parse)(code, {
    filename: id,
    sourceMap: true
  });
  descriptor.id = getHash(id);
  return { descriptor, errors };
};
function attrsToQuery(attrs, langFallback, forceLangFallback = false) {
  let query = ``;
  for (const name in attrs) {
    const value = attrs[name];
    if (!ignoreList.includes(name)) {
      query += `&${encodeURIComponent(name)}${value ? `=${encodeURIComponent(value)}` : ``}`;
    }
  }
  if (langFallback || attrs.lang) {
    query += `lang` in attrs ? forceLangFallback ? `&lang.${langFallback}` : `&lang.${attrs.lang}` : `&lang.${langFallback}`;
  }
  return query;
}
var genScriptCode = (descriptor, id) => {
  const hasScoped = descriptor.styles.some((style) => style.scoped);
  let scriptCode = `const _sfc_main = {}`;
  let map;
  const script = (0, import_compiler_sfc.compileScript)(descriptor, {
    id: descriptor.id,
    isProd: false,
    sourceMap: true,
    templateOptions: {
      filename: id,
      isProd: false,
      scoped: hasScoped,
      id: descriptor.id,
      compilerOptions: {
        sourceMap: true
      }
    }
  });
  scriptCode = script.content;
  map = script.map;
  setResolvedScript(descriptor, script);
  return {
    code: scriptCode,
    map
  };
};
var genTemplateCode = (descriptor, id) => {
  const template = descriptor.template;
  const result = (0, import_compiler_sfc.compileTemplate)({
    source: template.content,
    filename: descriptor.filename,
    id: descriptor.id,
    ...resolveTemplateCompilerOptions(descriptor)
  });
  return {
    ...result,
    code: result.code.replace(/\nexport (function|const) (render|ssrRender)/, "\n$1 _sfc_$2")
  };
};
var genStyleCode = (descriptor, id) => {
  let stylesCode = ``;
  if (descriptor.styles.length) {
    for (let i = 0; i < descriptor.styles.length; i++) {
      const style = descriptor.styles[i];
      const src = style.src || descriptor.filename;
      const attrsQuery = attrsToQuery(style.attrs, "css");
      const srcQuery = style.src ? style.scoped ? `&src=${descriptor.id}` : "&src=true" : "";
      const scopedQuery = style.scoped ? `&scoped=${descriptor.id}` : ``;
      const query = `?vue&type=style&index=${i}${srcQuery}${scopedQuery}`;
      const styleRequest = src + query + attrsQuery;
      if (style.module) {
      } else {
        stylesCode += `
import ${JSON.stringify(styleRequest)}`;
      }
    }
  }
  return stylesCode;
};
function vueHMRPlugin() {
  let serverContext;
  return {
    name: "m-vite:vue-hot",
    configureServer(s) {
      serverContext = s;
    },
    resolveId() {
      return null;
    },
    async load(id) {
      if (isVue(id)) {
        return (0, import_fs_extra6.readFile)(id, "utf-8");
      }
    },
    async transform(code, id) {
      const { filename, query } = parseVueRequest(id);
      if (isVue(id) && !id.includes("node_modules")) {
        const { descriptor, errors } = createDescriptor(code, id);
        if (errors.length) {
          errors.forEach((error) => debug3(error));
          return null;
        }
        let { code: scriptCode, map } = genScriptCode(descriptor, id);
        scriptCode = scriptCode.replace("export default", "const _sfc_main =");
        let { code: templateCode, map: templateMap } = genTemplateCode(descriptor, id);
        const stylesCode = genStyleCode(descriptor, id);
        const output = [scriptCode, templateCode, stylesCode];
        output.push(`_sfc_main.__hmrId = ${JSON.stringify(descriptor.id)}`);
        output.push(`typeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main)`);
        output.push(`import.meta.hot.accept(mod => {`, `  if (!mod) return`, `  const { default: updated, _rerender_only } = mod`, `  if (_rerender_only) {`, `    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render)`, `  } else {`, `    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)`, `  }`, `})`);
        output.push(`_sfc_main.render = _sfc_render`);
        output.push(`export default _sfc_main`);
        let resolvedCode = output.join("\n");
        let resolvedMap;
        const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang;
        return { code: resolvedCode, map: resolvedMap };
      }
      return null;
    }
  };
}

// src/node/plugins/index.ts
function resolvePlugins() {
  return [
    clientInjectPlugin(),
    resolvePlugin(),
    esbuildTransformPlugin(),
    reactHMRPlugin(),
    vueHMRPlugin(),
    importAnalysisPlugin(),
    cssPlugin(),
    assetPlugin()
  ];
}

// src/node/server/middlewares/indexHtml.ts
var import_path10 = __toESM(require("path"));
var import_fs_extra7 = require("fs-extra");
function indexHtmlMiddware(serverContext) {
  return async (req, res, next) => {
    if (req.url === "/") {
      const { root } = serverContext;
      const indexHtmlPath = import_path10.default.join(root, "index.html");
      if (await (0, import_fs_extra7.pathExists)(indexHtmlPath)) {
        const rawHtml = await (0, import_fs_extra7.readFile)(indexHtmlPath, "utf8");
        let html = rawHtml;
        for (const plugin of serverContext.plugins) {
          if (plugin.transformIndexHtml) {
            html = await plugin.transformIndexHtml(html);
          }
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        return res.end(html);
      }
    }
    return next();
  };
}

// src/node/server/middlewares/static.ts
var import_sirv = __toESM(require("sirv"));
function staticMiddleware(root) {
  const root2 = root + "/public";
  const serveFromRoot = (0, import_sirv.default)(root, { dev: true });
  const serveFromRoot2 = (0, import_sirv.default)(root2, { dev: true });
  return async (req, res, next) => {
    if (!req.url) {
      return;
    }
    if (isImportRequest(req.url) || req.url === CLIENT_PUBLIC_PATH) {
      return;
    }
    serveFromRoot(req, res, () => {
      serveFromRoot2(req, res, next);
    });
  };
}

// src/node/ws.ts
var import_picocolors2 = require("picocolors");
var import_ws = require("ws");
function createWebSocketServer(server) {
  let wss;
  wss = new import_ws.WebSocketServer({ port: HMR_PORT });
  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected" }));
  });
  wss.on("error", (e) => {
    if (e.code !== "EADDRINUSE") {
      console.error((0, import_picocolors2.red)(`WebSocket server error:
${e.stack || e.message}`));
    }
  });
  return {
    send(payload) {
      const stringified = JSON.stringify(payload);
      wss.clients.forEach((client) => {
        if (client.readyState === import_ws.WebSocket.OPEN) {
          client.send(stringified);
        }
      });
    },
    close() {
      wss.close();
    }
  };
}

// src/node/server/index.ts
var import_chokidar = __toESM(require("chokidar"));

// src/node/hmr.ts
var import_picocolors3 = require("picocolors");
function bindingHMREvents(serverContext) {
  const { watcher, ws, root } = serverContext;
  watcher.on("change", async (file) => {
    console.log(`\u2728${(0, import_picocolors3.blue)("[hmr]")} ${(0, import_picocolors3.green)(file)} changed`);
    const { moduleGraph } = serverContext;
    await moduleGraph.invalidateModule(file);
    ws.send({
      type: "update",
      updates: [
        {
          type: "js-update",
          timestamp: Date.now(),
          path: "/" + getShortName(file, root),
          acceptedPath: "/" + getShortName(file, root)
        }
      ]
    });
  });
}

// src/node/server/index.ts
async function startDevServer(type) {
  const app = (0, import_connect.default)();
  const root = process.cwd();
  const startTime = Date.now();
  const plugins = resolvePlugins();
  const pluginContainer = createPluginContainer(plugins);
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));
  const watcher = import_chokidar.default.watch(root, {
    ignored: ["**/node_modules/**", "**/.git/**"],
    ignoreInitial: true
  });
  const ws = createWebSocketServer(app);
  const serverContext = {
    root: normalizePath(process.cwd()),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    type: type == "react" ? "react" : "vue",
    watcher
  };
  bindingHMREvents(serverContext);
  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }
  app.use(transformMiddleware(serverContext));
  app.use(indexHtmlMiddware(serverContext));
  app.use(staticMiddleware(serverContext.root));
  app.listen(3e3, async () => {
    await optimize(root, type == "react" ? "src/main.tsx" : "src/main.ts");
    console.log((0, import_picocolors4.green)("\u{1F680} No-Bundle \u670D\u52A1\u5DF2\u7ECF\u6210\u529F\u542F\u52A8!"), `\u8017\u65F6: ${Date.now() - startTime}ms`);
    console.log(`> \u672C\u5730\u8BBF\u95EE\u8DEF\u5F84: ${(0, import_picocolors4.blue)("http://localhost:3000")}`);
  });
}

// src/node/cli.ts
var cli = (0, import_cac.default)();
cli.command("[root]", "Run the development server").alias("serve").alias("dev").action(async (option) => {
  await startDevServer(option);
});
cli.command("build", "Build the app for production").action(() => {
});
cli.help();
cli.parse();
//# sourceMappingURL=index.js.map