"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { LevelBadge } from "@/components/brand/level-badge";
import { AiBadge } from "@/components/brand/ai-badge";

const STACKS = [
  { label: "Elige un stack", value: null },
  { label: "React", value: "react" },
  { label: "Node", value: "node" },
  { label: "Flutter y Dart", value: "flutter" },
] as const;

const BUTTON_VARIANTS = [
  "default",
  "brand",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

function ButtonsDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">lg</Button>
        <Button size="icon" aria-label="Agregar">
          <PlusIcon />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button>
          <PlusIcon data-icon="inline-start" />
          Con ícono
        </Button>
        <Button disabled>Deshabilitado</Button>
        <Button disabled>
          <Spinner data-icon="inline-start" />
          Cargando
        </Button>
      </div>
    </div>
  );
}

function BadgesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>default</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="outline">outline</Badge>
      <Badge variant="destructive">destructive</Badge>
      <LevelBadge nivel="requerido" />
      <LevelBadge nivel="recomendado" />
      <LevelBadge nivel="opcional" />
      <AiBadge />
    </div>
  );
}

function CardDemo() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Frontend con React</CardTitle>
        <CardDescription>18 cursos · 64 h de video</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Ruta oficial de DevTalles para quien ya sabe HTML y CSS.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="brand" size="sm">
          Empezar ruta
        </Button>
        <Button variant="ghost" size="sm">
          Ver detalle
        </Button>
      </CardFooter>
    </Card>
  );
}

function FormDemo() {
  return (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor="meta">Tu meta, en tus palabras</FieldLabel>
        <Input id="meta" placeholder="Quiero trabajar como frontend en 6 meses" />
        <FieldDescription>Este texto solo lo usa la Capa 2 (IA).</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="stack">Stack preferido</FieldLabel>
        <Select items={STACKS}>
          <SelectTrigger id="stack" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STACKS.map((stack) => (
                <SelectItem key={stack.label} value={stack.value}>
                  {stack.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Tu nivel hoy</FieldLabel>
        <ToggleGroup defaultValue={["bases"]} variant="outline" spacing={0} className="w-full">
          <ToggleGroupItem value="cero" className="flex-1">
            Empiezo de cero
          </ToggleGroupItem>
          <ToggleGroupItem value="bases" className="flex-1">
            Tengo bases
          </ToggleGroupItem>
          <ToggleGroupItem value="intermedio" className="flex-1">
            Intermedio
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
    </FieldGroup>
  );
}

function TabsDemo() {
  return (
    <Tabs defaultValue="lista" className="max-w-sm">
      <TabsList>
        <TabsTrigger value="lista">Lista</TabsTrigger>
        <TabsTrigger value="mapa">Mapa</TabsTrigger>
      </TabsList>
      <TabsContent value="lista">
        <p className="text-sm text-muted-foreground">Vista en lista de la ruta.</p>
      </TabsContent>
      <TabsContent value="mapa">
        <p className="text-sm text-muted-foreground">Vista en mapa (React Flow).</p>
      </TabsContent>
    </Tabs>
  );
}

function AccordionDemo() {
  return (
    <Accordion defaultValue={["curso-1"]} className="max-w-sm">
      <AccordionItem value="curso-1">
        <AccordionTrigger>React desde cero</AccordionTrigger>
        <AccordionContent>Requerido en la ruta oficial de Frontend.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="curso-2">
        <AccordionTrigger>TypeScript</AccordionTrigger>
        <AccordionContent>Recomendado por DevTalles dentro de la ruta.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ProgressAlertDemo() {
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <Progress value={62} />
      <Alert>
        <AlertTitle>OPENAI_API_KEY no configurada</AlertTitle>
        <AlertDescription>
          La app entrega esta misma ruta con razones por plantilla.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function AvatarTooltipDemo() {
  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarImage src="/astronauta.webp" alt="" />
        <AvatarFallback>DP</AvatarFallback>
      </Avatar>
      <Separator orientation="vertical" className="h-8" />
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" size="sm" />}>Con tooltip</TooltipTrigger>
        <TooltipContent>Racha de 7 días</TooltipContent>
      </Tooltip>
    </div>
  );
}

function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Quitar curso</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Quitar este curso de tu ruta?</DialogTitle>
          <DialogDescription>Puedes volver a agregarlo cuando quieras.</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive">
            <TrashIcon data-icon="inline-start" />
            Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonEmptyDemo() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" size="sm" onClick={() => setIsLoading((previous) => !previous)}>
        {isLoading ? "Mostrar contenido" : "Mostrar skeleton"}
      </Button>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlusIcon />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes rutas</EmptyTitle>
            <EmptyDescription>Empieza el cuestionario para generar la primera.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

/**
 * Única isla de cliente de la página: agrupa todas las demos interactivas
 * de componentes en un solo Client Component para no fragmentar el bundle
 * en muchos chunks pequeños.
 */
function ComponentGallery() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Button</h3>
        <ButtonsDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Badge</h3>
        <BadgesDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Card</h3>
        <CardDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">
          Field + Input + Select + ToggleGroup
        </h3>
        <FormDemo />
      </div>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div>
          <h3 className="mb-4 font-heading text-lg font-medium">Tabs</h3>
          <TabsDemo />
        </div>
        <div>
          <h3 className="mb-4 font-heading text-lg font-medium">Accordion</h3>
          <AccordionDemo />
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Progress + Alert</h3>
        <ProgressAlertDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Avatar + Separator + Tooltip</h3>
        <AvatarTooltipDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Dialog</h3>
        <DialogDemo />
      </div>
      <div>
        <h3 className="mb-4 font-heading text-lg font-medium">Skeleton + Empty</h3>
        <SkeletonEmptyDemo />
      </div>
    </div>
  );
}

export { ComponentGallery };
