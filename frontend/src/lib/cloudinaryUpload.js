/**
 * Direct-to-Cloudinary upload with real per-file progress.
 *
 * Workflow (industry standard, used by Instagram/Shopify/Flipkart):
 *   1. Backend mints a short-lived signature (`adminAPI.getUploadSignature`).
 *   2. Browser POSTs the file straight to Cloudinary's upload endpoint.
 *   3. Resulting `{ url, public_id }` is sent back to our API to attach
 *      to the product record. No big files ever touch our Node server.
 */

import { adminAPI } from './api';

/**
 * Uploads a single file (image or video) directly to Cloudinary.
 *
 * @param {File} file
 * @param {Object} opts
 * @param {'image'|'video'} opts.resourceType
 * @param {(percent:number)=>void} [opts.onProgress] 0..100
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ url:string, public_id:string, width?:number, height?:number, duration?:number }>}
 */
export async function uploadToCloudinary(file, { resourceType, onProgress, signal } = {}) {
  const isVideo = resourceType === 'video' || (file.type || '').startsWith('video/');
  const folder = isVideo ? 'rupalsha/products/videos' : 'rupalsha/products/images';

  const sig = await adminAPI.getUploadSignature(folder, isVideo ? 'video' : 'image');

  const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${sig.resource_type}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sig.api_key);
  fd.append('timestamp', String(sig.timestamp));
  fd.append('folder', sig.folder);
  fd.append('signature', sig.signature);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: data.secure_url,
            public_id: data.public_id,
            width: data.width,
            height: data.height,
            duration: data.duration,
            resource_type: data.resource_type,
          });
        } else {
          reject(new Error(data.error?.message || `Upload failed (${xhr.status})`));
        }
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
      } else {
        signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }
    }

    xhr.send(fd);
  });
}
