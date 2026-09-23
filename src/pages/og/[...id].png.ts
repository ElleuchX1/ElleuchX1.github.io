import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import { renderOg } from '../../og';

export const getStaticPaths: GetStaticPaths = async () => {
  const out: { params: { id: string }; props: { title: string; kind: string } }[] = [];
  for (const [name, kind] of [['posts', 'posts'], ['notes', 'notes'], ['tools', 'tools']] as const) {
    const items = await getCollection(name, ({ data }) => !data.draft);
    for (const it of items) out.push({ params: { id: it.id }, props: { title: it.data.title, kind } });
  }
  return out;
};

export const GET: APIRoute = async ({ props }) => {
  const { title, kind } = props as { title: string; kind: string };
  const svg = renderOg(title, kind);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
  });
};
