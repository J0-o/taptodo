// Resets the image viewer zoom and pan state.
function resetImageViewerState() {
  imageZoom = 1;
  imagePanX = 0;
  imagePanY = 0;
}

// Closes the image viewer modal and restores its default transform state.
function closeImageViewer() {
  imagePreview = null;
  resetImageViewerState();
}

// Opens the image viewer modal for a todo image selection.
function openImageViewer(todoIndex, imageIndex = 0, alt = 'Image') {
  imagePreview = { src: '', alt, todoIndex, imageIndex };
  resetImageViewerState();
}

// Compresses an image file into a JPEG data URL for storage.
async function fileToCompressedDataUrl(file) {
  const asDataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
  if (!asDataUrl) return '';

  let srcWidth = 0;
  let srcHeight = 0;
  let bitmap = null;

  try {
    if (window.createImageBitmap) {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      srcWidth = bitmap.width;
      srcHeight = bitmap.height;
    }
  } catch (_err) {
    bitmap = null;
  }

  let img = null;
  if (!bitmap) {
    img = await new Promise((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = asDataUrl;
    });
    if (!img) return '';
    srcWidth = img.naturalWidth || 1;
    srcHeight = img.naturalHeight || 1;
  }

  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(srcWidth || 1, srcHeight || 1));
  const w = Math.max(1, Math.round((srcWidth || 1) * scale));
  const h = Math.max(1, Math.round((srcHeight || 1) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return asDataUrl;
  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
  } else {
    ctx.drawImage(img, 0, 0, w, h);
  }

  return canvas.toDataURL('image/jpeg', 0.78);
}

// Converts a batch of image files into compressed data URLs.
async function filesToDataUrls(files) {
  const list = Array.from(files || []);
  const images = list.filter((f) => f.type && f.type.startsWith('image/'));
  const urls = await Promise.all(images.map((f) => fileToCompressedDataUrl(f)));
  return urls.filter(Boolean);
}

// Appends newly picked images to the targeted todo item.
async function handlePickedImages(fileList) {
  if (pendingImageTodoIndex === null || !todos[pendingImageTodoIndex]) return;
  const urls = await filesToDataUrls(fileList);
  if (!urls.length) return;
  const target = todos[pendingImageTodoIndex];
  target.images = [...(target.images || []), ...urls];
  pendingImageTodoIndex = null;
  render();
}
