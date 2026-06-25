import { Suspense } from "react";
import Loading from "@/components/common/Loading";
import PropertiesClient from "@/app/properties/PropertiesClient";

export default function ItemListingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PropertiesClient />
    </Suspense>
  );
}
