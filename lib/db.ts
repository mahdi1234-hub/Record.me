import { get, set, del, keys, createStore } from "idb-keyval";

const videoStore = createStore("recordme-videos", "blobs");
const thumbStore = createStore("recordme-thumbs", "thumbs");

export async function saveVideoBlob(id: string, blob: Blob) {
  await set(id, blob, videoStore);
}
export async function loadVideoBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, videoStore);
}
export async function deleteVideoBlob(id: string) {
  await del(id, videoStore);
}
export async function listVideoIds(): Promise<string[]> {
  return (await keys(videoStore)) as string[];
}

export async function saveThumbnail(id: string, blob: Blob) {
  await set(id, blob, thumbStore);
}
export async function loadThumbnail(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, thumbStore);
}
export async function deleteThumbnail(id: string) {
  await del(id, thumbStore);
}
