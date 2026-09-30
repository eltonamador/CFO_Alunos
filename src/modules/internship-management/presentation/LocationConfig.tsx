import { saveInternshipLocation } from "./pointActions";
import { Button } from "@/components/ui/Button";
export function LocationConfig({
  sites,
  locations,
}: {
  sites: { id: string; name: string }[];
  locations: { site_id: string; latitude: number; longitude: number; radius_m: number }[];
}) {
  const field = "h-11 w-full rounded-md border border-input bg-background px-3";
  return (
    <details id="ponto" className="rounded-lg border p-4">
      <summary className="cursor-pointer font-semibold">
        Configurar locais e raio de conferência do ponto GPS
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        Configure somente os GBMs. Na praia, o cadete pode registrar o GPS no ponto móvel sem raio
        fixo. Nos GBMs, posições fora do raio ou com baixa precisão são sinalizadas para análise,
        sem desconto automático de horas.
      </p>
      <div className="space-y-4">
        {sites.map((site) => {
          const loc = locations.find((l) => l.site_id === site.id);
          return (
            <form
              key={site.id}
              action={saveInternshipLocation}
              className="grid gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-4"
            >
              <input type="hidden" name="siteId" value={site.id} />
              <p className="font-medium md:col-span-4">
                {site.name}
                {!loc ? " — coordenadas ainda não cadastradas" : ""}
              </p>
              <label className="text-sm">
                Latitude
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  required
                  defaultValue={loc?.latitude}
                  className={field}
                />
              </label>
              <label className="text-sm">
                Longitude
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  required
                  defaultValue={loc?.longitude}
                  className={field}
                />
              </label>
              <label className="text-sm">
                Raio (metros)
                <input
                  name="radius"
                  type="number"
                  min={50}
                  max={5000}
                  step={1}
                  required
                  defaultValue={loc?.radius_m ?? 200}
                  className={field}
                />
              </label>
              <Button type="submit" className="self-end">
                Salvar localização
              </Button>
            </form>
          );
        })}
      </div>
    </details>
  );
}
