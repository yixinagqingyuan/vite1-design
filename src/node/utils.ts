/** @format */

import { CLIENT_PUBLIC_PATH, HASH_RE, JS_TYPES_RE, QEURY_RE } from './constants'
import path from 'path'
import os from 'os'
import { createHash } from 'node:crypto'
const INTERNAL_LIST = [CLIENT_PUBLIC_PATH, '/@react-refresh']
// 去除 url 中的烂七八的参数？# 等参数
export const cleanUrl = (url: string): string =>
  url.replace(HASH_RE, '').replace(QEURY_RE, '')

export const isCSSRequest = (id: string): boolean =>
  cleanUrl(id).endsWith('.css')

export const isJSRequest = (id: string): boolean => {
  id = cleanUrl(id)
  if (JS_TYPES_RE.test(id)) {
    return true
  }
  if (!path.extname(id) && !id.endsWith('/')) {
    return true
  }
  return false
}
export const isVue = (id: string) => {
  return id.endsWith('.vue')
}

export function isImportRequest(url: string): boolean {
  return url.endsWith('?import')
}

export function isInternalRequest(url: string): boolean {
  return INTERNAL_LIST.includes(url)
}

export function removeImportQuery(url: string): string {
  return url.replace(/\?import$/, '')
}

export function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export function getShortName(file: string, root: string) {
  return file.startsWith(root + '/') ? path.posix.relative(root, file) : file
}

export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}
export const isWindows = os.platform() === 'win32'

export function getHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 8)
}

export function parseVueRequest(id: string): {
  filename: string
  query: any
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery)) as any
  if (query.vue != null) {
    query.vue = true
  }
  if (query.index != null) {
    query.index = Number(query.index)
  }
  if (query.raw != null) {
    query.raw = true
  }
  if (query.url != null) {
    query.url = true
  }
  if (query.scoped != null) {
    query.scoped = true
  }
  return {
    filename,
    query,
  }
}
