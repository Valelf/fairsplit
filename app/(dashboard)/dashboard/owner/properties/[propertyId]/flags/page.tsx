import { redirect } from "next/navigation";

interface PageProps {
  params: { propertyId: string };
}

/** Bill flags were replaced by bill questions; old links land on the Questions inbox for this property. */
export default function PropertyFlagsPage({ params }: PageProps) {
  redirect(`/dashboard/owner/questions?property=${encodeURIComponent(params.propertyId)}`);
}
