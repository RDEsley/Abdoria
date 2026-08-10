const VILLAGE_IMAGES = [
  '/assets/background-afk-banner.png',
  '/assets/loja-da-vila.png',
  '/assets/museu-da-vila-bestiario.png',
  '/assets/skill-tree-ancient.png',
];

let villageImagesLoaded = false;
let villageImagesPromise: Promise<void> | null = null;

export function preloadAfkImage(src: string): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
    if (image.complete) resolve();
  });
}

export function areVillageImagesLoaded(): boolean {
  return villageImagesLoaded;
}

export function preloadVillageImages(): Promise<void> {
  if (villageImagesLoaded || typeof Image === 'undefined') return Promise.resolve();
  if (villageImagesPromise) return villageImagesPromise;

  villageImagesPromise = Promise.all(VILLAGE_IMAGES.map(preloadAfkImage)).then(() => {
    villageImagesLoaded = true;
  });

  return villageImagesPromise;
}
