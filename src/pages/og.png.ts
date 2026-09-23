import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { renderOg } from '../og';

export const GET: APIRoute = async () => {
  const svg = renderOg('Security researcher', 'elleu.ch');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
  });
};
