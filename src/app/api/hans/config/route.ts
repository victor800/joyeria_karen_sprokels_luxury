// 📁 RUTA: src/app/api/hans/config/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Se guarda en <proyecto>/data/hans-config.json (la carpeta se crea sola).
const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'hans-config.json');

type Config = { oro18: number; oro24: number; actualizado: string };
const VACIO: Config = { oro18: 0, oro24: 0, actualizado: '' };

async function leer(): Promise<Config> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const d = JSON.parse(raw);
    return {
      oro18: Number(d.oro18) || 0,
      oro24: Number(d.oro24) || 0,
      actualizado: typeof d.actualizado === 'string' ? d.actualizado : '',
    };
  } catch {
    return VACIO;
  }
}

export async function GET() {
  return NextResponse.json(await leer(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  try {
    const b = await req.json();
    const oro18 = Math.round(Number(b.oro18) || 0);
    const oro24 = Math.round(Number(b.oro24) || 0);
    if (oro18 < 0 || oro24 < 0 || (!oro18 && !oro24)) {
      return NextResponse.json({ error: 'Precio de oro inválido' }, { status: 400 });
    }
    const cfg: Config = { oro18, oro24, actualizado: new Date().toISOString() };
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return NextResponse.json(cfg);
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 });
  }
}