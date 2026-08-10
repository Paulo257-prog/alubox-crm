import { PrestadorDetail } from "@/components/alubox/Prestadores";

export default function PrestadorDetailPage({ params }: { params: { id: string } }) {
  return <PrestadorDetail prestadorId={params.id} />;
}
