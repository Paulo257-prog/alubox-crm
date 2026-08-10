import { ClienteDetail } from "@/components/alubox/Clientes";

export default function ClienteDetailPage({ params }: { params: { id: string } }) {
  return <ClienteDetail clienteId={params.id} />;
}
