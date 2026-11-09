"use client";

// C16 · StatusLaporanPage (kelas boundary DPPL). Pemilik: Peran D.
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { MapView } from "@/client/components/shared/MapView";
import { StatusBadge } from "@/client/components/shared/StatusBadge";
import { gagal, type ActionResult } from "@/lib/action-result";
import { KATEGORI, STATUS_LABEL, STATUS_WARNA_PETA } from "@/lib/constants";
import { formatTanggal } from "@/lib/format";
import {
  ambilLaporanPublik, ambilRiwayatWarga, type ItemPeta, type ItemRiwayat,
} from "@/server/controllers/StatusController";
import type { Enums } from "@/types/database";

type ModeTampilan = "Riwayat" | "Peta";
type Props = {
  peran: Enums<"peran_user"> | null;
  riwayatAwal: ActionResult<ItemRiwayat[]> | null;
  petaAwal: ActionResult<ItemPeta[]> | null;
};

const STATUS_PUBLIK = ["diterima", "dikerjakan", "berhasil"] as const satisfies readonly Enums<"status_laporan">[];

export function StatusLaporanPage({ peran, riwayatAwal, petaAwal }: Props) {
  const [modeTampilan, setModeTampilan] = useState<ModeTampilan>(peran === "warga" ? "Riwayat" : "Peta");
  const [riwayat, setRiwayat] = useState(riwayatAwal);
  const [peta, setPeta] = useState(petaAwal);
  const [memuat, setMemuat] = useState(false);
  const permintaan = useRef(0);
  const tabRiwayat = useRef<HTMLButtonElement>(null);
  const tabPeta = useRef<HTMLButtonElement>(null);
  const id = useId();

  /** C16 pilihMenuRiwayat (Algo-031). */
  async function pilihMenuRiwayat() {
    setModeTampilan("Riwayat");
    const nomor = ++permintaan.current;
    if (peran !== "warga") {
      setMemuat(false);
      return;
    }

    setMemuat(true);
    try {
      const hasil = await ambilRiwayatWarga();
      if (nomor === permintaan.current) setRiwayat(hasil);
    } catch {
      if (nomor === permintaan.current) setRiwayat(gagal("Gagal memuat riwayat. Periksa koneksi lalu coba lagi."));
    } finally {
      if (nomor === permintaan.current) setMemuat(false);
    }
  }

  /** C16 pilihMenuPeta (Algo-032). */
  async function pilihMenuPeta() {
    setModeTampilan("Peta");
    const nomor = ++permintaan.current;
    setMemuat(true);
    try {
      const hasil = await ambilLaporanPublik();
      if (nomor === permintaan.current) setPeta(hasil);
    } catch {
      if (nomor === permintaan.current) setPeta(gagal("Gagal memuat peta. Periksa koneksi lalu coba lagi."));
    } finally {
      if (nomor === permintaan.current) setMemuat(false);
    }
  }

  function pindahTabDenganKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let tujuan: ModeTampilan;
    if (event.key === "Home") tujuan = "Riwayat";
    else if (event.key === "End") tujuan = "Peta";
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      tujuan = modeTampilan === "Riwayat" ? "Peta" : "Riwayat";
    } else return;

    event.preventDefault();
    if (tujuan === "Riwayat") {
      tabRiwayat.current?.focus();
      void pilihMenuRiwayat();
    } else {
      tabPeta.current?.focus();
      void pilihMenuPeta();
    }
  }

  const hasilAktif = modeTampilan === "Riwayat" ? riwayat : peta;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Laporan Saya</h1>
      <div role="tablist" aria-label="Tampilan laporan" className="flex border-b border-gray-200">
        {(["Riwayat", "Peta"] as const).map((mode) => (
          <button
            key={mode}
            ref={mode === "Riwayat" ? tabRiwayat : tabPeta}
            type="button"
            role="tab"
            id={`${id}-tab-${mode}`}
            aria-controls={`${id}-panel-${mode}`}
            aria-selected={modeTampilan === mode}
            tabIndex={modeTampilan === mode ? 0 : -1}
            onKeyDown={pindahTabDenganKeyboard}
            onClick={mode === "Riwayat" ? pilihMenuRiwayat : pilihMenuPeta}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              modeTampilan === mode ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {(["Riwayat", "Peta"] as const).map((mode) => (
        <section
          key={mode}
          id={`${id}-panel-${mode}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${mode}`}
          hidden={modeTampilan !== mode}
          aria-busy={modeTampilan === mode && memuat}
          tabIndex={0}
          className="space-y-4"
        >
          {modeTampilan === mode && (
            mode === "Riwayat" && peran !== "warga" ? (
              <p className="text-sm text-gray-600">
                {peran === null ? (
                  <>Silakan <Link href="/login?next=%2Fstatus" className="text-blue-700 underline">masuk</Link> untuk melihat riwayat laporan Anda.</>
                ) : "Riwayat laporan hanya tersedia untuk akun warga."}
              </p>
            ) : memuat ? (
              <p role="status" className="text-sm text-gray-600">Memuat {mode === "Riwayat" ? "riwayat laporan" : "peta laporan publik"}…</p>
            ) : hasilAktif && !hasilAktif.ok ? (
              <div role="alert" className="space-y-2 rounded-md bg-red-50 p-4 text-sm text-red-700">
                <p>{hasilAktif.error}</p>
                <button
                  type="button"
                  onClick={mode === "Riwayat" ? pilihMenuRiwayat : pilihMenuPeta}
                  className="font-medium underline"
                >
                  Coba lagi
                </button>
              </div>
            ) : mode === "Riwayat" ? (
              riwayat?.ok && riwayat.data.length > 0 ? (
                <ul className="space-y-3">
                  {riwayat.data.map((laporan) => (
                    <li key={laporan.id} className="space-y-2 rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{laporan.id_tiket}</span>
                        {" · "}<time dateTime={laporan.waktu_masuk}>{formatTanggal(laporan.waktu_masuk)}</time>
                      </p>
                      <p className="font-medium">{KATEGORI[laporan.kategori]}</p>
                      <StatusBadge status={laporan.status} tahap={laporan.tahap} />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-600">Belum ada laporan yang Anda kirim.</p>
            ) : (
              <>
                <h2 className="font-medium">Laporan publik di sekitar Anda</h2>
                {peta?.ok && peta.data.length === 0 && (
                  <p className="text-sm text-gray-600">Belum ada laporan publik untuk ditampilkan.</p>
                )}
                <MapView markers={peta?.ok ? peta.data.map((laporan) => ({ ...laporan, label: laporan.id_tiket })) : []} tinggi="400px" />
                <ul aria-label="Legenda status laporan" className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {STATUS_PUBLIK.map((status) => (
                    <li key={status} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_WARNA_PETA[status] }} />
                      {STATUS_LABEL[status]}
                    </li>
                  ))}
                </ul>
              </>
            )
          )}
        </section>
      ))}
    </main>
  );
}
