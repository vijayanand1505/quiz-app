export const MAX_SHARED_LINK_LENGTH = 16000;
export const MAX_SHARED_BYTES = 128 * 1024;
const invalid = () => new Error('This quiz link is incomplete or invalid.');

const toBase64 = (bytes) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
const fromBase64 = (encoded) => {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw invalid();
  return Uint8Array.from(
    atob(encoded.replace(/-/g, '+').replace(/_/g, '/')),
    (char) => char.charCodeAt(0)
  );
};

const readStream = async (stream) => {
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SHARED_BYTES) {
        await reader.cancel();
        throw invalid();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return output;
};

export const packQuizLink = async (payload, prefix, baseUrl) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const tooLarge = () =>
    new Error(
      'This quiz is too large to share as a link. Try fewer questions or shorter answers.'
    );
  if (bytes.length > MAX_SHARED_BYTES) throw tooLarge();
  let token = `1j.${toBase64(bytes)}`;
  if (
    typeof window.CompressionStream !== 'undefined' &&
    typeof window.DecompressionStream !== 'undefined' &&
    typeof Blob.prototype.stream === 'function'
  ) {
    try {
      const compressed = await readStream(
        new Blob([bytes])
          .stream()
          .pipeThrough(new window.CompressionStream('gzip'))
      );
      const packed = `1g.${toBase64(compressed)}`;
      if (packed.length < token.length) token = packed;
    } catch {
      /* The plain format remains available if compression fails. */
    }
  }
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = `${prefix}${token}`;
  if (url.href.length > MAX_SHARED_LINK_LENGTH) throw tooLarge();
  return url.href;
};

export const unpackQuizLink = async (token) => {
  if (
    typeof token !== 'string' ||
    token.length > MAX_SHARED_LINK_LENGTH ||
    !/^1[gj]\./.test(token)
  )
    throw invalid();
  let bytes = fromBase64(token.slice(3));
  if (token.startsWith('1g.')) {
    if (
      typeof window.DecompressionStream === 'undefined' ||
      typeof Blob.prototype.stream !== 'function'
    )
      throw new Error('Open this quiz in an up-to-date browser to continue.');
    bytes = await readStream(
      new Blob([bytes])
        .stream()
        .pipeThrough(new window.DecompressionStream('gzip'))
    );
  }
  if (bytes.length > MAX_SHARED_BYTES) throw invalid();
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
};
