import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading…</div>}>
      <RegisterClient />
    </Suspense>
  );
}
