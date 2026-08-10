import type { Obra, Tarefa } from "@/types/domain";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (v: string | number | null | undefined) => {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};

export const isAtrasada = (obra: Obra) => {
  if (obra.status === "FINALIZADO") return false;
  if (!obra.dataPrevFim) return false;
  return obra.dataPrevFim < todayISO();
};

export const pctConclusao = (obra: Obra) => {
  const t = obra.tarefas || [];
  if (t.length === 0) return 0;
  const done = t.filter((x: Tarefa) => x.status === "Concluída").length;
  return Math.round((done / t.length) * 100);
};

export const digitsOnly = (v: string | null | undefined) => (v || "").replace(/\D/g, "");

export function csvDownload(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Comprime uma imagem (ex: foto tirada pela câmera) antes de subir pro
// Supabase Storage — mesma lógica do protótipo, só que agora o resultado
// vai para o Storage em vez de virar um data URL gigante salvo no banco.
export function compressImageFile(file: File, maxDim = 1600, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem."))), "image/jpeg", quality);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
