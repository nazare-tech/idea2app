export interface ZipEntry {
  path: string
  data: Uint8Array
  modifiedAt?: Date
}

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const UTF8_FLAG = 0x0800
const ZIP_VERSION = 20
const MAX_UINT16 = 0xffff
const MAX_UINT32 = 0xffffffff

const CRC32_TABLE = new Uint32Array(256)
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  CRC32_TABLE[index] = value >>> 0
}

function crc32(data: Uint8Array) {
  let value = 0xffffffff
  for (const byte of data) {
    value = CRC32_TABLE[(value ^ byte) & 0xff]! ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function encodeDosDateTime(date: Date) {
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date(0)
  const year = Math.min(2107, Math.max(1980, safeDate.getUTCFullYear()))
  const month = safeDate.getUTCMonth() + 1
  const day = safeDate.getUTCDate()
  const hours = safeDate.getUTCHours()
  const minutes = safeDate.getUTCMinutes()
  const seconds = Math.floor(safeDate.getUTCSeconds() / 2)

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  }
}

function validateEntryPath(path: string) {
  const parts = path.split("/")
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Invalid ZIP entry path: ${path}`)
  }
}

function concatenate(parts: Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

/**
 * Builds a standards-compliant, uncompressed ZIP archive. Mockup images are
 * already compressed, so store mode avoids a runtime dependency and expensive
 * recompression while keeping one portable download.
 */
function buildZipParts(entries: ZipEntry[]) {
  if (entries.length === 0) throw new Error("ZIP archive needs at least one file")
  if (entries.length > MAX_UINT16) throw new Error("ZIP archive has too many files")

  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  const seenPaths = new Set<string>()
  let localOffset = 0
  let centralLength = 0

  for (const entry of entries) {
    validateEntryPath(entry.path)
    if (seenPaths.has(entry.path)) throw new Error(`Duplicate ZIP entry path: ${entry.path}`)
    seenPaths.add(entry.path)

    const name = encoder.encode(entry.path)
    const data = entry.data
    if (name.byteLength > MAX_UINT16) throw new Error("ZIP entry path is too long")
    if (data.byteLength > MAX_UINT32) throw new Error("ZIP entry is too large")
    if (localOffset > MAX_UINT32) throw new Error("ZIP archive is too large")

    const checksum = crc32(data)
    const dos = encodeDosDateTime(entry.modifiedAt ?? new Date())
    const localHeader = new Uint8Array(30 + name.byteLength)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true)
    localView.setUint16(4, ZIP_VERSION, true)
    localView.setUint16(6, UTF8_FLAG, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dos.time, true)
    localView.setUint16(12, dos.date, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.byteLength, true)
    localView.setUint32(22, data.byteLength, true)
    localView.setUint16(26, name.byteLength, true)
    localView.setUint16(28, 0, true)
    localHeader.set(name, 30)
    localParts.push(localHeader, data)

    const centralHeader = new Uint8Array(46 + name.byteLength)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, CENTRAL_DIRECTORY_HEADER_SIGNATURE, true)
    centralView.setUint16(4, ZIP_VERSION, true)
    centralView.setUint16(6, ZIP_VERSION, true)
    centralView.setUint16(8, UTF8_FLAG, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dos.time, true)
    centralView.setUint16(14, dos.date, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, data.byteLength, true)
    centralView.setUint32(24, data.byteLength, true)
    centralView.setUint16(28, name.byteLength, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    centralHeader.set(name, 46)
    centralParts.push(centralHeader)

    localOffset += localHeader.byteLength + data.byteLength
    centralLength += centralHeader.byteLength
  }

  if (localOffset + centralLength > MAX_UINT32) throw new Error("ZIP archive is too large")

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralLength, true)
  endView.setUint32(16, localOffset, true)
  endView.setUint16(20, 0, true)

  return {
    parts: [...localParts, ...centralParts, end],
    totalLength: localOffset + centralLength + end.byteLength,
  }
}

export function createZipArchive(entries: ZipEntry[]) {
  const archive = buildZipParts(entries)
  return concatenate(archive.parts, archive.totalLength)
}

/**
 * Streams the prepared ZIP records one chunk at a time. Vercel exempts
 * streaming function responses from its buffered 4.5 MB response limit.
 */
export function createZipArchiveStream(entries: ZipEntry[]) {
  const iterator = buildZipParts(entries).parts[Symbol.iterator]()
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = iterator.next()
      if (next.done) {
        controller.close()
        return
      }
      controller.enqueue(next.value)
    },
  })
}
