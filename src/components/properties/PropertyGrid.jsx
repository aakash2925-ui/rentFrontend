import PropertyCard from "./PropertyCard";
import EmptyState from "@/components/common/EmptyState";

export default function PropertyGrid({ properties }) {
  if (!properties?.length) {
    return <EmptyState title="No rental items found" message="Try another category, city, or rent range. New inventory appears here as soon as admin publishes it." actionHref="/properties" actionLabel="Reset search" />;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => <PropertyCard key={property._id} property={property} />)}
    </div>
  );
}
