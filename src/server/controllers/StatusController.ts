"use server";
// C22 · StatusController (kelas controller DPPL). Pemilik: Peran D.
// Pola tiap action: verifikasiAkses() -> validasi input -> panggil entity -> return ActionResult<T>.

import { gagal, ok, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { pesanErrorDb } from "@/lib/error-db";
import { createClient } from "@/lib/supabase/server";
import { getDaftarPublik, getMilikSaya } from "@/server/entities/Laporan";
import type { Tables } from "@/types/database";

export type ItemRiwayat = Pick<Tables<"laporan">, "id" | "id_tiket" | "kategori" | "status" | "tahap" | "waktu_masuk">;

// Entity menyaring kolom wajib view publik yang nullable pada generated types.
export type ItemPeta = {
  [K in "id" | "id_tiket" | "latitude" | "longitude" | "status"]: NonNullable<Tables<"laporan_publik">[K]>;
};

async function verifikasiAkses() {
  return requireRole("warga");
}

/** C22 Algo-051: riwayat akun warga yang terverifikasi, terbaru terlebih dahulu. */
export async function ambilRiwayatWarga(): Promise<ActionResult<ItemRiwayat[]>> {
  try {
    const akses = await verifikasiAkses();
    if (!akses.ok) return akses;

    const supabase = await createClient();
    const { data, error } = await getMilikSaya(supabase, akses.data.id);
    if (error) return gagal(pesanErrorDb(error));

    return ok((data ?? []).map(({ id, id_tiket, kategori, status, tahap, waktu_masuk }) => ({
      id, id_tiket, kategori, status, tahap, waktu_masuk,
    })));
  } catch {
    return gagal("Gagal memuat riwayat laporan. Coba lagi beberapa saat lagi.");
  }
}

/** C22 Algo-052: peta anonim boleh diakses tanpa login, hanya melalui laporan_publik. */
export async function ambilLaporanPublik(): Promise<ActionResult<ItemPeta[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await getDaftarPublik(supabase);
    if (error) return gagal(pesanErrorDb(error));

    return ok((data ?? []).map(({ id, id_tiket, latitude, longitude, status }) => ({
      id, id_tiket, latitude, longitude, status,
    })));
  } catch {
    return gagal("Gagal memuat laporan publik. Coba lagi beberapa saat lagi.");
  }
}
