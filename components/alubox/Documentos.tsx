"use client";

import { useRouter } from "next/navigation";
import { useAlubox } from "./AluboxProvider";
import { fmtDate } from "@/lib/utils";

export function DocumentosView() {
  const { data } = useAlubox();
  const router = useRouter();
  const allDocs = data.obras.flatMap((o) => (o.documentos || []).map((d) => ({ ...d, obraCodigo: o.codigo, obraId: o.id })));

  return (
    <div>
      <h2 className="ax-h2">Documentos</h2>
      <div className="ax-card">
        <div className="ax-card-title">Todos os documentos das obras</div>
        <table className="ax-table">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Obra</th><th>Data</th><th></th></tr></thead>
          <tbody>
            {allDocs.map((d) => (
              <tr key={d.id}>
                <td data-label="Nome">{d.nome}</td><td data-label="Tipo">{d.tipo}</td>
                <td data-label="Obra" className="ax-link" onClick={() => router.push(`/obras/${d.obraId}`)}>{d.obraCodigo}</td>
                <td data-label="Data">{fmtDate(d.data)}</td>
                <td>{d.url && <a href={d.url} target="_blank" rel="noreferrer" className="ax-link-plain">abrir</a>}</td>
              </tr>
            ))}
            {allDocs.length === 0 && <tr><td colSpan={5} className="ax-empty-inline">Nenhum documento anexado em nenhuma obra ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
