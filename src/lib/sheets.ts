import { getCollection, type CollectionEntry } from 'astro:content';

/** A page's place in the drawing set: the home page is sheet 1, write-ups follow. */
export interface Sheet {
  /** sheet number, or null for pages outside the set (the 404 page) */
  n: number | null;
  of: number;
  title: string;
}

export type Project = CollectionEntry<'projects'>;

/** Every project, in the order the home page lists them. */
export async function projects(): Promise<Project[]> {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

/** Projects with a write-up page, in sheet order. */
export async function writeups(): Promise<Project[]> {
  return (await projects())
    .filter((p) => p.data.writeup)
    .sort((a, b) => (a.data.writeup?.sheet ?? 0) - (b.data.writeup?.sheet ?? 0));
}

export async function sheetCount(): Promise<number> {
  return 1 + (await writeups()).length;
}
