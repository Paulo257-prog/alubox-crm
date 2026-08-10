import { ObraDetail } from "@/components/alubox/ObraDetail";

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  return <ObraDetail obraId={params.id} />;
}
