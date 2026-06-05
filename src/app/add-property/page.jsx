"use client";

import AddPropertyForm from "@/components/forms/AddPropertyForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function AddPropertyPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AddPropertyForm />
      </div>
    </ProtectedRoute>
  );
}
