// 📁 RUTA: src/app/api/hans/config/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Se guarda en <proyecto>/data/hans-config.json (la carpeta se crea sola).
const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'hans-config.json');

type Config = { oro18: number; oro24: number; actualizado: string; piezas: unknown | null };
const VACIO: Config = { oro18: 0, oro24: 0, actualizado: '', piezas: null };

async function leer(): Promise<Config> {
  try {
    const d = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return {
      oro18: Number(d.oro18) || 0,
      oro24: Number(d.oro24) || 0,
      actualizado: typeof d.actualizado === 'string' ? d.actualizado : '',
      piezas: d.piezas && typeof d.piezas === 'object' ? d.piezas : null,
    };
  } catch {
    return VACIO;
  }
}

// Validación básica de la tabla de piezas (balines, inicial, dijes)
function piezasValidas(p: unknown): boolean {
  const x = p as { tipos?: unknown; pesos?: unknown; inicial?: unknown; dijes?: unknown };
  if (!x || typeof x !== 'object') return false;
  if (!Array.isArray(x.tipos) || !Array.isArray(x.dijes)) return false;
  if (x.tipos.length > 60 || x.dijes.length > 80) return false;
  if (!x.pesos || typeof x.pesos !== 'object' || Object.keys(x.pesos as object).length > 60) return false;
  return !!x.inicial && typeof x.inicial === 'object';
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
    if (b.piezas !== undefined && !piezasValidas(b.piezas)) {
      return NextResponse.json({ error: 'Tabla de piezas inválida' }, { status: 400 });
    }
    const prev = await leer();
    const cfg: Config = {
      oro18, oro24,
      actualizado: new Date().toISOString(),
      piezas: b.piezas !== undefined ? b.piezas : prev.piezas,
    };
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return NextResponse.json(cfg);
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la configuración' }, { status: 500 });
  }
}