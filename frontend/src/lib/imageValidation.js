/**
 * Read intrinsic dimensions of an image File without uploading it.
 * Resolves to { width, height } or rejects on a corrupt / non-image file.
 *
 * Implementation notes:
 *  - Uses createImageBitmap when available (faster, off-main-thread on
 *    modern browsers); falls back to <img> + onload elsewhere.
 *  - Always revokes the blob URL on resolve/reject so we don't leak
 *    object URLs in long admin sessions.
 */
export async function readImageDimensions(file) {
  if (!(file instanceof Blob)) throw new Error('Not a file');

  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      const out = { width: bmp.width, height: bmp.height };
      try { bmp.close?.(); } catch {}
      return out;
    } catch {
      // Fall through to <img> path on decode failure.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

/**
 * Validate a banner image File against an expected aspect ratio and a
 * minimum width. Returns { ok, message } so callers can render a friendly
 * inline warning. Tolerance is ±5% on the aspect ratio so sources that are
 * very-close-but-not-exact (e.g. 1920x601) still pass.
 *
 * @param {File} file
 * @param {Object} spec
 * @param {number} spec.targetWidth   Pixel target on the long edge.
 * @param {number} spec.targetHeight  Pixel target on the short edge.
 * @param {number} [spec.tolerance=0.05]   Aspect-ratio tolerance (fraction).
 * @param {number} [spec.minWidth=spec.targetWidth/2]  Minimum acceptable width.
 */
export async function validateBannerImage(file, spec) {
  const { targetWidth, targetHeight, tolerance = 0.05 } = spec;
  const minWidth = spec.minWidth ?? Math.floor(targetWidth / 2);

  let dims;
  try {
    dims = await readImageDimensions(file);
  } catch {
    return { ok: false, message: 'Could not read image. Try a different file.' };
  }

  if (dims.width < minWidth) {
    return {
      ok: false,
      message: `Image is too small (${dims.width}\u00d7${dims.height}). Minimum width is ${minWidth}px; recommended is ${targetWidth}\u00d7${targetHeight}.`,
    };
  }

  const targetRatio = targetWidth / targetHeight;
  const actualRatio = dims.width / dims.height;
  const drift = Math.abs(actualRatio - targetRatio) / targetRatio;

  if (drift > tolerance) {
    return {
      ok: false,
      message: `Aspect ratio ${dims.width}\u00d7${dims.height} doesn't match recommended ${targetWidth}\u00d7${targetHeight}. The image may be cropped to fit.`,
      // Soft-fail: caller can choose to upload anyway.
      soft: true,
      dims,
    };
  }

  return { ok: true, dims };
}
