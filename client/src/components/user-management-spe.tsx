import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const createPlanificadorSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type CreatePlanificadorFormData = z.infer<typeof createPlanificadorSchema>;

export function UserManagementSPE() {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePlanificadorFormData>({
    resolver: zodResolver(createPlanificadorSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const createPlanificadorMutation = useMutation({
    mutationFn: async (data: CreatePlanificadorFormData) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        role: "planificador"
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Planificador creado",
        description: "El usuario planificador ha sido creado exitosamente.",
      });
      form.reset();
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el planificador",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePlanificadorFormData) => {
    createPlanificadorMutation.mutate(data);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="bg-white">
        <CardTitle className="mb-0">
          <Users className="w-5 h-5 me-2" />
          Gestión de Planificadores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {!isCreating ? (
          <div className="text-center py-4">
            <p className="text-muted mb-3">Crear nuevos usuarios planificadores</p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="btn-primary"
              data-testid="button-create-planificador"
            >
              <Plus className="w-4 h-4 me-2" />
              Crear Planificador
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ingrese nombre de usuario"
                        data-testid="input-username"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Ingrese contraseña"
                        data-testid="input-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="d-flex gap-2">
                <Button
                  type="submit"
                  disabled={createPlanificadorMutation.isPending}
                  className="btn-primary"
                  data-testid="button-submit-planificador"
                >
                  {createPlanificadorMutation.isPending ? "Creando..." : "Crear Planificador"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}