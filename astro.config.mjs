// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import expressiveCode, { createInlineSvgUrl } from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginLanguageBadge } from 'expressive-code-language-badge';
import transformMdElement from './src/markdown/transform';
import remarkTypstMath from './src/markdown/typst';
import remarkTypstMdx from './src/markdown/typst-mdx';
import remarkRawMdx from './src/markdown/raw-mdx';

export default defineConfig({
    site: 'https://blog.v2.lama.icu',
    integrations: [expressiveCode({
        styleOverrides: {
            frames: {
                copyIcon: createInlineSvgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M288 448l-224 0 0-224 48 0 0-64-48 0c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l224 0c35.3 0 64-28.7 64-64l0-48-64 0 0 48zm-64-96l224 0c35.3 0 64-28.7 64-64l0-224c0-35.3-28.7-64-64-64L224 0c-35.3 0-64 28.7-64 64l0 224c0 35.3 28.7 64 64 64z"/></svg>`)
            }
        },
        themes: ["houston"],
        plugins: [ pluginCollapsibleSections(), pluginLineNumbers(), pluginLanguageBadge() ]
    }), mdx({
        remarkPlugins: [remarkTypstMdx, remarkRawMdx],
    }), sitemap()],
    markdown: {
        smartypants: false, /* WTF is this??? */
        remarkRehype: {
            allowDangerousHtml: true, 
        },
        remarkPlugins: [ remarkTypstMath ],
        rehypePlugins: [ transformMdElement ]
    },

    vite: {
        plugins: [tailwindcss()],
    },
});
