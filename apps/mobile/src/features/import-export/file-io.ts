import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const XLSX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',');
  return comma === -1 ? value : value.slice(comma + 1);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result)));
    reader.readAsDataURL(blob);
  });
}

/**
 * Reads a picked document's bytes as base64, whichever platform picked it.
 * Goes through `fetch` + `Blob`/`FileReader` (RN's own networking bridge)
 * rather than `expo-file-system.readAsStringAsync` — the latter fails with
 * a "Location ... isn't readable" `IOException` in Expo Go on Android when
 * reading a file `expo-document-picker` just copied into the cache
 * directory (a long-standing Expo Go sandboxing quirk); `fetch` reads the
 * same `file://` URI through a different bridge that isn't affected.
 */
export async function readPickedFileAsBase64(asset: DocumentPickerAsset): Promise<string> {
  if (asset.base64) return stripDataUrlPrefix(asset.base64);
  if (asset.uri.startsWith('data:')) return stripDataUrlPrefix(asset.uri);

  const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
  return blobToBase64(blob);
}

/** Writes an .xlsx file's base64 bytes to disk and hands it to the OS share
 * sheet (native) or triggers a browser download (web) — whichever the
 * platform actually supports; `expo-sharing` doesn't work on web at all. */
export async function saveAndShareXlsx(base64: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: XLSX_MIME_TYPES[0] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: XLSX_MIME_TYPES[0], dialogTitle: filename });
  }
}
