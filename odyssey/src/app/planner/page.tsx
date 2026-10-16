"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const PlannerContent = dynamic(
  () =>
    import("@/components/planner/planner-content").then(
      (mod) => mod.PlannerContent
    ),
  { ssr: false }
);

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <PlannerContent />
    </Suspense>
  );
}
