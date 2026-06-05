import { Suspense } from "react";
import Loading from "@/components/common/Loading";
import PropertiesClient from "./PropertiesClient";

export default function PropertyListingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PropertiesClient />
    </Suspense>
  );
}
