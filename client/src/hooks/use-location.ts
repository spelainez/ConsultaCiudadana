import { useQuery } from "@tanstack/react-query";
import { fetchDepartments } from "@/api/location";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
