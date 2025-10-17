import { useDepartments } from "@/hooks/use-location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: number;                       
  onChange: (id: number) => void;       
  placeholder?: string;
  disabled?: boolean;
};

export default function DepartmentSelect({
  value,
  onChange,
  placeholder = "Seleccione su departamento...",
  disabled,
}: Props) {
  const { data, isLoading, isError } = useDepartments();

  const isDisabled = disabled || isLoading || isError;

  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={
            isLoading ? "Cargando..." : isError ? "Error al cargar" : placeholder
          }
        />
      </SelectTrigger>
      <SelectContent>
        {data?.map((d) => (
          <SelectItem key={d.id} value={String(d.id)}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}