export type Base64File = { name: string; type: string; data: string };

/** Lee un archivo como data URL (base64) para mandarlo dentro de un JSON. */
export function fileToBase64(file: File): Promise<Base64File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, data: reader.result as string });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
