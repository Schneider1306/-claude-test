"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deletePayment } from "@/server/actions/payments";

export function GlobalDeletePaymentButton({ paymentId, caseId }: { paymentId: number; caseId: number }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Удалить платёж?")) return;
        await deletePayment(paymentId, caseId);
        router.refresh();
      }}
    >
      Удалить
    </Button>
  );
}
