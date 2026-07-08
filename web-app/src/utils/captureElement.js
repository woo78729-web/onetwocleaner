const CAPTURE_BACKGROUND = '#ffffff';

function prepareElementForCapture(element) {
  element.classList.add('schedule-success-modal--capture');
  element.style.background = CAPTURE_BACKGROUND;
  element.style.border = '1px solid rgba(16, 42, 67, 0.14)';
  element.style.boxShadow = '0 12px 40px rgba(10, 37, 64, 0.12)';
  element.style.backdropFilter = 'none';
  element.style.webkitBackdropFilter = 'none';

  element.querySelectorAll('.schedule-success-modal__actions, .schedule-success-modal__hint').forEach((node) => {
    node.style.display = 'none';
  });

  element.querySelectorAll('*').forEach((node) => {
    node.style.backdropFilter = 'none';
    node.style.webkitBackdropFilter = 'none';

    if (node.classList?.contains('btn-primary')) {
      node.style.background = '#007bff';
      node.style.backgroundImage = 'none';
    }

    if (node.classList?.contains('btn-secondary')) {
      node.style.background = '#f8fbff';
      node.style.backgroundImage = 'none';
    }
  });
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadCanvas(canvas, filename) {
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (blob) {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    URL.revokeObjectURL(url);
    return true;
  }

  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 22) {
      triggerDownload(dataUrl, filename);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

export async function captureElementAsPng(element, { filename = 'screenshot.png', scale = 2 } = {}) {
  if (!element) {
    return false;
  }

  const sandbox = document.createElement('div');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.cssText = 'position:fixed;left:-100000px;top:0;z-index:-1;pointer-events:none;';

  const clone = element.cloneNode(true);
  prepareElementForCapture(clone);
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    const { default: html2canvas } = await import('html2canvas');
    const safeScale = Math.min(scale, window.devicePixelRatio > 1 ? 2 : 1.5);
    const canvas = await html2canvas(clone, {
      backgroundColor: CAPTURE_BACKGROUND,
      scale: safeScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    return downloadCanvas(canvas, filename);
  } finally {
    sandbox.remove();
  }
}
