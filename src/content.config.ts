import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { roleIds } from './data/site';
import { figureIds } from './components/figures/ids';

/**
 * One file per project in src/content/projects. The frontmatter drives the
 * card on the home page; the body, when there is one, is the write-up sheet
 * at /projects/<file name>/. The build fails if a file breaks this schema.
 */
const media = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('figure'),
    figure: z.enum(figureIds),
    caption: z.string(),
  }),
  z.object({
    kind: z.literal('video'),
    youtube: z.string().regex(/^[\w-]{11}$/, 'a YouTube video id'),
    title: z.string(),
    caption: z.string(),
    poster: z.object({
      src: z.string().startsWith('/assets/'),
      srcset: z.string().optional(),
      sizes: z.string().optional(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
]);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    when: z.string(),
    /** position on the home page */
    order: z.number().int(),
    /** featured spans both columns; row is a line under "More projects"; unlisted has only a sheet */
    placement: z.enum(['featured', 'card', 'row', 'unlisted']),
    /** put a featured project's drawing on the right instead of the left */
    mirror: z.boolean().default(false),
    roles: z.array(z.enum(roleIds)).min(1),
    /** paragraphs for the card on the home page */
    card: z.array(z.string()).min(1),
    stack: z.string().optional(),
    media: media.optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          /** a full URL, or a path on this site */
          href: z.union([z.url(), z.string().regex(/^\/[\w\-/#?=]*$/)]),
          /** shown as a button, for the one action a card is about */
          primary: z.boolean().default(false),
          icon: z.enum(['ohm']).optional(),
        }),
      )
      .default([]),
    writeup: z
      .object({
        /** sheet number among the write-ups; the home page is sheet 1 */
        sheet: z.number().int().min(2),
        description: z.string().max(220),
        facts: z.array(z.object({ label: z.string(), value: z.string() })),
        /** a live instrument shown full width above the text, as Figure 1 */
        instrument: z.enum(['planner']).optional(),
      })
      .optional(),
  }),
});

export const collections = { projects };
