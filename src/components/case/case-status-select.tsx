"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { updateCase } from "@/server/actions/cases";
import type { CaseRow } from "@/server/queries/cases";
import { CASE_STATUSES } from "@/db/schema";
import { CASE_STATUS_LABELS } from "@/domain/labels";

export function CaseStatusSelect({ caseRow }: { caseRow: CaseRow }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Select
      className="w-auto min-w-44"
      defaultValue={caseRow.status}
      disabled={pending}
      onChange={async (e) => {
        setPending(true);
        await updateCase(caseRow.id, {
          shortName: caseRow.shortName,
          clientCode: caseRow.clientCode,
          clientType: caseRow.clientType,
          caseType: caseRow.caseType,
          status: e.target.value as (typeof CASE_STATUSES)[number],
          responsible: caseRow.responsible,
          comment: caseRow.comment,
          inquiryDate: caseRow.inquiryDate,
          contractDate: caseRow.contractDate,
          startDate: caseRow.startDate,
          endDate: caseRow.endDate,
          nextActionDate: caseRow.nextActionDate,
          initialEstimateRubles: caseRow.initialEstimateKopecks != null ? caseRow.initialEstimateKopecks / 100 : null,
        });
        router.refresh();
        setPending(false);
      }}
    >
      {CASE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {CASE_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
