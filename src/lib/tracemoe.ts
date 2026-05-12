
export async function traceMoeIdentify(base64Data: string) {
  // trace.moe likes image/jpeg or image/png
  // It doesn't accept very large files, usually image is enough
  try {
    const response = await fetch('https://api.trace.moe/search?cutBorders', {
      method: 'POST',
      body: base64ToBlob(base64Data, 'image/jpeg'),
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
    
    if (!response.ok) throw new Error('Trace.moe error');
    return response.json();
  } catch (error) {
    console.error('Trace.moe Error:', error);
    return null;
  }
}

function base64ToBlob(base64: string, type: string) {
  const binStr = atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type });
}
