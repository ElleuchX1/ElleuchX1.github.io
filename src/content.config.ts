import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const base = {
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
};

// Keep the original filenames (incl. case) as URL slugs so existing links don't break.
const keepName = ({ entry }: { entry: string }) => entry.replace(/\.[^.]+$/, '');

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts', generateId: keepName }),
  schema: z.object({ ...base, image: z.string().optional() }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes', generateId: keepName }),
  schema: z.object(base),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools', generateId: keepName }),
  schema: z.object({
    ...base,
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    language: z.string().optional(),
  }),
});

export const collections = { posts, notes, tools };
