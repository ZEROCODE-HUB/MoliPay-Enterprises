import { type BatchStatus } from "@/features/collections/collections.data";
import { Filter,Search } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { STATUS_LABEL,statuses } from "@/features/collections/collections-management.rules";

import type { CollectionsManagementPageVm } from "./use-collections-management-page";

export function CollectionFilters({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: Pick<
  CollectionsManagementPageVm,
  | "search"
  | "setSearch"
  | "filterStatus"
  | "setFilterStatus"
  | "dateFrom"
  | "setDateFrom"
  | "dateTo"
  | "setDateTo"
>) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por nombre, ID o periodo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as BatchStatus | "todos")}
          >
            <option value="todos">Todos los estados</option>
            {statuses.map((e) => (
              <option key={e} value={e}>
                {STATUS_LABEL[e]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Label>Desde</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36 text-xs"
          />
        </div>
      </div>
    </Card>
  );
}
