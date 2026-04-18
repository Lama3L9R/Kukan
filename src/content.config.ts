import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
	loader: glob({ base: './src/content/pages', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: () => z.object({
	    title: z.string().optional(),
	    date: z.coerce.date().optional(),
        attribute: z.coerce.string().array().optional(),
	}),
})

export const collections = { pages }
